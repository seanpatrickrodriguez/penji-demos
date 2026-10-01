import { COHORT_KIND, DELIVERY_MODE, INELIGIBILITY_EVENT, RESULT_SOURCE } from '@penji-demos/constants';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import {
  CohortRecord,
  Enrollment,
  OrganizationData,
  ParticipantRecord,
  PlainDate,
  SessionRecord,
  toCoachId,
  toCohortId,
  toOrganizationCode,
  toParticipantId,
} from '@penji-demos/types';
import { Random, createRandom } from './random';

// M0: a synthetic organization.  Every participant is invented; the records
// are shaped to exercise every part of the 2024 DPRP Standards and the MDPP:
// completers and early leavers, each outcome pathway, Medicare participants,
// and the data-entry mistakes a file review catches.

const ORGANIZATION_CODE = toOrganizationCode('DEMO0001');

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

function buildSessions(random: Random, start: PlainDate, plan: Plan, baseline: number): SessionRecord[] {
  const days = [...CORE_DAYS, ...MAINTENANCE_DAYS].filter((day) => day <= plan.lastDay);
  const attended = days.filter((day, index) => index === 0 || day === days[days.length - 1] || random.chance(plan.attendance));
  let previousDay = -7;
  return attended.map((day) => {
    // Weight falls toward the plan's loss over the first six months, then holds.
    const progress = Math.min(day / 182, 1);
    const weight = round1(baseline * (1 - (plan.lossPercent / 100) * progress) + random.between(-0.6, 0.6));
    const minutes = Math.max(0, Math.round((plan.weeklyMinutes * (day - previousDay)) / 7 / 5) * 5);
    previousDay = day;
    return {
      sessionDate: resolveDaysLater(start, day),
      isMakeUp: false,
      deliveryMode: random.chance(0.85) ? DELIVERY_MODE.IN_PERSON : DELIVERY_MODE.DISTANCE_LEARNING,
      weightPounds: random.chance(0.04) ? null : weight,
      activityMinutes: random.chance(0.06) ? 0 : minutes,
    };
  });
}

function buildEnrollment(random: Random, start: PlainDate, archetype: Archetype): Enrollment {
  const enrolled = resolveDaysLater(start, -random.integer(3, 20));
  const basis = random.next();
  const tested = resolveDaysLater(enrolled, -random.integer(10, 200));
  const lab = random.chance(0.75) ? RESULT_SOURCE.LAB : RESULT_SOURCE.SELF_REPORTED;
  const byA1c = basis < 0.4 || archetype === 'a1cImprover';
  const byGlucose = !byA1c && basis < 0.65;
  const medicare = random.chance(0.25);
  return {
    enrollmentDate: enrolled,
    ageYears: medicare ? random.integer(65, 79) : random.integer(28, 64),
    heightInches: random.integer(60, 73),
    identifiesAsAsian: random.chance(0.2),
    a1cPercent: byA1c ? round1(random.between(5.7, 6.4)) : null,
    a1cTestDate: byA1c ? tested : null,
    a1cReportedDate: byA1c ? resolveDaysLater(start, random.integer(0, 10)) : null,
    fastingGlucoseMgDl: byGlucose ? random.integer(100, 125) : null,
    fastingGlucoseTestDate: byGlucose ? tested : null,
    oralGlucoseToleranceMgDl: null,
    oralGlucoseToleranceTestDate: null,
    bloodTestSource: byA1c || byGlucose ? lab : null,
    gestationalDiabetesHistory: !byA1c && !byGlucose && basis < 0.75,
    riskTestPositive: !byA1c && !byGlucose,
    diabetesDiagnosed: false,
    pregnant: false,
    medicarePartB: medicare,
    endStageRenalDisease: false,
    priorMdpp: false,
  };
}

interface CohortPlan {
  readonly id: string;
  readonly start: string;
  readonly mix: keyof typeof MIXES;
}

// Group cohorts every two to three months, starting before the earliest evaluation window.
const COHORTS: readonly CohortPlan[] = [
  { id: 'G2403', start: '2024-03-11', mix: 'struggling' },
  { id: 'G2406', start: '2024-06-03', mix: 'struggling' },
  { id: 'G2409', start: '2024-09-09', mix: 'typical' },
  { id: 'G2411', start: '2024-11-04', mix: 'typical' },
  { id: 'G2501', start: '2025-01-13', mix: 'strong' },
  { id: 'G2504', start: '2025-04-07', mix: 'strong' },
  { id: 'G2507', start: '2025-07-14', mix: 'typical' },
  { id: 'G2510', start: '2025-10-06', mix: 'struggling' },
];

