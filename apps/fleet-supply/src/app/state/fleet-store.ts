import { Injectable, computed, signal } from '@angular/core';
import { validateResolution } from '@penji-demos/compliance-engine';
import { FLEET_CONFIGURATION } from '@penji-demos/fleet-configuration';
import { FLEET_AS_OF, FLEET_WALKTHROUGH, buildSyntheticFleet } from '@penji-demos/fleet-seed';
import { RecordChange, addEntry, applyEntryTransition, evaluateEntity, removeEntry, resolveGuidance, updateEntity, updateEntry } from '@penji-demos/record-engine';
import { ActorId, Answers, EntityId, EntryId, GuidanceActionType, GuidanceItem, GuidanceResolution, PlatformData, toEntryId } from '@penji-demos/types';

// The product this page runs: the fleet's configuration, read on the seed's date.
export const CONFIGURATION = FLEET_CONFIGURATION;
export const AS_OF = FLEET_AS_OF;

function resolveFirstViewer(): ActorId {
  const first = FLEET_WALKTHROUGH[0];
  if (!first) throw new Error('The fleet seed names no one to view the page as.');
  return first.actorId;
}

// All the page's state lives here as signals; everything shown is computed from it.
@Injectable({ providedIn: 'root' })
export class FleetStore {
  readonly data = signal<PlatformData>(buildSyntheticFleet());
  readonly resolutions = signal<ReadonlyMap<string, GuidanceResolution>>(new Map());
  // Who the page is acting as.  Every permission on the page is worked out for this person.
  readonly viewerId = signal<ActorId>(resolveFirstViewer());
  readonly selectedEntityId = signal<EntityId | null>(null);
  // What stopped the last change, if anything did.
  readonly changeProblems = signal<readonly string[]>([]);

  readonly viewer = computed(() => {
    const viewer = this.data().actors.find((actor) => actor.actorId === this.viewerId());
    if (!viewer) throw new Error('The page is acting as someone who is not on record.');
    return viewer;
  });

  readonly selectedEntity = computed(() => this.data().entities.find((entity) => entity.entityId === this.selectedEntityId()) ?? null);

  // Every entity's evaluations under every standard its definition names.
  readonly evaluations = computed(() => new Map(this.data().entities.map((entity) => [entity.entityId, evaluateEntity(CONFIGURATION, this.data(), entity, AS_OF)])));

  readonly guidance = computed(() => {
    const resolutions = this.resolutions();
    return new Map(this.data().entities.map((entity) => [entity.entityId, resolveGuidance(CONFIGURATION, this.evaluations().get(entity.entityId) ?? [], entity, resolutions)]));
  });

  selectViewer(actorId: ActorId): void {
    this.viewerId.set(actorId);
    this.changeProblems.set([]);
  }

  selectEntity(entityId: EntityId | null): void {
    this.selectedEntityId.set(entityId);
    this.changeProblems.set([]);
  }

  addEntry(entityId: EntityId, streamId: string, values: Answers): boolean {
    return this.apply(addEntry(CONFIGURATION, this.data(), { actorId: this.viewerId(), entityId, streamId, entryId: toEntryId(crypto.randomUUID()), values, date: AS_OF }));
  }

  updateEntry(entryId: EntryId, values: Answers): boolean {
    return this.apply(updateEntry(CONFIGURATION, this.data(), { actorId: this.viewerId(), entryId, values }));
  }

  removeEntry(entryId: EntryId): boolean {
    return this.apply(removeEntry(CONFIGURATION, this.data(), { actorId: this.viewerId(), entryId }));
  }

  updateEntity(entityId: EntityId, values: Answers): boolean {
    return this.apply(updateEntity(CONFIGURATION, this.data(), { actorId: this.viewerId(), entityId, values }));
  }

  // One workflow step; returns the problems that stopped it, if any.
  applyTransition(entryId: EntryId, transitionId: string, note: string): readonly string[] {
    const change = applyEntryTransition(CONFIGURATION, this.data(), { actorId: this.viewerId(), entryId, transitionId, date: AS_OF, note });
    this.apply(change);
    return change.ok ? [] : change.problems;
  }

  // Records what the viewer did about a guidance item; returns the problems, if any, instead.
  resolveGuidance(item: GuidanceItem, action: GuidanceActionType, note: string): readonly string[] {
    const problems = validateResolution(item, action, note);
    if (problems.length > 0) return problems;
    this.resolutions.update((all) => new Map(all).set(item.id, { guidanceId: item.id, action, resolvedBy: this.viewer().name, resolvedAt: new Date().toISOString(), note: note.trim() }));
    return [];
  }

  reopenGuidance(item: GuidanceItem): void {
    this.resolutions.update((all) => {
      const next = new Map(all);
      next.delete(item.id);
      return next;
    });
  }

  resetRecords(): void {
    this.data.set(buildSyntheticFleet());
    this.resolutions.set(new Map());
    this.changeProblems.set([]);
  }

  private apply(change: RecordChange): boolean {
    if (change.ok) this.data.set(change.data);
    this.changeProblems.set(change.ok ? [] : change.problems);
    return change.ok;
  }
}
