// How a requirement compares a measured value with its threshold.
export const COMPARATOR = {
  AT_LEAST: 'atLeast',
  AT_MOST: 'atMost',
} as const;

// What a requirement result can be.  A metric with no data is UNMEASURED,
// never read as a measured zero.  A requirement that runs only after others
// hold is NOT_EVALUATED until they do.
export const REQUIREMENT_OUTCOME = {
  MET: 'met',
  NOT_MET: 'notMet',
  UNMEASURED: 'unmeasured',
  NOT_EVALUATED: 'notEvaluated',
} as const;
