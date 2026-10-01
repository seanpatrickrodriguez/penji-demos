import { RECOGNITION_STATUS } from '@penji-demos/constants';
import { evaluateRequirements, resolveStatusTimeline, resolveTier } from '@penji-demos/rule-engine';
import { calculateFullMonthsBetween, isBefore, resolveFirstOfMonth, resolveMonthsLater } from '@penji-demos/time';
import { ComplianceStandardDefinition, OrganizationData, PlainDate, RecognitionEvaluation, RecognitionStandardDefinition, RecognitionStatus } from '@penji-demos/types';
import { evaluateParticipant } from '../participant/evaluate-participant';
import { DPRP_METRIC_REGISTRY } from './metric-registry';
import { isInCohortWindow, resolveCohortWindow } from './resolve-evaluation-cohort';

// Which data submission a due month is: 1 for the first, six months after the effective date.
export function calculateSubmissionSequence(standard: RecognitionStandardDefinition, effectiveDate: PlainDate, submissionMonth: PlainDate): number {
  return Math.floor(calculateFullMonthsBetween(resolveFirstOfMonth(effectiveDate), resolveFirstOfMonth(submissionMonth)) / standard.submissionIntervalMonths);
}

// The records as they stood when a submission was due: sessions held before the
// due month, the cohorts that had begun, and results tested before it.
export function resolveRecordsAsOf(data: OrganizationData, submissionMonth: PlainDate): OrganizationData {
  const due = resolveFirstOfMonth(submissionMonth);
  const cohorts = data.cohorts.filter((cohort) => isBefore(cohort.firstSessionDate, due));
  const begun = new Set(cohorts.map((cohort) => cohort.cohortId));
  const participants = data.participants.flatMap((participant) => {
    if (!begun.has(participant.cohortId)) return [];
    const sessions = participant.sessions.filter((session) => isBefore(session.sessionDate, due));
    if (sessions.length === 0) return [];
    const finalA1c = participant.finalA1c && isBefore(participant.finalA1c.reportedDate, due) ? participant.finalA1c : null;
    const ineligibleSince = participant.ineligibleSince && isBefore(participant.ineligibleSince.date, due) ? participant.ineligibleSince : null;
    return [{ ...participant, sessions, finalA1c, ineligibleSince }];
  });
  return { ...data, cohorts, participants };
}

// The recognition an organization's records support at one data submission,
// requirement by requirement, under the given standard.
export function evaluateRecognition(
  standard: RecognitionStandardDefinition,
  data: OrganizationData,
  submissionMonth: PlainDate,
  otherStandards: readonly ComplianceStandardDefinition[] = [],
): RecognitionEvaluation {
  const asOf = resolveRecordsAsOf(data, submissionMonth);
  const window = resolveCohortWindow(standard, submissionMonth);
  const cohortsById = new Map(asOf.cohorts.map((cohort) => [cohort.cohortId, cohort]));
  const evaluationCohortIds = asOf.cohorts.filter((cohort) => isInCohortWindow(cohort, window)).map((cohort) => cohort.cohortId);
  const inWindow = new Set(evaluationCohortIds);

  const participants = asOf.participants.flatMap((participant) => {
    const cohort = cohortsById.get(participant.cohortId);
    return cohort ? [evaluateParticipant(standard, participant, cohort, otherStandards)] : [];
  });

  const requirements = evaluateRequirements(standard.requirements, DPRP_METRIC_REGISTRY, {
    standard,
    evaluationCohort: participants.filter((participant) => inWindow.has(participant.cohortId)),
    allParticipants: participants,
    submissionSequence: calculateSubmissionSequence(standard, data.organization.effectiveDate, submissionMonth),
  });

  return {
    submissionMonth: resolveFirstOfMonth(submissionMonth),
    window,
    evaluationCohortIds,
    participants,
    requirements,
    status: resolveTier(standard.tiers, requirements)?.status ?? RECOGNITION_STATUS.PENDING,
  };
}

export interface SubmissionResult {
  readonly sequence: number;
  readonly evaluation: RecognitionEvaluation;
  readonly awarded: RecognitionStatus;
  readonly heldForMonths: number | null;
}

// Every data submission from the first through the given month, each
// evaluated on its own and then carried forward as the standard allows.
export function evaluateRecognitionTimeline(
  standard: RecognitionStandardDefinition,
  data: OrganizationData,
  throughMonth: PlainDate,
  otherStandards: readonly ComplianceStandardDefinition[] = [],
): readonly SubmissionResult[] {
  const firstDue = resolveMonthsLater(resolveFirstOfMonth(data.organization.effectiveDate), standard.submissionIntervalMonths);
  const months: PlainDate[] = [];
  for (let due = firstDue; !isBefore(resolveFirstOfMonth(throughMonth), due); due = resolveMonthsLater(due, standard.submissionIntervalMonths)) months.push(due);
  const evaluations = months.map((month) => evaluateRecognition(standard, data, month, otherStandards));
  const timeline = resolveStatusTimeline(standard.statusOrder, standard.statusPersistence, evaluations.map((evaluation) => evaluation.status), standard.submissionIntervalMonths);
  return evaluations.map((evaluation, index) => ({
    sequence: index + 1,
    evaluation,
    awarded: timeline[index]?.awarded ?? evaluation.status,
    heldForMonths: timeline[index]?.heldForMonths ?? null,
  }));
}
