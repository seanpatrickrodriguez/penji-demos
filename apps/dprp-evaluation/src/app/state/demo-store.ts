import { Injectable, computed, signal } from '@angular/core';
import { validateResolution } from '@penji-demos/compliance-engine';
import { PROGRAM_ENTITY, PROGRAM_STREAM } from '@penji-demos/constants';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { evaluateParticipant, evaluateRecognitionTimeline, resolveProgramParticipants } from '@penji-demos/dprp-recognition';
import { SYNTHETIC_DATA_SPECIALIST_ID, SYNTHETIC_ORGANIZATION_ID, buildSyntheticProgram } from '@penji-demos/dprp-seed';
import { DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { RecordChange, addEntry, removeEntry, resolveGuidance, resolveStreamEntries, updateEntity, updateEntry } from '@penji-demos/record-engine';
import { toPlainDate } from '@penji-demos/time';
import { Answers, EntityId, EntryId, GuidanceActionType, GuidanceItem, GuidanceResolution, PlatformData, toEntryId } from '@penji-demos/types';

// The product this page runs: the diabetes prevention program's configuration.
// The DPRP is the standard the organization is recognized under; every
// standard in the configuration evaluates its participants.
export const CONFIGURATION = PROGRAM_CONFIGURATION;
export const RECOGNITION_STANDARD = DPRP_STANDARD_2024;
export const ALL_STANDARDS = CONFIGURATION.standards;
export const ORGANIZATION_ID = SYNTHETIC_ORGANIZATION_ID;

// The last submission the demo evaluates through, and the date the whole record is read on.
export const THROUGH_MONTH = toPlainDate('2027-01-01');
// The page acts as the organization's data specialist; every change is checked against that role.
const ACTOR_ID = SYNTHETIC_DATA_SPECIALIST_ID;
const RESOLVER = 'You (demo)';

// All the page's state lives here as signals; everything shown is computed from it.
@Injectable({ providedIn: 'root' })
export class DemoStore {
  readonly data = signal<PlatformData>(buildSyntheticProgram());
  readonly resolutions = signal<ReadonlyMap<string, GuidanceResolution>>(new Map());
  // What stopped the last change, if anything did.
  readonly changeProblems = signal<readonly string[]>([]);

  readonly timeline = computed(() => evaluateRecognitionTimeline(RECOGNITION_STANDARD, CONFIGURATION, this.data(), ORGANIZATION_ID, THROUGH_MONTH));
  readonly selectedSequence = signal(this.timeline().length);
  readonly selected = computed(() => {
    const timeline = this.timeline();
    const entry = timeline[this.selectedSequence() - 1] ?? timeline[timeline.length - 1];
    if (!entry) throw new Error('The organization has no submissions to show.');
    return entry;
  });

  readonly cohorts = computed(() => this.data().entities.filter((entity) => entity.kind === PROGRAM_ENTITY.COHORT));

  readonly selectedParticipantId = signal<EntityId | null>(null);
  readonly selectedSubject = computed(() => resolveProgramParticipants(this.data()).find((subject) => subject.participant.entityId === this.selectedParticipantId()) ?? null);
  readonly selectedParticipant = computed(() => this.selectedSubject()?.participant ?? null);
  readonly sessionEntries = computed(() => {
    const participant = this.selectedParticipant();
    return participant ? resolveStreamEntries(this.data(), participant, PROGRAM_STREAM.SESSION) : [];
  });

  // The selected participant's whole current record, evaluated under every standard.
  readonly participantEvaluation = computed(() => {
    const subject = this.selectedSubject();
    return subject ? evaluateParticipant(RECOGNITION_STANDARD, CONFIGURATION, this.data(), subject, THROUGH_MONTH) : null;
  });

  readonly participantGuidance = computed<readonly GuidanceItem[]>(() => {
    const evaluation = this.participantEvaluation();
    const participant = this.selectedParticipant();
    return evaluation && participant ? resolveGuidance(CONFIGURATION, evaluation.standards, participant, this.resolutions()) : [];
  });

  selectSubmission(sequence: number): void {
    this.selectedSequence.set(sequence);
  }

  selectParticipant(participantId: EntityId | null): void {
    this.selectedParticipantId.set(participantId);
    this.changeProblems.set([]);
  }

  // Records a session, or replaces one when `entryId` names it.
  saveSession(participantId: EntityId, entryId: EntryId | null, values: Answers): void {
    const data = this.data();
    this.apply(
      entryId === null
        ? addEntry(CONFIGURATION, data, { actorId: ACTOR_ID, entityId: participantId, streamId: PROGRAM_STREAM.SESSION, entryId: toEntryId(crypto.randomUUID()), values, date: THROUGH_MONTH })
        : updateEntry(CONFIGURATION, data, { actorId: ACTOR_ID, entryId, values }),
    );
  }

  removeSession(entryId: EntryId): void {
    this.apply(removeEntry(CONFIGURATION, this.data(), { actorId: ACTOR_ID, entryId }));
  }

  saveEnrollment(participantId: EntityId, values: Answers): void {
    this.apply(updateEntity(CONFIGURATION, this.data(), { actorId: ACTOR_ID, entityId: participantId, values }));
  }

  // Records what a person did about a guidance item; returns the problems, if any, instead.
  resolveGuidance(item: GuidanceItem, action: GuidanceActionType, note: string): readonly string[] {
    const problems = validateResolution(item, action, note);
    if (problems.length > 0) return problems;
    this.resolutions.update((all) =>
      new Map(all).set(item.id, { guidanceId: item.id, action, resolvedBy: RESOLVER, resolvedAt: new Date().toISOString(), note: note.trim() }),
    );
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
    this.data.set(buildSyntheticProgram());
    this.resolutions.set(new Map());
    this.changeProblems.set([]);
  }

  private apply(change: RecordChange): void {
    if (change.ok) this.data.set(change.data);
    this.changeProblems.set(change.ok ? [] : change.problems);
  }
}
