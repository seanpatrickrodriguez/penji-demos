import { describeCondition, FieldLabels } from '@penji-demos/compliance-engine';
import { resolveForm, resolvePermissionLabel } from '@penji-demos/record-engine';
import { FieldDefinition, PlatformConfiguration } from '@penji-demos/types';

// The configuration bundle read back as a person reads it: who may do what,
// how an entry moves, and what each entity keeps.

export interface AccessCell {
  readonly role: string;
  readonly grant: string;
}

export interface AccessRow {
  readonly permission: string;
  readonly cells: readonly AccessCell[];
}

export interface AccessMatrix {
  readonly roles: readonly { readonly id: string; readonly label: string; readonly description: string }[];
  readonly rows: readonly AccessRow[];
  // Who holds which roles, from the role rules.
  readonly holders: readonly { readonly id: string; readonly who: string; readonly roles: string }[];
}

export function resolveAccessMatrix(configuration: PlatformConfiguration, labels: FieldLabels, fields: readonly FieldDefinition[]): AccessMatrix {
  const { roles, permissions } = configuration.accessPolicy;
  const roleLabel = (roleId: string) => roles.find((role) => role.id === roleId)?.label ?? roleId;
  return {
    roles: roles.map((role) => ({ id: role.id, label: role.label, description: role.description })),
    holders: configuration.accessPolicy.roleRules.map((rule) => ({ id: rule.id, who: rule.label, roles: rule.roleIds.map(roleLabel).join(', ') })),
    rows: permissions.map((permission) => ({
      permission: permission.label,
      cells: roles.map((role) => {
        const grants = role.grants.filter((grant) => grant.permission === permission.id);
        const grant = grants.length === 0 ? '—' : grants.some((candidate) => candidate.when === null) ? 'Yes' : grants.map((candidate) => (candidate.when ? `When ${describeCondition(candidate.when, labels, fields)}` : 'Yes')).join('; or ');
        return { role: role.label, grant };
      }),
    })),
  };
}

export interface WorkflowView {
  readonly title: string;
  readonly initial: string;
  readonly states: readonly { readonly label: string; readonly description: string; readonly closed: boolean }[];
  readonly steps: readonly { readonly label: string; readonly from: string; readonly to: string; readonly needs: string; readonly guard: string; readonly note: boolean }[];
}

export function resolveWorkflowViews(configuration: PlatformConfiguration, labels: FieldLabels, fields: readonly FieldDefinition[]): readonly WorkflowView[] {
  return configuration.workflows.map((workflow) => {
    const stateLabel = (id: string) => workflow.states.find((state) => state.id === id)?.label ?? id;
    return {
      title: workflow.title,
      initial: stateLabel(workflow.initial),
      states: workflow.states.map((state) => ({ label: state.label, description: state.description, closed: state.closed })),
      steps: workflow.transitions.map((transition) => ({
        label: transition.label,
        from: transition.from.map(stateLabel).join(', '),
        to: stateLabel(transition.to),
        needs: resolvePermissionLabel(configuration, transition.permission),
        guard: transition.guard ? `Only when ${describeCondition(transition.guard.condition, labels, fields)}.  Otherwise: “${transition.guard.blockedReason}”` : '—',
        note: transition.needsNote,
      })),
    };
  });
}

export interface EntityView {
  readonly label: string;
  readonly form: string;
  readonly edit: string;
  readonly fields: readonly string[];
  readonly streams: readonly { readonly label: string; readonly form: string; readonly workflow: string; readonly add: string; readonly remove: string }[];
  readonly facts: readonly string[];
  readonly standards: readonly string[];
}

export function resolveEntityViews(configuration: PlatformConfiguration): readonly EntityView[] {
  const formTitle = (id: string) => configuration.forms.find((form) => form.id === id)?.title ?? id;
  return configuration.entities.map((entity) => ({
    label: entity.pluralLabel,
    form: formTitle(entity.formId),
    edit: resolvePermissionLabel(configuration, entity.editPermission),
    fields: resolveForm(configuration, entity.formId)?.fields.map((field) => field.label) ?? [],
    streams: entity.streams.map((stream) => ({
      label: stream.label,
      form: formTitle(stream.formId),
      workflow: configuration.workflows.find((workflow) => workflow.id === stream.workflowId)?.title ?? 'None',
      add: resolvePermissionLabel(configuration, stream.addPermission),
      remove: resolvePermissionLabel(configuration, stream.removePermission),
    })),
    facts: [...entity.facts, ...entity.streams.flatMap((stream) => stream.facts)].map((fact) => fact.label),
    standards: configuration.standards.filter((standard) => entity.standardIds.includes(standard.id)).map((standard) => standard.title),
  }));
}
