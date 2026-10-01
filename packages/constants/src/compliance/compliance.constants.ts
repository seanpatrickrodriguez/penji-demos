// How serious a finding is.  An error blocks the workflow it belongs to, a
// warning asks for a person's attention, and info is for awareness.
export const VALIDATION_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// What a person can do with a finding: change the record, accept it as it is
// (with a reason), or defer it for later.
export const GUIDANCE_ACTION_TYPE = {
  CHANGE: 'change',
  ACCEPT: 'accept',
  DEFER: 'defer',
} as const;

// What a rule is checked against: the enrollment, each session, or the
// participant's whole record across time.
export const RULE_SCOPE = {
  ENROLLMENT: 'enrollment',
  SESSION: 'session',
  PARTICIPANT: 'participant',
} as const;

// The kinds of check a rule definition can declare.  Adding a kind is an M2 change.
export const RULE_CHECK_KIND = {
  RANGE: 'range',
  REQUIRED: 'required',
  REQUIRED_WHEN: 'requiredWhen',
  CONDITION: 'condition',
  SAME_DATE_VALUES_MATCH: 'sameDateValuesMatch',
  AT_MOST_PER_WINDOW: 'atMostPerWindow',
  WITHIN_DAYS_OF_ANCHOR: 'withinDaysOfAnchor',
  NOT_BEFORE_ANCHOR: 'notBeforeAnchor',
  CHANGE_AT_MOST: 'changeAtMost',
} as const;
