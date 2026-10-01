import { Injectable, computed, signal } from '@angular/core';
import { resolveGuidanceItem, validateResolution } from '@penji-demos/compliance-engine';
import { DPRP_STANDARD_2024, evaluateParticipant, evaluateRecognitionTimeline } from '@penji-demos/dprp-standard';
import { MDPP_STANDARD } from '@penji-demos/mdpp-standard';
import { buildSyntheticOrganization } from '@penji-demos/seed';
import { toPlainDate } from '@penji-demos/time';
import {
  ComplianceStandardDefinition,
  Enrollment,
  GuidanceActionType,
  GuidanceItem,
  GuidanceResolution,
  OrganizationData,
  ParticipantId,
  RuleDefinition,
  SessionRecord,
} from '@penji-demos/types';

// The standards this organization is held to.  The DPRP applies to everyone;
// the MDPP selects its own participants through its definition.
export const RECOGNITION_STANDARD = DPRP_STANDARD_2024;
export const OTHER_STANDARDS: readonly ComplianceStandardDefinition[] = [MDPP_STANDARD];
export const ALL_STANDARDS: readonly ComplianceStandardDefinition[] = [RECOGNITION_STANDARD, ...OTHER_STANDARDS];

// The last submission the demo evaluates through.
const THROUGH_MONTH = toPlainDate('2027-01-01');
const RESOLVER = 'You (demo)';

const RULES_BY_ID: ReadonlyMap<string, RuleDefinition> = new Map(ALL_STANDARDS.flatMap((standard) => standard.rules.map((rule) => [rule.id, rule] as const)));

// All the page's state lives here as signals; everything shown is computed from it.
@Injectable({ providedIn: 'root' })
export class DemoStore {
  readonly data = signal<OrganizationData>(buildSyntheticOrganization());
  readonly resolutions = signal<ReadonlyMap<string, GuidanceResolution>>(new Map());

  readonly timeline = computed(() => evaluateRecognitionTimeline(RECOGNITION_STANDARD, this.data(), THROUGH_MONTH, OTHER_STANDARDS));
  readonly selectedSequence = signal(this.timeline().length);
  readonly selected = computed(() => {
    const timeline = this.timeline();
    const entry = timeline[this.selectedSequence() - 1] ?? timeline[timeline.length - 1];
    if (!entry) throw new Error('The organization has no submissions to show.');
    return entry;
  });

  readonly selectedParticipantId = signal<ParticipantId | null>(null);
  readonly selectedParticipant = computed(() => this.data().participants.find((participant) => participant.participantId === this.selectedParticipantId()) ?? null);
  readonly selectedCohort = computed(() => {
    const participant = this.selectedParticipant();
    return participant ? (this.data().cohorts.find((cohort) => cohort.cohortId === participant.cohortId) ?? null) : null;
  });

  // The selected participant's whole current record, evaluated under every standard.
  readonly participantEvaluation = computed(() => {
    const participant = this.selectedParticipant();
    const cohort = this.selectedCohort();
    return participant && cohort ? evaluateParticipant(RECOGNITION_STANDARD, participant, cohort, OTHER_STANDARDS) : null;
  });

  readonly participantGuidance = computed<readonly GuidanceItem[]>(() => {
    const evaluation = this.participantEvaluation();
    if (!evaluation) return [];
    const resolutions = this.resolutions();
    return evaluation.standards.flatMap((standard) =>
      standard.findings.flatMap((finding) => {
        const rule = RULES_BY_ID.get(finding.ruleId);
        return rule ? [resolveGuidanceItem(evaluation.participantId, rule, finding, resolutions)] : [];
      }),
    );
  });

  selectSubmission(sequence: number): void {
    this.selectedSequence.set(sequence);
  }

  selectParticipant(participantId: ParticipantId | null): void {
    this.selectedParticipantId.set(participantId);
  }

  // Replaces one session (or adds one when `index` is null) on a participant's record.
  saveSession(participantId: ParticipantId, index: number | null, session: SessionRecord): void {
    this.updateParticipant(participantId, (participant) => ({
      ...participant,
      sessions: index === null ? [...participant.sessions, session] : participant.sessions.map((existing, at) => (at === index ? session : existing)),
    }));
  }

  removeSession(participantId: ParticipantId, index: number): void {
    this.updateParticipant(participantId, (participant) => ({ ...participant, sessions: participant.sessions.filter((_, at) => at !== index) }));
  }

  saveEnrollment(participantId: ParticipantId, enrollment: Enrollment): void {
    this.updateParticipant(participantId, (participant) => ({ ...participant, enrollment }));
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
    this.data.set(buildSyntheticOrganization());
    this.resolutions.set(new Map());
  }

  private updateParticipant(participantId: ParticipantId, change: (participant: OrganizationData['participants'][number]) => OrganizationData['participants'][number]): void {
    this.data.update((data) => ({ ...data, participants: data.participants.map((participant) => (participant.participantId === participantId ? change(participant) : participant)) }));
  }
}
