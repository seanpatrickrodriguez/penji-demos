import {
  A1C_RESULT_FIELD,
  ACCESS_SCOPE_KIND,
  COHORT_FIELD,
  COHORT_KIND,
  DELIVERY_MODE,
  ENROLLMENT_FIELD,
  HUB_FIELD,
  INELIGIBILITY_EVENT,
  ORGANIZATION_FIELD,
  PARTICIPANT_FIELD,
  PROGRAM_ENTITY,
  PROGRAM_ROLE,
  PROGRAM_STREAM,
  PROGRAM_TENANT_KIND,
  RECODE_FIELD,
  RESULT_SOURCE,
  SESSION_FIELD,
  STAFF_FIELD,
} from '@penji-demos/constants';
import { readDate, readNumber, resolveOpaqueId } from '@penji-demos/record-engine';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import {
  ActorId,
  ActorRecord,
  Answers,
  EntityRecord,
  PlainDate,
  PlatformData,
  RoleAssignment,
  StreamEntry,
  TenantId,
  toActorId,
  toAssignmentId,
  toDefinitionId,
  toEntityId,
  toEntryId,
  toTenantId,
} from '@penji-demos/types';
import { Random, createRandom } from './random';

// M0: a synthetic hub and the organization under it.  Every participant is
// invented; the records are shaped to exercise every part of the 2024 DPRP
// Standards and the MDPP: completers and early leavers, each outcome pathway,
// Medicare participants, and the data-entry mistakes a file review catches.
// Everything is written as the platform's records: tenants, staff and their
// role assignments, cohort and participant entities, and stream entries.

const E = ENROLLMENT_FIELD;
const S = SESSION_FIELD;

export const SYNTHETIC_HUB_ID: TenantId = toTenantId(resolveOpaqueId('t', 0));
export const SYNTHETIC_ORGANIZATION_ID: TenantId = toTenantId(resolveOpaqueId('t', 1));
// The organization's data specialist, who keeps its records; the hub's, who oversees every organization under the hub.
export const SYNTHETIC_DATA_SPECIALIST_ID: ActorId = toActorId(resolveOpaqueId('a', 0));
export const SYNTHETIC_HUB_DATA_SPECIALIST_ID: ActorId = toActorId(resolveOpaqueId('a', 1));
const COACH_IDS: readonly ActorId[] = [toActorId(resolveOpaqueId('a', 2)), toActorId(resolveOpaqueId('a', 3))];
const COACH_CODES = ['COACH01', 'COACH02'];

// The program calendar an organization offers: 16 weekly Core sessions, then one a month.
const CORE_DAYS: readonly number[] = Array.from({ length: 16 }, (_, week) => week * 7);
const MAINTENANCE_DAYS: readonly number[] = [182, 210, 245, 273, 301, 336];

type Archetype = 'activeLoser' | 'steadyAttender' | 'activeWalker' | 'a1cImprover' | 'noOutcome' | 'leftEarly' | 'leftMidway' | 'leftLate';

interface Plan {
  readonly archetype: Archetype;
  readonly lastDay: number;
  readonly lossPercent: number;
  readonly weeklyMinutes: number;
  readonly attendance: number;
}

const PLANS: Readonly<Record<Archetype, (random: Random) => Plan>> = {
  activeLoser: (random) => ({ archetype: 'activeLoser', lastDay: 364, lossPercent: random.between(5.5, 9), weeklyMinutes: random.between(90, 200), attendance: 0.92 }),
  steadyAttender: (random) => ({ archetype: 'steadyAttender', lastDay: 364, lossPercent: random.between(4.2, 4.9), weeklyMinutes: random.between(40, 110), attendance: 1 }),
  activeWalker: (random) => ({ archetype: 'activeWalker', lastDay: 364, lossPercent: random.between(4.1, 4.8), weeklyMinutes: random.between(170, 240), attendance: 0.7 }),
  a1cImprover: (random) => ({ archetype: 'a1cImprover', lastDay: 364, lossPercent: random.between(1, 3), weeklyMinutes: random.between(60, 140), attendance: 0.8 }),
  noOutcome: (random) => ({ archetype: 'noOutcome', lastDay: 364, lossPercent: random.between(0, 2.5), weeklyMinutes: random.between(20, 90), attendance: 0.75 }),
  leftEarly: (random) => ({ archetype: 'leftEarly', lastDay: random.integer(21, 70), lossPercent: random.between(0, 2), weeklyMinutes: random.between(20, 100), attendance: 0.9 }),
  leftMidway: (random) => ({ archetype: 'leftMidway', lastDay: random.integer(120, 200), lossPercent: random.between(1, 4), weeklyMinutes: random.between(40, 150), attendance: 0.85 }),
  leftLate: (random) => ({ archetype: 'leftLate', lastDay: random.integer(250, 270), lossPercent: random.between(2, 6), weeklyMinutes: random.between(60, 170), attendance: 0.85 }),
};

