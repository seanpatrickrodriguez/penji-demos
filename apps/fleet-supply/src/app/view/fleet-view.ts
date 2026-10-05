import { describeAnswer, resolveVisibleFields } from '@penji-demos/form-engine';
import { TransitionOption } from '@penji-demos/workflow-engine';
import {
  PermissionOption,
  resolveActorRoles,
  resolveRuleRoles,
  resolveEntityDefinition,
  resolveEntryAnswers,
  resolveEntryOptions,
  resolveForm,
  resolvePermissionOption,
  resolveRecordAnswers,
  resolveStreamEntries,
  resolveWorkflow,
} from '@penji-demos/record-engine';
import { isGuidanceOpen } from '@penji-demos/compliance-engine';
import { ACCESS_SCOPE_KIND, VALIDATION_SEVERITY } from '@penji-demos/constants';
import {
  ActorId,
  ActorRecord,
  Answers,
  EntityId,
  EntityRecord,
  EntryId,
  FieldDefinition,
  FormDefinition,
  GuidanceItem,
  PlatformConfiguration,
  AccessScope,
  PlatformData,
  StreamDefinition,
  StreamEntry,
} from '@penji-demos/types';
import { isPlainDate, toPlainDate } from '@penji-demos/time';
import { formatDate } from '@penji-demos/ui';

// What the page shows, worked out from the configuration and the records.
// Nothing here knows what a vessel or a want list is: an entity is named by
// its form's first field, an entry is described by its form, and every action
// is offered or refused by the record engine.

export interface LabeledValue {
  readonly label: string;
  readonly value: string;
}

// An answer as its form presents it, with a date written out.
const describeField = (field: FieldDefinition, value: Answers[string] | undefined): string =>
  field.kind === 'date' && typeof value === 'string' && isPlainDate(value) ? formatDate(toPlainDate(value)) : describeAnswer(field, value);

// A record's answered fields, in its form's order, as a person reads them.
export function describeValues(form: FormDefinition | null, values: Answers): readonly LabeledValue[] {
  if (!form) return [];
  return resolveVisibleFields(form, values)
    .filter((field) => values[field.key] !== null && values[field.key] !== undefined && values[field.key] !== '')
    .map((field) => ({ label: field.label, value: describeField(field, values[field.key]) }));
}

const firstValue = (form: FormDefinition | null, values: Answers): string => {
  const field = form?.fields[0];
  return field ? describeAnswer(field, values[field.key]) : '';
};

export const resolveEntityName = (configuration: PlatformConfiguration, entity: EntityRecord): string => {
  const definition = resolveEntityDefinition(configuration, entity.kind);
  return definition ? firstValue(resolveForm(configuration, definition.formId), entity.values) : entity.entityId;
};

// Takes a plain ID too: a workflow step records who took it as the workflow engine saw them.
export const resolveActorName = (data: PlatformData, actorId: string): string => data.actors.find((actor) => actor.actorId === actorId)?.name ?? 'Someone no longer on record';

// What an actor's own record says about them ("Captain").
export const resolveActorTitle = (configuration: PlatformConfiguration, actor: ActorRecord): string => firstValue(resolveForm(configuration, configuration.actorFormId), actor.values);

const roleLabel = (configuration: PlatformConfiguration, roleId: string): string => configuration.accessPolicy.roles.find((role) => role.id === roleId)?.label ?? roleId;

const scopeName = (configuration: PlatformConfiguration, data: PlatformData, scope: AccessScope): string => {
  if (scope.kind === ACCESS_SCOPE_KIND.TENANT) return data.tenants.find((tenant) => tenant.tenantId === scope.tenantId)?.name ?? 'an unknown company';
  const entity = data.entities.find((candidate) => candidate.entityId === scope.entityId);
  return entity ? resolveEntityName(configuration, entity) : 'an unknown record';
};

export interface AssignmentView {
  readonly over: string;
  readonly active: boolean;
}

export interface ViewerView {
  readonly name: string;
  readonly title: string;
  readonly company: string;
  // The roles their record gives them, named, and where those roles apply.
  readonly roles: string;
  readonly assignments: readonly AssignmentView[];
}

