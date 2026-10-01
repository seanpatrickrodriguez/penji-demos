import { CALENDAR, ISSUE_SEVERITY, PROGRAM_PHASE, RECORD_REVIEW } from '@penji-demos/constants';
import { calculateDaysBetween } from '@penji-demos/time';
import { CohortRecord, DataElementDefinition, ParticipantRecord, ProgramSession, RecordIssue, StandardDefinition } from '@penji-demos/types';

// Problems a DPRP file review would raise, found before the file is made.
export function validateParticipantRecord(
  standard: StandardDefinition,
  participant: ParticipantRecord,
  cohort: CohortRecord,
  sessions: readonly ProgramSession[],
  weightElement: DataElementDefinition,
): readonly RecordIssue[] {
  const issues: RecordIssue[] = [];
  const error = (message: string, sessionDate: ProgramSession['sessionDate'] | null = null) => issues.push({ severity: ISSUE_SEVERITY.ERROR, sessionDate, message });
  const warning = (message: string, sessionDate: ProgramSession['sessionDate'] | null = null) => issues.push({ severity: ISSUE_SEVERITY.WARNING, sessionDate, message });
  const range = weightElement.range;

  sessions.forEach((session, index) => {
    if (session.programMonth < 1) error(`Session is dated before the cohort's first session (${cohort.firstSessionDate}).`, session.sessionDate);
    if (session.phase === PROGRAM_PHASE.AFTER_PROGRAM_YEAR) warning('Session falls after the program year and is not evaluated.', session.sessionDate);
    if (session.weightPounds !== null && range && (session.weightPounds < range.min || session.weightPounds > range.max)) {
      error(`Weight ${session.weightPounds} lb is outside ${range.min}-${range.max}.  Confirm it, or report it as ${weightElement.notReported}.`, session.sessionDate);
    }
    if (session.activityMinutes < 0) error('Activity minutes cannot be negative.', session.sessionDate);

    const sameDay = sessions.filter((other) => other.sessionDate === session.sessionDate);
    if (sameDay.indexOf(session) === 1 && (sameDay.length > 2 || sameDay.every((other) => !other.isMakeUp) || sameDay.every((other) => other.isMakeUp))) {
      error('More than one record on this date.  Only one make-up session may share a date with a regular session.', session.sessionDate);
    }
    if (sameDay.length === 2 && sameDay.indexOf(session) === 1 && sameDay[0]?.weightPounds !== session.weightPounds) {
      error('A make-up session on the same date as a regular session must record the same weight.', session.sessionDate);
    }

    const previousMakeUp = sessions.slice(0, index).reverse().find((other) => other.isMakeUp);
    if (session.isMakeUp && previousMakeUp && calculateDaysBetween(previousMakeUp.sessionDate, session.sessionDate) < CALENDAR.DAYS_PER_WEEK) {
      warning(`Only ${standard.sessions.makeUpSessionsPerWeek} make-up session may be held per week.`, session.sessionDate);
    }

    const previousWeighed = sessions.slice(0, index).reverse().find((other) => other.weightPounds !== null);
    if (session.weightPounds !== null && previousWeighed?.weightPounds) {
      const change = (Math.abs(session.weightPounds - previousWeighed.weightPounds) / previousWeighed.weightPounds) * 100;
      if (change > RECORD_REVIEW.WEIGHT_CHANGE_TO_CONFIRM_PERCENT) warning(`Weight changed ${change.toFixed(0)}% since the previous weighed session.  Confirm it with the participant.`, session.sessionDate);
    }
  });

  const firstAttended = sessions[0];
  if (cohort.kind === 'group' && firstAttended && calculateDaysBetween(cohort.firstSessionDate, firstAttended.sessionDate) > standard.sessions.groupJoinWindowDays) {
    warning(`Joined ${calculateDaysBetween(cohort.firstSessionDate, firstAttended.sessionDate)} days after the group's first session; the Standards suggest an individual cohort.`, firstAttended.sessionDate);
  }
  if (participant.enrollment.heightInches <= 0) error('Height is missing.');
  return issues;
}
