import { applyTransition } from '@penji-demos/workflow-engine';
import { ActorId, Answers, EntityId, EntryId, PlainDate, PlatformConfiguration, PlatformData, StreamEntry } from '@penji-demos/types';
import { readDate } from './read-values';
import { resolveStreamDefinition, resolveWorkflow } from './resolve-configuration';
import { isPermittedOnRecord, resolveActorContext, resolveMissingPermission } from './resolve-access';

// Every change to the records goes through these functions, and each one
// checks the person's permission first.  A change returns the new records,
// or the problems that stopped it.

export type RecordChange = { readonly ok: true; readonly data: PlatformData } | { readonly ok: false; readonly problems: readonly string[] };

const refuse = (problem: string): RecordChange => ({ ok: false, problems: [problem] });
const needs = (configuration: PlatformConfiguration, permission: string) => refuse(resolveMissingPermission(configuration, permission));

export interface AddEntryRequest {
  readonly actorId: ActorId;
  readonly entityId: EntityId;
  readonly streamId: string;
  readonly entryId: EntryId;
  readonly values: Answers;
  // The entry's date when its stream has no date field: the day it is added.
  readonly date: PlainDate;
}

export function addEntry(configuration: PlatformConfiguration, data: PlatformData, request: AddEntryRequest): RecordChange {
  const stream = resolveStreamDefinition(configuration, request.streamId);
  const entity = data.entities.find((candidate) => candidate.entityId === request.entityId);
  if (!stream || !entity) return refuse('That record does not exist.');
  if (!isPermittedOnRecord(configuration, data, request.actorId, stream.addPermission, entity)) return needs(configuration, stream.addPermission);
  const date = stream.dateField === null ? request.date : readDate(request.values, stream.dateField);
  if (!date) return refuse('The entry needs a date.');
  const entry: StreamEntry = {
    entryId: request.entryId,
    streamId: stream.id,
    entityId: entity.entityId,
    date,
    authorId: request.actorId,
    values: request.values,
    status: resolveWorkflow(configuration, stream.workflowId)?.initial ?? null,
    history: [],
  };
  return { ok: true, data: { ...data, entries: [...data.entries, entry] } };
}

const findEntry = (data: PlatformData, entryId: EntryId) => {
  const entry = data.entries.find((candidate) => candidate.entryId === entryId);
  const entity = entry ? data.entities.find((candidate) => candidate.entityId === entry.entityId) : undefined;
  return entry && entity ? { entry, entity } : null;
};

const replaceEntry = (data: PlatformData, entry: StreamEntry): PlatformData => ({
  ...data,
  entries: data.entries.map((candidate) => (candidate.entryId === entry.entryId ? entry : candidate)),
});

export function updateEntry(configuration: PlatformConfiguration, data: PlatformData, request: { readonly actorId: ActorId; readonly entryId: EntryId; readonly values: Answers }): RecordChange {
  const found = findEntry(data, request.entryId);
  const stream = found ? resolveStreamDefinition(configuration, found.entry.streamId) : null;
  if (!found || !stream) return refuse('That entry does not exist.');
  if (!isPermittedOnRecord(configuration, data, request.actorId, stream.editPermission, found.entity, found.entry)) return needs(configuration, stream.editPermission);
  const date = stream.dateField === null ? found.entry.date : readDate(request.values, stream.dateField);
  if (!date) return refuse('The entry needs a date.');
  return { ok: true, data: replaceEntry(data, { ...found.entry, values: request.values, date }) };
}

export function removeEntry(configuration: PlatformConfiguration, data: PlatformData, request: { readonly actorId: ActorId; readonly entryId: EntryId }): RecordChange {
  const found = findEntry(data, request.entryId);
  const stream = found ? resolveStreamDefinition(configuration, found.entry.streamId) : null;
  if (!found || !stream) return refuse('That entry does not exist.');
  if (!isPermittedOnRecord(configuration, data, request.actorId, stream.removePermission, found.entity, found.entry)) return needs(configuration, stream.removePermission);
  return { ok: true, data: { ...data, entries: data.entries.filter((entry) => entry.entryId !== request.entryId) } };
}

export function updateEntity(configuration: PlatformConfiguration, data: PlatformData, request: { readonly actorId: ActorId; readonly entityId: EntityId; readonly values: Answers }): RecordChange {
  const entity = data.entities.find((candidate) => candidate.entityId === request.entityId);
  const definition = entity ? configuration.entities.find((candidate) => candidate.id === entity.kind) : undefined;
  if (!entity || !definition) return refuse('That record does not exist.');
  if (!isPermittedOnRecord(configuration, data, request.actorId, definition.editPermission, entity)) return needs(configuration, definition.editPermission);
  return { ok: true, data: { ...data, entities: data.entities.map((candidate) => (candidate.entityId === entity.entityId ? { ...entity, values: request.values } : candidate)) } };
}

export interface TransitionRequest {
  readonly actorId: ActorId;
  readonly entryId: EntryId;
  readonly transitionId: string;
  readonly date: PlainDate;
  readonly note: string;
}

// One workflow step on one entry, kept in the entry's history.
export function applyEntryTransition(configuration: PlatformConfiguration, data: PlatformData, request: TransitionRequest): RecordChange {
  const found = findEntry(data, request.entryId);
  const stream = found ? resolveStreamDefinition(configuration, found.entry.streamId) : null;
  const workflow = stream ? resolveWorkflow(configuration, stream.workflowId) : null;
  if (!found || !workflow || found.entry.status === null) return refuse('That entry has no workflow.');
  const { roleIds, context } = resolveActorContext(configuration, data, request.actorId, found.entity, found.entry);
  const result = applyTransition(workflow, configuration.accessPolicy, {
    state: found.entry.status,
    transitionId: request.transitionId,
    roleIds,
    context,
    actorId: request.actorId,
    date: request.date,
    note: request.note,
  });
  if (!result.ok) return result;
  return { ok: true, data: replaceEntry(data, { ...found.entry, status: result.record.to, history: [...found.entry.history, result.record] }) };
}
