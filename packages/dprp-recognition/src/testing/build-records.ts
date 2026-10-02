import {
  A1C_RESULT_FIELD,
  ACCESS_SCOPE_KIND,
  COHORT_FIELD,
  COHORT_KIND,
  DELIVERY_MODE,
  ENROLLMENT_FIELD,
  INELIGIBILITY_EVENT,
  ORGANIZATION_FIELD,
  PARTICIPANT_FIELD,
  PROGRAM_ENTITY,
  PROGRAM_STREAM,
  PROGRAM_TENANT_KIND,
  RECODE_FIELD,
  RESULT_SOURCE,
  SESSION_FIELD,
  STAFF_FIELD,
  STAFF_POSITION,
} from '@penji-demos/constants';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import { Answers, EntityRecord, PlainDate, PlatformData, StreamEntry, ValueOf, toActorId, toAssignmentId, toDefinitionId, toEntityId, toEntryId, toTenantId } from '@penji-demos/types';
import { A1cResult, ParticipantEvaluation } from '../recognition-evaluation';
import { evaluateParticipant } from '../participant/evaluate-participant';
import { resolveProgramParticipants } from '../participant/resolve-program-sessions';

// Builders for tests: platform records with only the parts a test cares about spelled out.

export const ORGANIZATION_ID = toTenantId('organization');
export const DATA_SPECIALIST_ID = toActorId('data-specialist');
const S = SESSION_FIELD;

export function buildCohort(code: string, start: string, kind: ValueOf<typeof COHORT_KIND> = COHORT_KIND.GROUP): EntityRecord {
  return {
    entityId: toEntityId(`cohort-${code}`),
    kind: toDefinitionId(PROGRAM_ENTITY.COHORT),
    tenantId: ORGANIZATION_ID,
    parentId: null,
    values: { [COHORT_FIELD.CODE]: code, [COHORT_FIELD.KIND]: kind, [COHORT_FIELD.START_DATE]: start },
  };
}

// By default: a 52-year-old enrolled on 2025-01-02 with a lab fasting glucose of 112 from December.
export function buildEnrollment(overrides: Answers = {}): Answers {
  return {
    [ENROLLMENT_FIELD.ENROLLMENT_DATE]: '2025-01-02',
    [ENROLLMENT_FIELD.AGE_YEARS]: 52,
    [ENROLLMENT_FIELD.HEIGHT_INCHES]: 66,
    [ENROLLMENT_FIELD.IDENTIFIES_AS_ASIAN]: false,
    [ENROLLMENT_FIELD.A1C_PERCENT]: null,
    [ENROLLMENT_FIELD.A1C_TEST_DATE]: null,
    [ENROLLMENT_FIELD.A1C_REPORTED_DATE]: null,
    [ENROLLMENT_FIELD.FASTING_GLUCOSE_MG_DL]: 112,
    [ENROLLMENT_FIELD.FASTING_GLUCOSE_TEST_DATE]: '2024-12-10',
    [ENROLLMENT_FIELD.ORAL_GLUCOSE_TOLERANCE_MG_DL]: null,
    [ENROLLMENT_FIELD.ORAL_GLUCOSE_TOLERANCE_TEST_DATE]: null,
    [ENROLLMENT_FIELD.BLOOD_TEST_SOURCE]: RESULT_SOURCE.LAB,
    [ENROLLMENT_FIELD.GESTATIONAL_DIABETES_HISTORY]: false,
    [ENROLLMENT_FIELD.RISK_TEST_POSITIVE]: false,
    [ENROLLMENT_FIELD.DIABETES_DIAGNOSED]: false,
    [ENROLLMENT_FIELD.PREGNANT]: false,
    [ENROLLMENT_FIELD.MEDICARE_PART_B]: false,
    [ENROLLMENT_FIELD.END_STAGE_RENAL_DISEASE]: false,
    [ENROLLMENT_FIELD.PRIOR_MDPP]: false,
    ...overrides,
  };
}

// No blood test on record: eligible for the DPRP only through the risk test or gestational diabetes.
export const NO_BLOOD_TEST: Answers = {
  [ENROLLMENT_FIELD.FASTING_GLUCOSE_MG_DL]: null,
  [ENROLLMENT_FIELD.FASTING_GLUCOSE_TEST_DATE]: null,
  [ENROLLMENT_FIELD.BLOOD_TEST_SOURCE]: null,
};

export function buildSession(sessionDate: PlainDate, weightPounds: number | null, activityMinutes = 0, isMakeUp = false): Answers {
  return {
    [S.SESSION_DATE]: sessionDate,
    [S.IS_MAKE_UP]: isMakeUp,
    [S.DELIVERY_MODE]: DELIVERY_MODE.IN_PERSON,
    [S.WEIGHT_REPORTED]: weightPounds !== null,
    [S.WEIGHT_POUNDS]: weightPounds,
    [S.ACTIVITY_MINUTES]: activityMinutes,
  };
}