export function resolveViewer(configuration: PlatformConfiguration, data: PlatformData, actor: ActorRecord): ViewerView {
  return {
    name: actor.name,
    title: resolveActorTitle(configuration, actor),
    company: data.tenants.find((tenant) => tenant.tenantId === actor.tenantId)?.name ?? '',
    roles: resolveRuleRoles(configuration.accessPolicy, actor)
      .map((roleId) => roleLabel(configuration, roleId))
      .join(', '),
    assignments: data.assignments
      .filter((assignment) => assignment.actorId === actor.actorId)
      .map((assignment) => ({ over: scopeName(configuration, data, assignment.scope), active: assignment.active })),
  };
}

export interface ViewerOption {
  readonly actorId: ActorId;
  readonly label: string;
}

export interface ViewerGroup {
  readonly label: string;
  readonly options: readonly ViewerOption[];
}

// Everyone on record, grouped by where their first assignment places them.
export function resolveViewerGroups(configuration: PlatformConfiguration, data: PlatformData, inactiveLabel: string): readonly ViewerGroup[] {
  const groups = new Map<string, ViewerOption[]>();
  for (const actor of data.actors) {
    const assignments = data.assignments.filter((assignment) => assignment.actorId === actor.actorId);
    const first = assignments[0];
    const group = first ? scopeName(configuration, data, first.scope) : 'Unassigned';
    const active = assignments.some((assignment) => assignment.active);
    const label = `${actor.name}, ${resolveActorTitle(configuration, actor)}${active ? '' : ` (${inactiveLabel})`}`;
    groups.set(group, [...(groups.get(group) ?? []), { actorId: actor.actorId, label }]);
  }
  return [...groups.entries()].map(([label, options]) => ({ label, options }));
}

// The roles a person holds over one entity, named.
export const resolveRolesHere = (configuration: PlatformConfiguration, data: PlatformData, actorId: ActorId, entity: EntityRecord): readonly string[] =>
  resolveActorRoles(configuration.accessPolicy, data, actorId, entity).map((roleId) => roleLabel(configuration, roleId));

const isBlocking = (item: GuidanceItem) => isGuidanceOpen(item) && item.requiresAction && item.rule.severity === VALIDATION_SEVERITY.ERROR;

export interface EntityRow {
  readonly entityId: EntityId;
  readonly name: string;
  readonly summary: string;
  readonly openEntries: number;
  readonly waitingOnViewer: number;
  readonly findings: number;
  readonly blocking: number;
  readonly rolesHere: string;
}

const isOpenEntry = (configuration: PlatformConfiguration, entry: StreamEntry, stream: StreamDefinition): boolean => {
  const workflow = resolveWorkflow(configuration, stream.workflowId);
  return workflow ? !(workflow.states.find((state) => state.id === entry.status)?.closed ?? false) : true;
};

export function resolveEntityRows(
  configuration: PlatformConfiguration,
  data: PlatformData,
  viewerId: ActorId,
  guidance: ReadonlyMap<EntityId, readonly GuidanceItem[]>,
  summarize: (values: Answers) => string,
): readonly EntityRow[] {
  return data.entities.map((entity) => {
    const definition = resolveEntityDefinition(configuration, entity.kind);
    const streams = definition?.streams ?? [];
    const open = streams.flatMap((stream) => resolveStreamEntries(data, entity, stream.id).filter((entry) => isOpenEntry(configuration, entry, stream)));
    const items = guidance.get(entity.entityId) ?? [];
    return {
      entityId: entity.entityId,
      name: resolveEntityName(configuration, entity),
      summary: summarize(resolveRecordAnswers(configuration, entity)),
      openEntries: open.length,
      waitingOnViewer: open.filter((entry) => resolveEntryOptions(configuration, data, viewerId, entry).some((option) => option.available)).length,
      findings: items.filter(isGuidanceOpen).length,
      blocking: items.filter(isBlocking).length,
      rolesHere: resolveRolesHere(configuration, data, viewerId, entity).join(', '),
    };
  });
}

export interface StepView {
  readonly id: string;
  readonly label: string;
  readonly needsNote: boolean;
  readonly primary: boolean;
}

export interface BlockedStepView {
  readonly label: string;
  readonly reason: string;
  // Held by the workflow's guard, though this person holds the permission.
  readonly held: boolean;
}

