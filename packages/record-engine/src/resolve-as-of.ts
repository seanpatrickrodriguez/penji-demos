import { isBefore } from '@penji-demos/time';
import { EntityId, EntityRecord, PlainDate, PlatformConfiguration, PlatformData } from '@penji-demos/types';
import { readDate } from './read-values';
import { resolveEntityDefinition } from './resolve-configuration';

// The records as they stood before a date: entities that had begun, under
// parents that had begun, and the entries dated before it.  An evaluation
// for a past date never sees what was recorded later.
export function resolveDataAsOf(configuration: PlatformConfiguration, data: PlatformData, before: PlainDate): PlatformData {
  const byId = new Map(data.entities.map((entity) => [entity.entityId, entity]));
  const decided = new Map<EntityId, boolean>();
  const hasBegun = (entity: EntityRecord): boolean => {
    const definition = resolveEntityDefinition(configuration, entity.kind);
    if (!definition || definition.startField === null) return true;
    const start = readDate(entity.values, definition.startField);
    return start !== null && isBefore(start, before);
  };
  const isKept = (entity: EntityRecord, line: ReadonlySet<EntityId>): boolean => {
    const known = decided.get(entity.entityId);
    if (known !== undefined) return known;
    const parent = entity.parentId === null ? null : byId.get(entity.parentId);
    const kept = hasBegun(entity) && !line.has(entity.entityId) && (entity.parentId === null || (parent !== undefined && parent !== null && isKept(parent, new Set([...line, entity.entityId]))));
    decided.set(entity.entityId, kept);
    return kept;
  };
  const entities = data.entities.filter((entity) => isKept(entity, new Set()));
  const kept = new Set(entities.map((entity) => entity.entityId));
  return { ...data, entities, entries: data.entries.filter((entry) => kept.has(entry.entityId) && isBefore(entry.date, before)) };
}