export function buildSyntheticOrganization(seed = 2024): OrganizationData {
  const random = createRandom(seed);
  const cohorts: CohortRecord[] = [];
  const participants: ParticipantRecord[] = [];
  let nextId = 1001;

  for (const plan of COHORTS) {
    const start = toPlainDate(plan.start);
    const cohort: CohortRecord = { cohortId: toCohortId(plan.id), organizationCode: ORGANIZATION_CODE, kind: COHORT_KIND.GROUP, firstSessionDate: start };
    cohorts.push(cohort);
    MIXES[plan.mix].forEach((archetype, index) => {
      const sessionPlan = PLANS[archetype](random);
      const enrollment = buildEnrollment(random, start, archetype);
      // Mostly BMI 26 to 38; one in ten under 25, who is not eligible unless Asian and at least 23.
      const targetBmi = random.chance(0.1) ? random.between(23.2, 24.6) : random.between(26, 38);
      const baseline = round1((targetBmi * enrollment.heightInches * enrollment.heightInches) / 703);
      const a1cImproves = archetype === 'a1cImprover' && enrollment.a1cPercent !== null && enrollment.a1cTestDate !== null;
      participants.push({
        participantId: toParticipantId(`P${nextId++}`),
        cohortId: cohort.cohortId,
        coachId: toCoachId(index % 2 === 0 ? 'COACH01' : 'COACH02'),
        enrollment,
        sessions: buildSessions(random, start, sessionPlan, baseline),
        finalA1c: a1cImproves
          ? { percent: round1((enrollment.a1cPercent ?? 6) - random.between(0.2, 0.5)), testDate: resolveDaysLater(start, 300), reportedDate: resolveDaysLater(start, 305) }
          : null,
        ineligibleSince: null,
      });
    });
  }
  return plantFileReviewCases({ organization: { organizationCode: ORGANIZATION_CODE, name: 'Harbor Community Health (synthetic)', deliveryMode: DELIVERY_MODE.IN_PERSON, effectiveDate: toPlainDate('2023-07-01') }, cohorts, participants });
}

// Mistakes a coach could make, each placed on a different participant so every rule has a real case.
function plantFileReviewCases(data: OrganizationData): OrganizationData {
  const participants = [...data.participants];
  const edit = (index: number, change: (participant: ParticipantRecord) => ParticipantRecord) => {
    const participant = participants[index];
    if (participant) participants[index] = change(participant);
  };
  const editSessions = (index: number, change: (sessions: readonly SessionRecord[]) => readonly SessionRecord[]) => edit(index, (participant) => ({ ...participant, sessions: change(participant.sessions) }));

  // A weight typed with an extra digit.
  editSessions(21, (sessions) => sessions.map((session, at) => (at === 5 && session.weightPounds !== null ? { ...session, weightPounds: round1(session.weightPounds * 10) } : session)));
  // A make-up held the same day as a regular session, with a different weight.
  editSessions(22, (sessions) => {
    const regular = sessions[6];
    return regular && regular.weightPounds !== null ? [...sessions, { ...regular, isMakeUp: true, weightPounds: round1(regular.weightPounds - 2.4) }] : sessions;
  });
  // The same regular session entered twice.
  editSessions(30, (sessions) => {
    const repeated = sessions[3];
    return repeated ? [...sessions, repeated] : sessions;
  });
  // A sudden jump in weight that needs confirming.
  editSessions(31, (sessions) => sessions.map((session, at) => (at === 8 && session.weightPounds !== null ? { ...session, weightPounds: round1(session.weightPounds * 1.14) } : session)));
  // A session recorded after the program year.
  editSessions(40, (sessions) => {
    const last = sessions[sessions.length - 1];
    return last ? [...sessions, { ...last, sessionDate: resolveDaysLater(last.sessionDate, 40) }] : sessions;
  });
  // Joined a group three weeks late.
  editSessions(41, (sessions) => sessions.slice(3));
  // Recoded ineligible after a type 2 diabetes diagnosis.
  edit(42, (participant) => ({ ...participant, ineligibleSince: { event: INELIGIBILITY_EVENT.TYPE_2_DIABETES, date: resolveDaysLater(participant.sessions[0]?.sessionDate ?? toPlainDate('2025-01-01'), 120) } }));
  // A Medicare participant with a self-reported fasting glucose of 105: eligible for the DPRP, not the MDPP.
  edit(23, (participant) => ({
    ...participant,
    enrollment: {
      ...participant.enrollment,
      medicarePartB: true,
      ageYears: 68,
      a1cPercent: null,
      a1cTestDate: null,
      a1cReportedDate: null,
      fastingGlucoseMgDl: 105,
      fastingGlucoseTestDate: participant.enrollment.a1cTestDate ?? participant.enrollment.fastingGlucoseTestDate ?? participant.enrollment.enrollmentDate,
      bloodTestSource: RESULT_SOURCE.SELF_REPORTED,
      gestationalDiabetesHistory: false,
      riskTestPositive: false,
    },
  }));
  return { ...data, participants };
}
