import { CALENDAR } from '@penji-demos/constants';
import { calculateDaysBetween } from '@penji-demos/time';
import { ActivitySummary, ProgramSession, WeightChange } from '../recognition-evaluation';

// First and last reported weights among the counted sessions, and the percent lost between them.
export function calculateWeightChange(counted: readonly ProgramSession[]): WeightChange | null {
  const weighed = counted.filter((session): session is ProgramSession & { weightPounds: number } => session.weightPounds !== null);
  const first = weighed[0];
  const last = weighed[weighed.length - 1];
  if (!first || !last || first === last) return null;
  return {
    firstPounds: first.weightPounds,
    firstDate: first.sessionDate,
    lastPounds: last.weightPounds,
    lastDate: last.sessionDate,
    lossPercent: ((first.weightPounds - last.weightPounds) / first.weightPounds) * 100,
  };
}

// Each session's minutes as a weekly rate over the days since the previous
// session (a week for the first), averaged over the sessions that reported minutes.
export function calculateActivity(counted: readonly ProgramSession[]): ActivitySummary {
  const rates: number[] = [];
  counted.forEach((session, index) => {
    if (session.activityMinutes <= 0) return;
    const previous = counted[index - 1];
    const days = previous ? Math.max(calculateDaysBetween(previous.sessionDate, session.sessionDate), 1) : CALENDAR.DAYS_PER_WEEK;
    rates.push((session.activityMinutes / days) * CALENDAR.DAYS_PER_WEEK);
  });
  return {
    reportingSessions: rates.length,
    weeklyMeanMinutes: rates.length === 0 ? null : rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
  };
}
