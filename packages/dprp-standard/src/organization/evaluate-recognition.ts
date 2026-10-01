import { RECOGNITION_STATUS } from '@penji-demos/constants';
import { evaluateRequirements, resolveTier } from '@penji-demos/rule-engine';
import { calculateFullMonthsBetween, resolveFirstOfMonth } from '@penji-demos/time';
import { ComplianceStandardDefinition, OrganizationData, PlainDate, RecognitionEvaluation, RecognitionStandardDefinition } from '@penji-demos/types';
import { evaluateParticipant } from '../participant/evaluate-participant';
import { DPRP_METRIC_REGISTRY } from './metric-registry';
import { isInCohortWindow, resolveCohortWindow } from './resolve-evaluation-cohort';

// Which data submission a due month is: 1 for the first, six months after the effective date.
export function calculateSubmissionSequence(standard: RecognitionStandardDefinition, effectiveDate: PlainDate, submissionMonth: PlainDate): number {
  return Math.floor(calculateFullMonthsBetween(resolveFirstOfMonth(effectiveDate), resolveFirstOfMonth(submissionMonth)) / standard.submissionIntervalMonths);
}

// The recognition an organization's records support at one data submission,
// requirement by requirement, under the given standard.
export function evaluateRecognition(
  standard: RecognitionStandardDefinition,
  data: OrganizationData,
  submissionMonth: PlainDate,
  otherStandards: readonly ComplianceStandardDefinition[] = [],
): RecognitionEvaluation {
  const window = resolveCohortWindow(standard, submissionMonth);
  const cohortsById = new Map(data.cohorts.map((cohort) => [cohort.cohortId, cohort]));
  const evaluationCohortIds = data.cohorts.filter((cohort) => isInCohortWindow(cohort, window)).map((cohort) => cohort.cohortId);
  const inWindow = new Set(evaluationCohortIds);

  const participants = data.participants.flatMap((participant) => {
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
