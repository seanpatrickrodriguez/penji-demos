import { DELIVERY_MODE, DELIVERY_MODE_CODE, DPRP_ELIGIBILITY_BASIS, NOT_REPORTED, PREDIABETES_DETERMINATION_CODE, PROGRAM_PHASE, SESSION_TYPE_CODE, SUBMISSION_COLUMN } from '@penji-demos/constants';
import { evaluateEligibility } from '@penji-demos/compliance-engine';
import { FACT_LABELS, resolveParticipantFacts } from '@penji-demos/program-records';
import { CohortRecord, DeliveryMode, OrganizationData, ProgramPhase, RecognitionStandardDefinition, ValueOf } from '@penji-demos/types';
import { resolveProgramSessions } from '../participant/resolve-program-sessions';

type Column = ValueOf<typeof SUBMISSION_COLUMN>;
export type SubmissionRow = Readonly<Record<Column, string>>;

// Records are stored readable; this is the one place they become the DPRP's
// columns and codes ("store canonical, morph on export").

const SESSION_TYPE: Readonly<Record<ProgramPhase, { regular: string; makeUp: string }>> = {
  [PROGRAM_PHASE.CORE]: { regular: SESSION_TYPE_CODE.CORE, makeUp: SESSION_TYPE_CODE.MAKE_UP_CORE },
  [PROGRAM_PHASE.CORE_MAINTENANCE]: { regular: SESSION_TYPE_CODE.CORE_MAINTENANCE, makeUp: SESSION_TYPE_CODE.MAKE_UP_CORE_MAINTENANCE },
  [PROGRAM_PHASE.AFTER_PROGRAM_YEAR]: { regular: SESSION_TYPE_CODE.ONGOING_MAINTENANCE, makeUp: SESSION_TYPE_CODE.MAKE_UP_ONGOING_MAINTENANCE },
};

const DELIVERY_MODE_CODE_BY_MODE: Readonly<Record<DeliveryMode, number>> = {
  [DELIVERY_MODE.IN_PERSON]: DELIVERY_MODE_CODE.IN_PERSON,
  [DELIVERY_MODE.ONLINE]: DELIVERY_MODE_CODE.ONLINE,
  [DELIVERY_MODE.DISTANCE_LEARNING]: DELIVERY_MODE_CODE.DISTANCE_LEARNING,
};

const determination = (determined: boolean) => String(determined ? PREDIABETES_DETERMINATION_CODE.DETERMINED : PREDIABETES_DETERMINATION_CODE.NOT_DETERMINED);
const usDate = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

// One row per participant per session.  The prediabetes determinations are the
// DPRP's own eligibility bases, read from the participant's facts.  The initial
// A1C rides on the first row and the final A1C on the last; every other row reports 999.
export function resolveSubmissionRows(standard: RecognitionStandardDefinition, data: OrganizationData): readonly SubmissionRow[] {
  const cohorts = new Map<CohortRecord['cohortId'], CohortRecord>(data.cohorts.map((cohort) => [cohort.cohortId, cohort]));
  return data.participants.flatMap((participant) => {
    const cohort = cohorts.get(participant.cohortId);
    if (!cohort) return [];
    const ineligible = participant.ineligibleSince !== null;
    const { enrollment } = participant;
    const bases = new Set(evaluateEligibility(standard, resolveParticipantFacts(participant, cohort), FACT_LABELS).basesMet);
    const determined = (basis: string) => determination(!ineligible && bases.has(basis));
    const sessions = resolveProgramSessions(standard, cohort.firstSessionDate, participant.sessions);
    return sessions.map((session, index): SubmissionRow => {
      const a1c = index === 0 ? enrollment.a1cPercent : index === sessions.length - 1 ? (participant.finalA1c?.percent ?? null) : null;
      const type = SESSION_TYPE[session.phase];
      return {
        [SUBMISSION_COLUMN.ORGANIZATION_CODE]: data.organization.organizationCode,
        [SUBMISSION_COLUMN.PARTICIPANT_ID]: participant.participantId,
        [SUBMISSION_COLUMN.COHORT_ID]: participant.cohortId,
        [SUBMISSION_COLUMN.COACH_ID]: participant.coachId,
        [SUBMISSION_COLUMN.AGE]: String(enrollment.ageYears),
        [SUBMISSION_COLUMN.HEIGHT]: String(Math.round(enrollment.heightInches)),
        [SUBMISSION_COLUMN.A1C]: a1c === null ? String(NOT_REPORTED.A1C) : a1c.toFixed(1),
        // A participant recoded as ineligible reports all three determinations as 2.
        [SUBMISSION_COLUMN.GLUCTEST]: determined(DPRP_ELIGIBILITY_BASIS.BLOOD_TEST),
        [SUBMISSION_COLUMN.GDM]: determined(DPRP_ELIGIBILITY_BASIS.GESTATIONAL_DIABETES),
        [SUBMISSION_COLUMN.RISKTEST]: determined(DPRP_ELIGIBILITY_BASIS.RISK_TEST),
        [SUBMISSION_COLUMN.DELIVERY_MODE]: String(DELIVERY_MODE_CODE_BY_MODE[session.deliveryMode]),
        [SUBMISSION_COLUMN.SESSION_TYPE]: session.isMakeUp ? type.makeUp : type.regular,
        [SUBMISSION_COLUMN.SESSION_DATE]: usDate(session.sessionDate),
        [SUBMISSION_COLUMN.WEIGHT]: session.weightPounds === null ? String(NOT_REPORTED.WEIGHT) : session.weightPounds.toFixed(1),
        [SUBMISSION_COLUMN.PHYSICAL_ACTIVITY]: String(session.activityMinutes),
      };
    });
  });
}

export function resolveSubmissionCsv(rows: readonly SubmissionRow[]): string {
  const columns = Object.values(SUBMISSION_COLUMN);
  return [columns.join(','), ...rows.map((row) => columns.map((column) => row[column]).join(','))].join('\n');
}