export interface HistoryView {
  readonly label: string;
  readonly by: string;
  readonly date: string;
  readonly note: string;
}

export interface EntryView {
  readonly entryId: EntryId;
  readonly title: string;
  readonly details: readonly LabeledValue[];
  readonly status: string;
  readonly statusDescription: string;
  readonly closed: boolean;
  readonly addedBy: string;
  readonly added: string;
  readonly steps: readonly StepView[];
  readonly blocked: readonly BlockedStepView[];
  readonly edit: PermissionOption;
  readonly remove: PermissionOption;
  readonly history: readonly HistoryView[];
  readonly findings: number;
}

export interface StreamView {
  readonly stream: StreamDefinition;
  // Whether this person holds any role over the entity at all.
  readonly hasRole: boolean;
  readonly form: FormDefinition | null;
  readonly add: PermissionOption;
  readonly entries: readonly EntryView[];
}

const toSteps = (options: readonly TransitionOption[]): readonly StepView[] =>
  options.filter((option) => option.available).map((option, index) => ({ id: option.transition.id, label: option.transition.label, needsNote: option.transition.needsNote, primary: index === 0 }));

const toBlocked = (options: readonly TransitionOption[]): readonly BlockedStepView[] =>
  options
    .filter((option) => !option.available)
    .map((option) => ({ label: option.transition.label, reason: option.reason ?? 'Not available.', held: option.transition.guard !== null && option.reason === option.transition.guard.blockedReason }));

// Every stream the entity's definition declares, newest entries first, each with what this person may do.
export function resolveStreamViews(configuration: PlatformConfiguration, data: PlatformData, viewerId: ActorId, entity: EntityRecord, guidance: readonly GuidanceItem[]): readonly StreamView[] {
  const definition = resolveEntityDefinition(configuration, entity.kind);
  return (definition?.streams ?? []).map((stream) => {
    const form = resolveForm(configuration, stream.formId);
    const workflow = resolveWorkflow(configuration, stream.workflowId);
    const stateOf = (id: string | null) => workflow?.states.find((state) => state.id === id);
    const entries = [...resolveStreamEntries(data, entity, stream.id)].reverse().map((entry): EntryView => {
      const options = resolveEntryOptions(configuration, data, viewerId, entry);
      const [first, ...rest] = describeValues(form, resolveEntryAnswers(configuration, entry));
      return {
        entryId: entry.entryId,
        title: first?.value ?? stream.entryLabel,
        details: rest,
        status: stateOf(entry.status)?.label ?? '',
        statusDescription: stateOf(entry.status)?.description ?? '',
        closed: stateOf(entry.status)?.closed ?? false,
        addedBy: resolveActorName(data, entry.authorId),
        added: formatDate(entry.date),
        steps: toSteps(options),
        blocked: toBlocked(options),
        edit: resolvePermissionOption(configuration, data, viewerId, stream.editPermission, entity, entry),
        remove: resolvePermissionOption(configuration, data, viewerId, stream.removePermission, entity, entry),
        history: entry.history.map((step) => ({
          label: workflow?.transitions.find((transition) => transition.id === step.transitionId)?.label ?? step.transitionId,
          by: resolveActorName(data, step.actorId),
          date: formatDate(step.date),
          note: step.note,
        })),
        findings: guidance.filter((item) => item.finding.eventId === entry.entryId && isGuidanceOpen(item)).length,
      };
    });
    return { stream, hasRole: resolveActorRoles(configuration.accessPolicy, data, viewerId, entity).length > 0, form, add: resolvePermissionOption(configuration, data, viewerId, stream.addPermission, entity), entries };
  });
}

// Names the entry a finding is about in its own terms ("Item: Radar magnetron").
export function resolveEventName(configuration: PlatformConfiguration, data: PlatformData, eventId: string | null): string | null {
  const entry = data.entries.find((candidate) => candidate.entryId === eventId);
  if (!entry) return null;
  const entity = data.entities.find((candidate) => candidate.entityId === entry.entityId);
  const stream = entity ? resolveEntityDefinition(configuration, entity.kind)?.streams.find((candidate) => candidate.id === entry.streamId) : undefined;
  if (!stream) return null;
  return `${stream.entryLabel}: ${firstValue(resolveForm(configuration, stream.formId), entry.values)}`;
}
