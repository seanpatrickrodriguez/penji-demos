import { PROGRAM_PHASE } from '@penji-demos/constants';
import { isGuidanceOpen } from '@penji-demos/compliance-engine';
import { SubmissionResult } from '@penji-demos/dprp-recognition';
import { EntityId, EntryId, GuidanceItem, ParticipantEvaluation, ProgramSession } from '@penji-demos/types';
import { formatDate } from '@penji-demos/ui';

export interface ParticipantRow {
  readonly participantId: EntityId;
  readonly participantCode: string;
  readonly cohortCode: string;
  readonly inEvaluationCohort: boolean;
  readonly eligible: boolean;
  readonly mdpp: 'eligible' | 'notEligible' | 'notApplicable';
  readonly completer: boolean;
  readonly sessions: number;
  readonly weightChange: string;
  readonly riskReduced: boolean;
  readonly findings: number;
  readonly blocking: number;
}

export function resolveParticipantRows(entry: SubmissionResult, blockingRuleIds: ReadonlySet<string>): readonly ParticipantRow[] {
  const inWindow = new Set<string>(entry.evaluation.evaluationCohortIds);
  return entry.evaluation.participants.map((participant) => {
    const mdpp = participant.standards[1];
    const findings = participant.standards.flatMap((standard) => standard.findings);
    return {
      participantId: participant.participantId,
      participantCode: participant.participantCode,
      cohortCode: participant.cohortCode,
      inEvaluationCohort: inWindow.has(participant.cohortId),
      eligible: participant.eligibility.met,
      mdpp: !mdpp?.applies ? 'notApplicable' : mdpp.eligibility?.met ? 'eligible' : 'notEligible',
      completer: participant.completer.met,
      sessions: participant.sessionsAttended,
      weightChange: participant.weightChange ? `${participant.weightChange.lossPercent >= 0 ? '−' : '+'}${Math.abs(participant.weightChange.lossPercent).toFixed(1)}%` : '—',
      riskReduced: participant.riskReduced,
      findings: findings.length,
      blocking: findings.filter((finding) => blockingRuleIds.has(finding.ruleId)).length,
    };
  });
}

export interface SessionRow {
  readonly entryId: EntryId;
  readonly date: string;
  readonly programMonth: number;
  readonly phase: string;
  readonly makeUp: boolean;
  readonly weight: string;
  readonly minutes: number;
  readonly flagged: boolean;
}

const PHASE_LABEL: Readonly<Record<ProgramSession['phase'], string>> = {
  [PROGRAM_PHASE.CORE]: 'Core',
  [PROGRAM_PHASE.CORE_MAINTENANCE]: 'Core Maintenance',
  [PROGRAM_PHASE.AFTER_PROGRAM_YEAR]: 'After the program year',
};

// Sessions in date order, each with the entry it was read from so it can be edited.
export function resolveSessionRows(evaluation: ParticipantEvaluation, items: readonly GuidanceItem[]): readonly SessionRow[] {
  const flagged = new Set(items.filter(isGuidanceOpen).map((item) => item.finding.eventId));
  return evaluation.sessions.map((session) => {
    return {
      entryId: session.entryId,
      date: formatDate(session.sessionDate),
      programMonth: session.programMonth,
      phase: PHASE_LABEL[session.phase],
      makeUp: session.isMakeUp,
      weight: session.weightPounds === null ? 'Not recorded' : `${session.weightPounds.toFixed(1)} lb`,
      minutes: session.activityMinutes,
      flagged: flagged.has(session.entryId),
    };
  });
}
