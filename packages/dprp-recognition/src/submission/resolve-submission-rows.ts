import { evaluateEligibility } from '@penji-demos/compliance-engine';
import {
  COHORT_FIELD,
  DELIVERY_MODE,
  DELIVERY_MODE_CODE,
  DPRP_ELIGIBILITY_BASIS,
  ENROLLMENT_FIELD,
  NOT_REPORTED,
  ORGANIZATION_FIELD,
  PARTICIPANT_FIELD,
  PREDIABETES_DETERMINATION_CODE,
  PROGRAM_PHASE,
  PROGRAM_STREAM,
  SESSION_TYPE_CODE,
  SUBMISSION_COLUMN,
} from '@penji-demos/constants';
import { readNumber, readText, resolveEntityFacts, resolveFieldLabels, resolveStreamEntries } from '@penji-demos/record-engine';
import { PlainDate, PlatformConfiguration, PlatformData, TenantId, ValueOf } from '@penji-demos/types';
import { RecognitionStandardDefinition } from '@penji-demos/dprp-standard';
import { DeliveryMode, ProgramPhase } from '../recognition-evaluation';
import { resolveOrganizationParticipants } from '../organization/evaluate-recognition';
import { resolveFinalA1c, resolveParticipantSessions } from '../participant/resolve-program-sessions';

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
const orBlank = (value: string | null) => value ?? '';

// One row per participant per session.  The prediabetes determinations are the
// DPRP's own eligibility bases, read from the participant's facts.  The initial
// A1C rides on the first row and the final A1C on the last; every other row reports 999.
export function resolveSubmissionRows(
  standard: RecognitionStandardDefinition,
  configuration: PlatformConfiguration,
  data: PlatformData,
  organizationId: TenantId,
  asOf: PlainDate,
): readonly SubmissionRow[] {
  const organization = data.tenants.find((tenant) => tenant.tenantId === organizationId);
  const organizationCode = organization ? orBlank(readText(organization.values, ORGANIZATION_FIELD.CODE)) : '';
  const labels = resolveFieldLabels(configuration);
  return resolveOrganizationParticipants(data, organizationId).flatMap((subject) => {
    const { participant, cohort } = subject;
    const enrollment = participant.values;
    const ineligible = resolveStreamEntries(data, participant, PROGRAM_STREAM.RECODE).length > 0;
    const bases = new Set(evaluateEligibility(standard.eligibility, resolveEntityFacts(configuration, data, participant, asOf), labels).basesMet);
    const determined = (basis: string) => determination(!ineligible && bases.has(basis));
    const sessions = resolveParticipantSessions(standard, data, subject);
    const initialA1c = readNumber(enrollment, ENROLLMENT_FIELD.A1C_PERCENT);
    const finalA1c = resolveFinalA1c(data, participant)?.percent ?? null;
    const age = readNumber(enrollment, ENROLLMENT_FIELD.AGE_YEARS);
    const height = readNumber(enrollment, ENROLLMENT_FIELD.HEIGHT_INCHES);
    return sessions.map((session, index): SubmissionRow => {
      const a1c = index === 0 ? initialA1c : index === sessions.length - 1 ? finalA1c : null;
      const type = SESSION_TYPE[session.phase];
      return {
        [SUBMISSION_COLUMN.ORGANIZATION_CODE]: organizationCode,
        [SUBMISSION_COLUMN.PARTICIPANT_ID]: orBlank(readText(participant.values, PARTICIPANT_FIELD.CODE)),
        [SUBMISSION_COLUMN.COHORT_ID]: orBlank(readText(cohort.values, COHORT_FIELD.CODE)),
        [SUBMISSION_COLUMN.COACH_ID]: orBlank(readText(participant.values, PARTICIPANT_FIELD.COACH_CODE)),
        [SUBMISSION_COLUMN.AGE]: age === null ? '' : String(age),
        [SUBMISSION_COLUMN.HEIGHT]: height === null ? '' : String(Math.round(height)),
        [SUBMISSION_COLUMN.A1C]: a1c === null ? String(NOT_REPORTED.A1C) : a1c.toFixed(1),
        // A participant recoded as ineligible reports all three determinations as 2.
        [SUBMISSION_COLUMN.GLUCTEST]: determined(DPRP_ELIGIBILITY_BASIS.BLOOD_TEST),
        [SUBMISSION_COLUMN.GDM]: determined(DPRP_ELIGIBILITY_BASIS.GESTATIONAL_DIABETES),
        [SUBMISSION_COLUMN.RISKTEST]: determined(DPRP_ELIGIBILITY_BASIS.RISK_TEST),
        [SUBMISSION_COLUMN.DELIVERY_MODE]: session.deliveryMode === null ? '' : String(DELIVERY_MODE_CODE_BY_MODE[session.deliveryMode]),
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
