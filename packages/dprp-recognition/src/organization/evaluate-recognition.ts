import { COHORT_FIELD, ORGANIZATION_FIELD, PROGRAM_ENTITY, PROGRAM_STREAM, RECOGNITION_STATUS } from '@penji-demos/constants';
import { readDate, resolveDataAsOf, resolveStreamEntries, resolveTenantLine } from '@penji-demos/record-engine';
import { evaluateRequirements, resolveStatusTimeline, resolveTier } from '@penji-demos/rule-engine';
import { calculateFullMonthsBetween, isBefore, resolveFirstOfMonth, resolveMonthsLater } from '@penji-demos/time';
import { PlainDate, PlatformConfiguration, PlatformData, TenantId } from '@penji-demos/types';
import { RecognitionStandardDefinition, RecognitionStatus } from '@penji-demos/dprp-standard';
import { RecognitionEvaluation } from '../recognition-evaluation';
import { evaluateParticipant } from '../participant/evaluate-participant';
import { ProgramParticipant, resolveProgramParticipants } from '../participant/resolve-program-sessions';
import { DPRP_METRIC_REGISTRY } from './metric-registry';
import { isInCohortWindow, resolveCohortWindow } from './resolve-evaluation-cohort';

// Which data submission a due month is: 1 for the first, six months after the effective date.
export function calculateSubmissionSequence(standard: RecognitionStandardDefinition, effectiveDate: PlainDate, submissionMonth: PlainDate): number {
  return Math.floor(calculateFullMonthsBetween(resolveFirstOfMonth(effectiveDate), resolveFirstOfMonth(submissionMonth)) / standard.submissionIntervalMonths);
}

// The organization's recognition effective date, from its tenant record.
export function resolveEffectiveDate(data: PlatformData, organizationId: TenantId): PlainDate | null {
  const organization = data.tenants.find((tenant) => tenant.tenantId === organizationId);
  return organization ? readDate(organization.values, ORGANIZATION_FIELD.EFFECTIVE_DATE) : null;
}

// The organization's participants who had attended a session in the records given.
export const resolveOrganizationParticipants = (data: PlatformData, organizationId: TenantId): readonly ProgramParticipant[] =>
  resolveProgramParticipants(data).filter(
    ({ participant }) => resolveTenantLine(data, participant.tenantId).includes(organizationId) && resolveStreamEntries(data, participant, PROGRAM_STREAM.SESSION).length > 0,
  );

// The recognition an organization's records support at one data submission,
// requirement by requirement, under the given standard.  Only the records that
// existed before the due month are read.
export function evaluateRecognition(
  standard: RecognitionStandardDefinition,
  configuration: PlatformConfiguration,
  data: PlatformData,
  organizationId: TenantId,
  submissionMonth: PlainDate,
): RecognitionEvaluation {
  const due = resolveFirstOfMonth(submissionMonth);
  const asOf = resolveDataAsOf(configuration, data, due);
  const window = resolveCohortWindow(standard, submissionMonth);
  const subjects = resolveOrganizationParticipants(asOf, organizationId);
  const evaluationCohortIds = asOf.entities.flatMap((cohort) => {
    const start = cohort.kind === PROGRAM_ENTITY.COHORT && resolveTenantLine(asOf, cohort.tenantId).includes(organizationId) ? readDate(cohort.values, COHORT_FIELD.START_DATE) : null;
    return start && isInCohortWindow(start, window) ? [cohort.entityId] : [];
  });
  const inWindow = new Set(evaluationCohortIds);
  const participants = subjects.map((subject) => evaluateParticipant(standard, configuration, asOf, subject, due));
  const effectiveDate = resolveEffectiveDate(data, organizationId) ?? due;
  const requirements = evaluateRequirements(standard.requirements, DPRP_METRIC_REGISTRY, {
    standard,
    evaluationCohort: participants.filter((participant) => inWindow.has(participant.cohortId)),
    allParticipants: participants,
    submissionSequence: calculateSubmissionSequence(standard, effectiveDate, submissionMonth),
  });
  return {
    submissionMonth: due,
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
  configuration: PlatformConfiguration,
  data: PlatformData,
  organizationId: TenantId,
  throughMonth: PlainDate,
): readonly SubmissionResult[] {
  const effectiveDate = resolveEffectiveDate(data, organizationId);
  if (!effectiveDate) return [];
  const firstDue = resolveMonthsLater(resolveFirstOfMonth(effectiveDate), standard.submissionIntervalMonths);
  const months: PlainDate[] = [];
  for (let due = firstDue; !isBefore(resolveFirstOfMonth(throughMonth), due); due = resolveMonthsLater(due, standard.submissionIntervalMonths)) months.push(due);
  const evaluations = months.map((month) => evaluateRecognition(standard, configuration, data, organizationId, month));
  const timeline = resolveStatusTimeline(standard.statusOrder, standard.statusPersistence, evaluations.map((evaluation) => evaluation.status), standard.submissionIntervalMonths);
  return evaluations.map((evaluation, index) => ({
    sequence: index + 1,
    evaluation,
    awarded: timeline[index]?.awarded ?? evaluation.status,
    heldForMonths: timeline[index]?.heldForMonths ?? null,
  }));
}