// Sessions on the given day offsets from a start date, with weight falling evenly from `fromPounds` to `toPounds`.
export function buildSessions(start: string, dayOffsets: readonly number[], fromPounds: number, toPounds: number, activityMinutes = 0): Answers[] {
  const begin = toPlainDate(start);
  const step = dayOffsets.length > 1 ? (fromPounds - toPounds) / (dayOffsets.length - 1) : 0;
  return dayOffsets.map((offset, index) => buildSession(resolveDaysLater(begin, offset), Math.round((fromPounds - step * index) * 10) / 10, activityMinutes));
}

export interface ParticipantCase {
  readonly cohort: EntityRecord;
  readonly participant: EntityRecord;
  readonly entries: readonly StreamEntry[];
}

export interface ParticipantOverrides {
  readonly enrollment?: Answers;
  readonly finalA1c?: A1cResult;
  readonly ineligibleSince?: { readonly event: ValueOf<typeof INELIGIBILITY_EVENT>; readonly date: PlainDate };
}

export function buildParticipant(code: string, cohort: EntityRecord, sessions: readonly Answers[], overrides: ParticipantOverrides = {}): ParticipantCase {
  const participantId = toEntityId(`participant-${code}`);
  const entry = (streamId: string, index: number, date: string, values: Answers): StreamEntry => ({
    entryId: toEntryId(`${code}-${streamId}-${index}`),
    streamId,
    entityId: participantId,
    date: toPlainDate(date),
    authorId: DATA_SPECIALIST_ID,
    values,
    status: null,
    history: [],
  });
  const { finalA1c, ineligibleSince } = overrides;
  return {
    cohort,
    participant: {
      entityId: participantId,
      kind: toDefinitionId(PROGRAM_ENTITY.PARTICIPANT),
      tenantId: ORGANIZATION_ID,
      parentId: cohort.entityId,
      values: { [PARTICIPANT_FIELD.CODE]: code, [PARTICIPANT_FIELD.COACH_CODE]: 'COACH1', ...(overrides.enrollment ?? buildEnrollment()) },
    },
    entries: [
      ...sessions.map((session, index) => entry(PROGRAM_STREAM.SESSION, index, String(session[S.SESSION_DATE]), session)),
      ...(finalA1c
        ? [entry(PROGRAM_STREAM.A1C_RESULT, 0, finalA1c.reportedDate, { [A1C_RESULT_FIELD.PERCENT]: finalA1c.percent, [A1C_RESULT_FIELD.TEST_DATE]: finalA1c.testDate, [A1C_RESULT_FIELD.REPORTED_DATE]: finalA1c.reportedDate })]
        : []),
      ...(ineligibleSince ? [entry(PROGRAM_STREAM.RECODE, 0, ineligibleSince.date, { [RECODE_FIELD.EVENT]: ineligibleSince.event, [RECODE_FIELD.DATE]: ineligibleSince.date })] : []),
    ],
  };
}

// 16 weekly Core sessions, then one a month in months 7-12: the schedule the standard requires an organization to offer.
export const FULL_SCHEDULE: readonly number[] = [...Array.from({ length: 16 }, (_, week) => week * 7), 183, 213, 244, 274, 305, 335];

export function buildOrganization(cohorts: readonly EntityRecord[], participants: readonly ParticipantCase[], effectiveDate = '2024-01-01'): PlatformData {
  return {
    tenants: [
      {
        tenantId: ORGANIZATION_ID,
        kind: toDefinitionId(PROGRAM_TENANT_KIND.ORGANIZATION),
        parentId: null,
        name: 'Demo organization',
        values: { [ORGANIZATION_FIELD.CODE]: 'DEMO1', [ORGANIZATION_FIELD.DELIVERY_MODE]: DELIVERY_MODE.IN_PERSON, [ORGANIZATION_FIELD.EFFECTIVE_DATE]: effectiveDate },
      },
    ],
    actors: [{ actorId: DATA_SPECIALIST_ID, tenantId: ORGANIZATION_ID, name: 'Data specialist', values: { [STAFF_FIELD.POSITION]: STAFF_POSITION.DATA_SPECIALIST } }],
    assignments: [{ assignmentId: toAssignmentId('assignment'), actorId: DATA_SPECIALIST_ID, scope: { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: ORGANIZATION_ID }, active: true }],
    entities: [...cohorts, ...participants.map((participant) => participant.participant)],
    entries: participants.flatMap((participant) => participant.entries),
  };
}

// One participant's whole record, evaluated under the DPRP and the MDPP.
export function evaluateCase(participantCase: ParticipantCase, asOf = '2027-01-01'): ParticipantEvaluation {
  const data = buildOrganization([participantCase.cohort], [participantCase]);
  const [subject] = resolveProgramParticipants(data);
  if (!subject) throw new Error('The case has no participant with a cohort.');
  return evaluateParticipant(DPRP_STANDARD_2024, PROGRAM_CONFIGURATION, data, subject, toPlainDate(asOf));
}
