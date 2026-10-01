import { isBefore, isOnOrAfter, resolveFirstOfMonth, resolveMonthsLater } from '@penji-demos/time';
import { CohortRecord, CohortWindow, PlainDate, StandardDefinition } from '@penji-demos/types';

// The window of first-session dates an evaluation looks at, counted back from the submission due month.
export function resolveCohortWindow(standard: StandardDefinition, submissionMonth: PlainDate): CohortWindow {
  const dueMonth = resolveFirstOfMonth(submissionMonth);
  return {
    firstSessionOnOrAfter: resolveMonthsLater(dueMonth, -standard.evaluationCohort.maximumMonthsBeforeSubmission),
    firstSessionBefore: resolveMonthsLater(dueMonth, -standard.evaluationCohort.minimumMonthsBeforeSubmission),
  };
}

export function isInCohortWindow(cohort: CohortRecord, window: CohortWindow): boolean {
  return isOnOrAfter(cohort.firstSessionDate, window.firstSessionOnOrAfter) && isBefore(cohort.firstSessionDate, window.firstSessionBefore);
}
