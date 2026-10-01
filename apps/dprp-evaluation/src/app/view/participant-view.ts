import { PROGRAM_PHASE } from '@penji-demos/constants';
import { isGuidanceOpen } from '@penji-demos/compliance-engine';
import { SubmissionResult } from '@penji-demos/dprp-standard';
import { GuidanceItem, ParticipantEvaluation, ProgramSession } from '@penji-demos/types';
import { formatDate } from './format';

export interface ParticipantRow {
  readonly participantId: ParticipantEvaluation['participantId'];
  readonly cohortId: string;
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
      cohortId: participant.cohortId,
      inEvaluationCohort: inWindow.has(participant.cohortId),
      eligible: participant.eligibility.met,
      mdpp: !mdpp?.applies ? 'notApplicable' : mdpp.eligibility.met ? 'eligible' : 'notEligible',
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
  readonly index: number;
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

// Sessions in date order, each with its index in the stored record so it can be edited.
export function resolveSessionRows(evaluation: ParticipantEvaluation, stored: readonly { sessionDate: string; isMakeUp: boolean; weightPounds: number | null; activityMinutes: number }[], items: readonly GuidanceItem[]): readonly SessionRow[] {
  const flaggedDates = new Set(items.filter(isGuidanceOpen).map((item) => item.finding.eventDate));
  const used = new Set<number>();
  return evaluation.sessions.map((session) => {
    const index = stored.findIndex((candidate, at) => !used.has(at) && candidate.sessionDate === session.sessionDate && candidate.isMakeUp === session.isMakeUp && candidate.weightPounds === session.weightPounds && candidate.activityMinutes === session.activityMinutes);
    used.add(index);
    return {
      index,
      date: formatDate(session.sessionDate),
      programMonth: session.programMonth,
      phase: PHASE_LABEL[session.phase],
      makeUp: session.isMakeUp,
      weight: session.weightPounds === null ? 'Not recorded' : `${session.weightPounds.toFixed(1)} lb`,
      minutes: session.activityMinutes,
      flagged: flaggedDates.has(session.sessionDate),
    };
  });
}
