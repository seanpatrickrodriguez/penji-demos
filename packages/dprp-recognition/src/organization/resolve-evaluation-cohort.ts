import { isBefore, isOnOrAfter, resolveFirstOfMonth, resolveMonthsLater } from '@penji-demos/time';
import { CohortWindow, PlainDate, RecognitionStandardDefinition } from '@penji-demos/types';

// The window of first-session dates an evaluation looks at, counted back from the submission due month.
export function resolveCohortWindow(standard: RecognitionStandardDefinition, submissionMonth: PlainDate): CohortWindow {
  const dueMonth = resolveFirstOfMonth(submissionMonth);
  return {
    firstSessionOnOrAfter: resolveMonthsLater(dueMonth, -standard.evaluationCohort.maximumMonthsBeforeSubmission),
    firstSessionBefore: resolveMonthsLater(dueMonth, -standard.evaluationCohort.minimumMonthsBeforeSubmission),
  };
}

export function isInCohortWindow(cohortStart: PlainDate, window: CohortWindow): boolean {
  return isOnOrAfter(cohortStart, window.firstSessionOnOrAfter) && isBefore(cohortStart, window.firstSessionBefore);
}
