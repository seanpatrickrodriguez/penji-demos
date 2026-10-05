import { PLATFORM_FACT } from '@penji-demos/constants';
import { TransitionOption, isPermitted, resolveTransitionOptions } from '@penji-demos/workflow-engine';
import { ActorId, Answers, EntityRecord, PlatformConfiguration, PlatformData, StreamEntry } from '@penji-demos/types';
import { resolvePermissionLabel, resolveStreamDefinition, resolveWorkflow } from './resolve-configuration';
import { resolveEntryAnswers, resolveRecordAnswers } from './resolve-subject';
import { resolveActorRoles } from './resolve-scope';

// What a person may do with a record.  Their roles come from the assignments
// that cover the record; a grant's condition reads the record, the entry and
// who is acting, together.

export interface ActorContext {
  readonly roleIds: readonly string[];
  readonly context: Answers;
}

export function resolveActorContext(configuration: PlatformConfiguration, data: PlatformData, actorId: ActorId, entity: EntityRecord, entry: StreamEntry | null): ActorContext {
  return {
    roleIds: resolveActorRoles(configuration.accessPolicy, data, actorId, entity),
    context: { ...resolveRecordAnswers(configuration, entity), ...(entry ? resolveEntryAnswers(configuration, entry) : {}), [PLATFORM_FACT.ACTOR_ID]: actorId },
  };
}

export function isPermittedOnRecord(configuration: PlatformConfiguration, data: PlatformData, actorId: ActorId, permission: string, entity: EntityRecord, entry: StreamEntry | null = null): boolean {
  const { roleIds, context } = resolveActorContext(configuration, data, actorId, entity, entry);
  return isPermitted(configuration.accessPolicy, roleIds, permission, context);
}

// Why a person cannot do something, in the access policy's words.
export const resolveMissingPermission = (configuration: PlatformConfiguration, permission: string): string =>
  `Needs permission to ${resolvePermissionLabel(configuration, permission).toLowerCase()}.`;

// One action outside the workflow (add, edit, remove, edit a record), available to this person or not, with the reason.
export interface PermissionOption {
  readonly permission: string;
  readonly available: boolean;
  readonly reason: string | null;
}

export function resolvePermissionOption(configuration: PlatformConfiguration, data: PlatformData, actorId: ActorId, permission: string, entity: EntityRecord, entry: StreamEntry | null = null): PermissionOption {
  return isPermittedOnRecord(configuration, data, actorId, permission, entity, entry)
    ? { permission, available: true, reason: null }
    : { permission, available: false, reason: resolveMissingPermission(configuration, permission) };
}

// Every workflow step out of an entry's current state, each available to this person or not, with the reason.
export function resolveEntryOptions(configuration: PlatformConfiguration, data: PlatformData, actorId: ActorId, entry: StreamEntry): readonly TransitionOption[] {
  const stream = resolveStreamDefinition(configuration, entry.streamId);
  const workflow = stream ? resolveWorkflow(configuration, stream.workflowId) : null;
  const entity = data.entities.find((candidate) => candidate.entityId === entry.entityId);
  if (!workflow || !entity || entry.status === null) return [];
  const { roleIds, context } = resolveActorContext(configuration, data, actorId, entity, entry);
  return resolveTransitionOptions(workflow, configuration.accessPolicy, entry.status, roleIds, context);
}
