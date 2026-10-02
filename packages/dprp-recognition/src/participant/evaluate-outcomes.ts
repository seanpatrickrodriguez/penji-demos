import { ENROLLMENT_FIELD } from '@penji-demos/constants';
import { readDate, readNumber } from '@penji-demos/record-engine';
import { calculateDaysBetween, resolveProgramMonth } from '@penji-demos/time';
import { Answers, PlainDate } from '@penji-demos/types';
import { OutcomePathwayDefinition, RecognitionStandardDefinition } from '@penji-demos/dprp-standard';
import { A1cResult, ActivitySummary, OutcomeResult, ProgramSession, WeightChange } from '../recognition-evaluation';

interface OutcomeEvidence {
  readonly weightChange: WeightChange | null;
  readonly activity: ActivitySummary;
  readonly sessionsAttended: number;
  readonly a1cReductionPoints: number | null;
  readonly a1cDetail: string;
}

// The A1C reduction a participant can claim, or null with the reason it cannot be used.
export function calculateA1cReduction(
  standard: RecognitionStandardDefinition,
  enrollment: Answers,
  final: A1cResult | null,
  cohortStart: PlainDate,
  counted: readonly ProgramSession[],
): { readonly points: number | null; readonly detail: string } {
  const initialPercent = readNumber(enrollment, ENROLLMENT_FIELD.A1C_PERCENT);
  const initialTested = readDate(enrollment, ENROLLMENT_FIELD.A1C_TEST_DATE);
  const initialReported = readDate(enrollment, ENROLLMENT_FIELD.A1C_REPORTED_DATE);
  const firstAttended = counted[0]?.sessionDate;
  const { initialRange: range, initialTestedWithinDaysBeforeFirstSession: testDays, initialReportedWithinDaysOfFirstSession: reportDays, finalTestProgramMonths: months } = standard.a1cOutcome;
  if (initialPercent === null || !initialTested || !initialReported || !final || !firstAttended) return { points: null, detail: 'No initial and final A1C pair' };
  if (initialPercent < range.min || initialPercent > range.max) return { points: null, detail: `Initial A1C ${initialPercent} is outside ${range.min}-${range.max}` };
  const testAge = calculateDaysBetween(initialTested, firstAttended);
  if (testAge < 0 || testAge > testDays) return { points: null, detail: 'Initial A1C was not tested within the year before the first session' };
  const initial = { percent: initialPercent, reportedDate: initialReported };
  if (calculateDaysBetween(firstAttended, initial.reportedDate) > reportDays) return { points: null, detail: `Initial A1C was reported more than ${reportDays} days after the first session` };
  const finalMonth = resolveProgramMonth(cohortStart, final.testDate);
  if (finalMonth < months.min || finalMonth > months.max) return { points: null, detail: `Final A1C was tested in program month ${finalMonth}, outside months ${months.min}-${months.max}` };
  const points = Math.round((initial.percent - final.percent) * 10) / 10;
  return { points, detail: `${initial.percent} to ${final.percent}` };
}

// A pathway is met when every threshold it sets is reached.  A threshold left
// null is not part of that pathway; a measure with no data never meets one.
export function evaluateOutcomePathway(pathway: OutcomePathwayDefinition, evidence: OutcomeEvidence): OutcomeResult {
  const checks: { met: boolean; detail: string }[] = [];
  const loss = evidence.weightChange?.lossPercent ?? null;
  if (pathway.minimumWeightLossPercent !== null) {
    checks.push({ met: loss !== null && loss >= pathway.minimumWeightLossPercent, detail: loss === null ? 'no first and last weight' : `${loss.toFixed(1)}% weight loss` });
  }
  if (pathway.minimumWeeklyActivityMinutes !== null) {
    const mean = evidence.activity.weeklyMeanMinutes;
    checks.push({ met: mean !== null && mean >= pathway.minimumWeeklyActivityMinutes, detail: mean === null ? 'no activity reported' : `${Math.round(mean)} minutes a week on average` });
  }
  if (pathway.minimumActivitySessions !== null) {
    checks.push({ met: evidence.activity.reportingSessions >= pathway.minimumActivitySessions, detail: `${evidence.activity.reportingSessions} sessions with activity` });
  }
  if (pathway.minimumSessionsAttended !== null) {
    checks.push({ met: evidence.sessionsAttended >= pathway.minimumSessionsAttended, detail: `${evidence.sessionsAttended} sessions attended` });
  }
  if (pathway.minimumA1cReductionPoints !== null) {
    const points = evidence.a1cReductionPoints;
    checks.push({
      met: points !== null && points >= pathway.minimumA1cReductionPoints,
      detail: points === null ? evidence.a1cDetail : `A1C ${evidence.a1cDetail}, down ${points.toFixed(1)} points`,
    });
  }
  return {
    pathway: pathway.pathway,
    label: pathway.label,
    met: checks.length > 0 && checks.every((check) => check.met),
    detail: checks.map((check) => check.detail).join('; '),
  };
}

export function evaluateOutcomes(standard: RecognitionStandardDefinition, evidence: OutcomeEvidence): readonly OutcomeResult[] {
  return standard.outcomePathways.map((pathway) => evaluateOutcomePathway(pathway, evidence));
}
