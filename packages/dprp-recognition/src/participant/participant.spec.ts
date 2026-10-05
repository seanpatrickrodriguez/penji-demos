import { DPRP_ELIGIBILITY_BASIS, INELIGIBILITY_EVENT, OUTCOME_PATHWAY, PROGRAM_PHASE } from '@penji-demos/constants';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import { OutcomePathway } from '@penji-demos/dprp-standard';
import { ParticipantEvaluation } from '../recognition-evaluation';
import { describe, expect, it } from 'vitest';
import { DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { FULL_SCHEDULE, NO_BLOOD_TEST, buildCohort, buildEnrollment, buildParticipant, buildSession, buildSessions, evaluateCase } from '../testing/build-records';

const STANDARD = DPRP_STANDARD_2024;
const START = '2025-01-06';
const COHORT = buildCohort('C1', START);
const day = (offset: number) => resolveDaysLater(toPlainDate(START), offset);
const outcome = (evaluation: ParticipantEvaluation, pathway: OutcomePathway) => evaluation.outcomes.find((result) => result.pathway === pathway);

describe('program calendar', () => {
  it('places sessions in Core, Core Maintenance or after the program year', () => {
    const evaluation = evaluateCase(buildParticipant('P1', COHORT, buildSessions(START, [0, 180, 181, 364, 365], 200, 190)));
    // 2025-07-05 is month 6; 2025-07-06 starts month 7; day 365 is past the program year.
    expect(evaluation.sessions.map((session) => session.phase)).toEqual([
      PROGRAM_PHASE.CORE,
      PROGRAM_PHASE.CORE,
      PROGRAM_PHASE.CORE_MAINTENANCE,
      PROGRAM_PHASE.CORE_MAINTENANCE,
      PROGRAM_PHASE.AFTER_PROGRAM_YEAR,
    ]);
    expect(evaluation.sessionsAttended).toBe(4);
  });
});

describe('eligibility', () => {
  it('calculates BMI from enrollment height and the first session weight', () => {
    // 703 x 150 / 66^2 = 24.2: under 25, but at least the 23 that applies to Asian participants.
    const sessions = buildSessions(START, [0, 7], 150, 149);
    expect(evaluateCase(buildParticipant('P1', COHORT, sessions)).eligibility.met).toBe(false);
    const asian = buildParticipant('P2', COHORT, sessions, { enrollment: buildEnrollment({ identifiesAsAsian: true }) });
    expect(evaluateCase(asian).eligibility.met).toBe(true);
  });

  it('needs a basis for prediabetes and records which one', () => {
    const sessions = buildSessions(START, [0], 200, 200);
    const none = buildParticipant('P1', COHORT, sessions, { enrollment: buildEnrollment(NO_BLOOD_TEST) });
    expect(evaluateCase(none).eligibility.met).toBe(false);
    const riskTest = buildParticipant('P2', COHORT, sessions, { enrollment: buildEnrollment({ ...NO_BLOOD_TEST, riskTestPositive: true }) });
    expect(evaluateCase(riskTest).eligibility.basesMet).toEqual([DPRP_ELIGIBILITY_BASIS.RISK_TEST]);
  });

  it('counts a blood test only within a year before enrollment', () => {
    const sessions = buildSessions(START, [0], 200, 200);
    const stale = buildParticipant('P1', COHORT, sessions, { enrollment: buildEnrollment({ fastingGlucoseTestDate: toPlainDate('2023-12-01') }) });
    expect(evaluateCase(stale).eligibility.met).toBe(false);
  });

  it('drops a participant recoded as ineligible during the program', () => {
    const participant = buildParticipant('P1', COHORT, buildSessions(START, [0], 200, 200), { ineligibleSince: { event: INELIGIBILITY_EVENT.PREGNANCY, date: day(60) } });
    expect(evaluateCase(participant).eligibility.met).toBe(false);
  });
});

describe('completer', () => {
  const eightCore = Array.from({ length: 8 }, (_, week) => week * 7);
  // Nine months after 2025-01-06 is 2025-10-06, day 273.
  it('needs the last session on or after nine full months from the cohort start', () => {
    const early = evaluateCase(buildParticipant('P1', COHORT, buildSessions(START, [...eightCore, 272], 200, 195)));
    const onTime = evaluateCase(buildParticipant('P2', COHORT, buildSessions(START, [...eightCore, 273], 200, 195)));
    expect(early.completer.met).toBe(false);
    expect(onTime.completer.met).toBe(true);
    expect(onTime.completer.fullMonthsFirstToLast).toBe(STANDARD.completer.minimumFullMonthsFirstSessionToLast);
  });

  it('counts only Core-phase sessions toward the eight', () => {
    const sevenCore = Array.from({ length: 7 }, (_, week) => week * 7);
    const evaluation = evaluateCase(buildParticipant('P1', COHORT, buildSessions(START, [...sevenCore, 190, 280], 200, 195)));
    expect(evaluation.completer.corePhaseSessions).toBe(STANDARD.completer.minimumCorePhaseSessions - 1);
    expect(evaluation.completer.met).toBe(false);
  });
});

describe('risk-reduction outcomes', () => {
  it('reads weight loss from the first and last recorded weights, skipping unreported ones', () => {
    const sessions = [buildSession(day(0), null), ...buildSessions(START, [7, 300], 200, 189), buildSession(day(310), null)];
    const evaluation = evaluateCase(buildParticipant('P1', COHORT, sessions));
    expect(evaluation.weightChange?.lossPercent).toBeCloseTo(5.5);
    expect(outcome(evaluation, OUTCOME_PATHWAY.WEIGHT_LOSS)?.met).toBe(true);
  });

  it('accepts 4% loss with 17 sessions attended, and not with 16', () => {
    const seventeen = evaluateCase(buildParticipant('P1', COHORT, buildSessions(START, [...FULL_SCHEDULE.slice(0, 16), 300], 200, 191.8)));
    const sixteen = evaluateCase(buildParticipant('P2', COHORT, buildSessions(START, FULL_SCHEDULE.slice(0, 16), 200, 191.8)));
    expect(outcome(seventeen, OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ATTENDANCE)?.met).toBe(true);
    expect(outcome(sixteen, OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ATTENDANCE)?.met).toBe(false);
  });

  it('accepts 4% loss with 150 minutes a week over at least 8 sessions', () => {
    const weekly = Array.from({ length: 8 }, (_, week) => week * 7);
    const active = evaluateCase(buildParticipant('P1', COHORT, buildSessions(START, weekly, 200, 191.8, 150)));
    const short = evaluateCase(buildParticipant('P2', COHORT, buildSessions(START, weekly.slice(0, 7), 200, 191.8, 150)));
    const slow = evaluateCase(buildParticipant('P3', COHORT, buildSessions(START, weekly, 200, 191.8, 140)));
    expect(outcome(active, OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ACTIVITY)?.met).toBe(true);
    expect(outcome(short, OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ACTIVITY)?.met).toBe(false);
    expect(outcome(slow, OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ACTIVITY)?.met).toBe(false);
  });

  it('accepts a 0.2 point A1C reduction only with a timely initial test and a final test in months 9-12', () => {
    const sessions = buildSessions(START, [0, 7, 280], 200, 199);
    const initialA1c = { a1cPercent: 6.2, a1cTestDate: toPlainDate('2024-12-01'), a1cReportedDate: day(5) };
    const timely = buildParticipant('P1', COHORT, sessions, { enrollment: buildEnrollment(initialA1c), finalA1c: { percent: 6.0, testDate: day(280), reportedDate: day(281) } });
    const earlyFinal = buildParticipant('P2', COHORT, sessions, { enrollment: buildEnrollment(initialA1c), finalA1c: { percent: 6.0, testDate: day(200), reportedDate: day(201) } });
    expect(outcome(evaluateCase(timely), OUTCOME_PATHWAY.A1C_REDUCTION)?.met).toBe(true);
    expect(outcome(evaluateCase(earlyFinal), OUTCOME_PATHWAY.A1C_REDUCTION)?.met).toBe(false);
  });
});

describe('retention', () => {
  it('counts a participant retained at a month once they attend on or after its first day', () => {
    // Month 4 starts 2025-04-06 (day 90); month 7 starts 2025-07-06 (day 181).
    const evaluation = evaluateCase(buildParticipant('P1', COHORT, buildSessions(START, [0, 90, 180], 200, 198)));
    expect(evaluation.retainedAtProgramMonth).toEqual({ 4: true, 7: false, 10: false });
  });
});

describe('record rules', () => {
  const ruleIds = (sessions: ReturnType<typeof buildSessions>) =>
    evaluateCase(buildParticipant('P1', COHORT, sessions)).standards[0]?.findings.map((finding) => finding.ruleId);

  it('flags an impossible weight and two regular sessions on one date', () => {
    const ids = ruleIds([buildSession(day(0), 200), buildSession(day(7), 1999), buildSession(day(14), 199), buildSession(day(14), 199)]);
    expect(ids).toContain('dprp-weight-range');
    expect(ids).toContain('dprp-one-regular-session-per-date');
  });

  it('flags a make-up session recording a different weight on the same date as a regular session', () => {
    expect(ruleIds([buildSession(day(0), 200), buildSession(day(7), 199), buildSession(day(7), 197, 0, true)])).toContain('dprp-same-date-weight');
  });

  it('notes a session after the program year without blocking', () => {
    expect(ruleIds(buildSessions(START, [0, 7, 370], 200, 199))).toEqual(['dprp-session-within-program-year']);
  });
});