// How a cohort's participants divide among the archetypes; strong and weak cohorts differ.
const MIXES: Readonly<Record<'strong' | 'typical' | 'struggling', readonly Archetype[]>> = {
  strong: ['activeLoser', 'activeLoser', 'activeLoser', 'steadyAttender', 'activeWalker', 'a1cImprover', 'noOutcome', 'leftMidway', 'leftEarly', 'leftLate'],
  typical: ['activeLoser', 'activeLoser', 'steadyAttender', 'activeWalker', 'noOutcome', 'noOutcome', 'leftEarly', 'leftEarly', 'leftMidway', 'leftLate'],
  struggling: ['activeLoser', 'noOutcome', 'noOutcome', 'leftEarly', 'leftEarly', 'leftEarly', 'leftMidway', 'leftMidway', 'leftLate'],
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function buildSessions(random: Random, start: PlainDate, plan: Plan, baseline: number): Answers[] {
  const days = [...CORE_DAYS, ...MAINTENANCE_DAYS].filter((day) => day <= plan.lastDay);
  const attended = days.filter((day, index) => index === 0 || day === days[days.length - 1] || random.chance(plan.attendance));
  let previousDay = -7;
  return attended.map((day) => {
    // Weight falls toward the plan's loss over the first six months, then holds.
    const progress = Math.min(day / 182, 1);
    const weight = round1(baseline * (1 - (plan.lossPercent / 100) * progress) + random.between(-0.6, 0.6));
    const minutes = Math.max(0, Math.round((plan.weeklyMinutes * (day - previousDay)) / 7 / 5) * 5);
    previousDay = day;
    const session: Answers = {
      [S.SESSION_DATE]: resolveDaysLater(start, day),
      [S.IS_MAKE_UP]: false,
      [S.DELIVERY_MODE]: random.chance(0.85) ? DELIVERY_MODE.IN_PERSON : DELIVERY_MODE.DISTANCE_LEARNING,
      [S.WEIGHT_POUNDS]: random.chance(0.04) ? null : weight,
      [S.ACTIVITY_MINUTES]: random.chance(0.06) ? 0 : minutes,
    };
    return { ...session, [S.WEIGHT_REPORTED]: session[S.WEIGHT_POUNDS] !== null };
  });
}

function buildEnrollment(random: Random, start: PlainDate, archetype: Archetype): Answers {
  const enrolled = resolveDaysLater(start, -random.integer(3, 20));
  const basis = random.next();
  const tested = resolveDaysLater(enrolled, -random.integer(10, 200));
  const lab = random.chance(0.75) ? RESULT_SOURCE.LAB : RESULT_SOURCE.SELF_REPORTED;
  const byA1c = basis < 0.4 || archetype === 'a1cImprover';
  const byGlucose = !byA1c && basis < 0.65;
  const medicare = random.chance(0.25);
  return {
    [E.ENROLLMENT_DATE]: enrolled,
    [E.AGE_YEARS]: medicare ? random.integer(65, 79) : random.integer(28, 64),
    [E.HEIGHT_INCHES]: random.integer(60, 73),
    [E.IDENTIFIES_AS_ASIAN]: random.chance(0.2),
    [E.A1C_PERCENT]: byA1c ? round1(random.between(5.7, 6.4)) : null,
    [E.A1C_TEST_DATE]: byA1c ? tested : null,
    [E.A1C_REPORTED_DATE]: byA1c ? resolveDaysLater(start, random.integer(0, 10)) : null,
    [E.FASTING_GLUCOSE_MG_DL]: byGlucose ? random.integer(100, 125) : null,
    [E.FASTING_GLUCOSE_TEST_DATE]: byGlucose ? tested : null,
    [E.ORAL_GLUCOSE_TOLERANCE_MG_DL]: null,
    [E.ORAL_GLUCOSE_TOLERANCE_TEST_DATE]: null,
    [E.BLOOD_TEST_SOURCE]: byA1c || byGlucose ? lab : null,
    [E.GESTATIONAL_DIABETES_HISTORY]: !byA1c && !byGlucose && basis < 0.75,
    [E.RISK_TEST_POSITIVE]: !byA1c && !byGlucose,
    [E.DIABETES_DIAGNOSED]: false,
    [E.PREGNANT]: false,
    [E.MEDICARE_PART_B]: medicare,
    [E.END_STAGE_RENAL_DISEASE]: false,
    [E.PRIOR_MDPP]: false,
  };
}

interface CohortPlan {
  readonly code: string;
  readonly start: string;
  readonly mix: keyof typeof MIXES;
}

// Group cohorts every two to three months, starting before the earliest evaluation window.
const COHORTS: readonly CohortPlan[] = [
  { code: 'G2403', start: '2024-03-11', mix: 'struggling' },
  { code: 'G2406', start: '2024-06-03', mix: 'struggling' },
  { code: 'G2409', start: '2024-09-09', mix: 'typical' },
  { code: 'G2411', start: '2024-11-04', mix: 'typical' },
  { code: 'G2501', start: '2025-01-13', mix: 'strong' },
  { code: 'G2504', start: '2025-04-07', mix: 'strong' },
  { code: 'G2507', start: '2025-07-14', mix: 'typical' },
  { code: 'G2510', start: '2025-10-06', mix: 'struggling' },
];

// A participant while the seed is being written: the entity, and the values of each entry still to be recorded.
interface ParticipantDraft {
  readonly entity: EntityRecord;
  readonly coachId: ActorId;
  readonly sessions: readonly Answers[];
  readonly a1cResult: Answers | null;
  readonly recode: Answers | null;
}

export function buildSyntheticProgram(seed = 2024): PlatformData {
  const random = createRandom(seed);
  const cohorts: EntityRecord[] = [];
  const drafts: ParticipantDraft[] = [];
  let nextCode = 1001;
  COHORTS.forEach((plan, cohortIndex) => {
    const start = toPlainDate(plan.start);
    const cohort: EntityRecord = {
      entityId: toEntityId(resolveOpaqueId('c', cohortIndex)),
      kind: toDefinitionId(PROGRAM_ENTITY.COHORT),
      tenantId: SYNTHETIC_ORGANIZATION_ID,
      parentId: null,
      values: { [COHORT_FIELD.CODE]: plan.code, [COHORT_FIELD.KIND]: COHORT_KIND.GROUP, [COHORT_FIELD.START_DATE]: start },
    };
    cohorts.push(cohort);
    MIXES[plan.mix].forEach((archetype, index) => {
      const sessionPlan = PLANS[archetype](random);
      const enrollment = buildEnrollment(random, start, archetype);
      const height = readNumber(enrollment, E.HEIGHT_INCHES) ?? 0;
      const initialA1c = readNumber(enrollment, E.A1C_PERCENT);
      // Mostly BMI 26 to 38; one in ten under 25, who is not eligible unless Asian and at least 23.
      const targetBmi = random.chance(0.1) ? random.between(23.2, 24.6) : random.between(26, 38);
      const baseline = round1((targetBmi * height * height) / 703);
      const a1cImproves = archetype === 'a1cImprover' && initialA1c !== null && readDate(enrollment, E.A1C_TEST_DATE) !== null;
      const coach = index % 2;
      const sessions = buildSessions(random, start, sessionPlan, baseline);
      drafts.push({
        entity: {
          entityId: toEntityId(resolveOpaqueId('p', drafts.length)),
          kind: toDefinitionId(PROGRAM_ENTITY.PARTICIPANT),
          tenantId: SYNTHETIC_ORGANIZATION_ID,
          parentId: cohort.entityId,
          values: { [PARTICIPANT_FIELD.CODE]: `P${nextCode++}`, [PARTICIPANT_FIELD.COACH_CODE]: COACH_CODES[coach] ?? '', ...enrollment },
        },
        coachId: COACH_IDS[coach] ?? SYNTHETIC_DATA_SPECIALIST_ID,
        sessions,
        a1cResult: a1cImproves
          ? {
              [A1C_RESULT_FIELD.PERCENT]: round1((initialA1c ?? 6) - random.between(0.2, 0.5)),
              [A1C_RESULT_FIELD.TEST_DATE]: resolveDaysLater(start, 300),
              [A1C_RESULT_FIELD.REPORTED_DATE]: resolveDaysLater(start, 305),
            }
          : null,
        recode: null,
      });
    });
  });
  return resolveRecords(cohorts, plantFileReviewCases(drafts));
}

// Mistakes a coach could make, each placed on a different participant so every rule has a real case.
function plantFileReviewCases(drafts: readonly ParticipantDraft[]): readonly ParticipantDraft[] {
  const planted = [...drafts];
  const edit = (index: number, change: (draft: ParticipantDraft) => ParticipantDraft) => {
    const draft = planted[index];
    if (draft) planted[index] = change(draft);
  };
  const editSessions = (index: number, change: (sessions: readonly Answers[]) => readonly Answers[]) => edit(index, (draft) => ({ ...draft, sessions: change(draft.sessions) }));
  const weightOf = (session: Answers) => readNumber(session, S.WEIGHT_POUNDS);
  const dateOf = (session: Answers | undefined) => (session ? readDate(session, S.SESSION_DATE) : null);
  // A weight typed with an extra digit.
  editSessions(21, (sessions) => sessions.map((session, at) => (at === 5 && weightOf(session) !== null ? { ...session, [S.WEIGHT_POUNDS]: round1((weightOf(session) ?? 0) * 10) } : session)));
  // A make-up held the same day as a regular session, with a different weight.
  editSessions(22, (sessions) => {
    const regular = sessions[6];
    const weight = regular ? weightOf(regular) : null;
    return regular && weight !== null ? [...sessions, { ...regular, [S.IS_MAKE_UP]: true, [S.WEIGHT_POUNDS]: round1(weight - 2.4) }] : sessions;
  });
  // The same regular session entered twice.
  editSessions(30, (sessions) => {
    const repeated = sessions[3];
    return repeated ? [...sessions, repeated] : sessions;
  });
  // A sudden jump in weight that needs confirming.
  editSessions(31, (sessions) => sessions.map((session, at) => (at === 8 && weightOf(session) !== null ? { ...session, [S.WEIGHT_POUNDS]: round1((weightOf(session) ?? 0) * 1.14) } : session)));
  // A session recorded after the program year.
  editSessions(40, (sessions) => {
    const last = sessions[sessions.length - 1];
    const date = dateOf(last);
    return last && date ? [...sessions, { ...last, [S.SESSION_DATE]: resolveDaysLater(date, 40) }] : sessions;
  });
  // Joined a group three weeks late.
  editSessions(41, (sessions) => sessions.slice(3));
  // Recoded ineligible after a type 2 diabetes diagnosis.
  edit(42, (draft) => ({
    ...draft,
    recode: { [RECODE_FIELD.EVENT]: INELIGIBILITY_EVENT.TYPE_2_DIABETES, [RECODE_FIELD.DATE]: resolveDaysLater(dateOf(draft.sessions[0]) ?? toPlainDate('2025-01-01'), 120) },
  }));
  // A Medicare participant with a self-reported fasting glucose of 105: eligible for the DPRP, not the MDPP.
  edit(23, (draft) => {
    const values = draft.entity.values;
    return {
      ...draft,
      entity: {
        ...draft.entity,
        values: {
          ...values,
          [E.MEDICARE_PART_B]: true,
          [E.AGE_YEARS]: 68,
          [E.A1C_PERCENT]: null,
          [E.A1C_TEST_DATE]: null,
          [E.A1C_REPORTED_DATE]: null,
          [E.FASTING_GLUCOSE_MG_DL]: 105,
          [E.FASTING_GLUCOSE_TEST_DATE]: values[E.A1C_TEST_DATE] ?? values[E.FASTING_GLUCOSE_TEST_DATE] ?? values[E.ENROLLMENT_DATE] ?? null,
          [E.BLOOD_TEST_SOURCE]: RESULT_SOURCE.SELF_REPORTED,
          [E.GESTATIONAL_DIABETES_HISTORY]: false,
          [E.RISK_TEST_POSITIVE]: false,
        },
      },
    };
  });
  return planted;
}

// The finished records: tenants, staff and their assignments, the entities, and every draft entry recorded in a stream.
function resolveRecords(cohorts: readonly EntityRecord[], drafts: readonly ParticipantDraft[]): PlatformData {
  let entryCount = 0;
  const entry = (draft: ParticipantDraft, streamId: string, date: PlainDate | null, authorId: ActorId, values: Answers): readonly StreamEntry[] =>
    date ? [{ entryId: toEntryId(resolveOpaqueId('e', entryCount++)), streamId, entityId: draft.entity.entityId, date, authorId, values, status: null, history: [] }] : [];
  const entries = drafts.flatMap((draft) => [
    ...draft.sessions.flatMap((session) => entry(draft, PROGRAM_STREAM.SESSION, readDate(session, S.SESSION_DATE), draft.coachId, session)),
    ...(draft.a1cResult ? entry(draft, PROGRAM_STREAM.A1C_RESULT, readDate(draft.a1cResult, A1C_RESULT_FIELD.REPORTED_DATE), SYNTHETIC_DATA_SPECIALIST_ID, draft.a1cResult) : []),
    ...(draft.recode ? entry(draft, PROGRAM_STREAM.RECODE, readDate(draft.recode, RECODE_FIELD.DATE), SYNTHETIC_DATA_SPECIALIST_ID, draft.recode) : []),
  ]);
  const actors: readonly ActorRecord[] = [
    { actorId: SYNTHETIC_DATA_SPECIALIST_ID, tenantId: SYNTHETIC_ORGANIZATION_ID, name: 'Organization data specialist', values: { [STAFF_FIELD.TITLE]: 'Data specialist' } },
    { actorId: SYNTHETIC_HUB_DATA_SPECIALIST_ID, tenantId: SYNTHETIC_HUB_ID, name: 'Hub data specialist', values: { [STAFF_FIELD.TITLE]: 'Hub data specialist' } },
    ...COACH_IDS.map((actorId, index) => ({ actorId, tenantId: SYNTHETIC_ORGANIZATION_ID, name: `Coach ${index + 1}`, values: { [STAFF_FIELD.TITLE]: 'Lifestyle coach' } })),
  ];
  let assignmentCount = 0;
  const assignment = (actorId: ActorId, roleId: string, scope: RoleAssignment['scope']): RoleAssignment => ({ assignmentId: toAssignmentId(resolveOpaqueId('s', assignmentCount++)), actorId, roleId, scope, active: true });
  const assignments: readonly RoleAssignment[] = [
    assignment(SYNTHETIC_DATA_SPECIALIST_ID, PROGRAM_ROLE.DATA_SPECIALIST, { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: SYNTHETIC_ORGANIZATION_ID }),
    assignment(SYNTHETIC_HUB_DATA_SPECIALIST_ID, PROGRAM_ROLE.DATA_SPECIALIST, { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: SYNTHETIC_HUB_ID }),
    ...cohorts.flatMap((cohort) => COACH_IDS.map((actorId) => assignment(actorId, PROGRAM_ROLE.COACH, { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: cohort.entityId }))),
  ];
  return {
    tenants: [
      { tenantId: SYNTHETIC_HUB_ID, kind: toDefinitionId(PROGRAM_TENANT_KIND.HUB), parentId: null, name: 'Island Prevention Network (synthetic)', values: { [HUB_FIELD.REGION]: 'Pacific' } },
      {
        tenantId: SYNTHETIC_ORGANIZATION_ID,
        kind: toDefinitionId(PROGRAM_TENANT_KIND.ORGANIZATION),
        parentId: SYNTHETIC_HUB_ID,
        name: 'Harbor Community Health (synthetic)',
        values: { [ORGANIZATION_FIELD.CODE]: 'DEMO0001', [ORGANIZATION_FIELD.DELIVERY_MODE]: DELIVERY_MODE.IN_PERSON, [ORGANIZATION_FIELD.EFFECTIVE_DATE]: toPlainDate('2023-07-01') },
      },
    ],
    actors,
    assignments,
    entities: [...cohorts, ...drafts.map((draft) => draft.entity)],
    entries,
  };
}
