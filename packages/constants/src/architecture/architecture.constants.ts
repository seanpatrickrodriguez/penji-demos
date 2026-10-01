// The four MOF layers every definition and record in this repo belongs to.
// M3 says what a definition is, M2 what a kind of definition holds, M1 is a
// definition written in that shape (the 2024 DPRP Standards), M0 is the data.
export const MOF_LAYER = {
  META_METAMODEL: 'M3',
  METAMODEL: 'M2',
  MODEL: 'M1',
  INSTANCE: 'M0',
} as const;

export const CALENDAR = {
  DAYS_PER_WEEK: 7,
} as const;

// Review policy for records, separate from the standard: how large a change in
// weight between sessions is flagged for a person to confirm.  The DPRP uses its
// own statistical methods to find outliers; this flag catches them earlier.
export const RECORD_REVIEW = {
  WEIGHT_CHANGE_TO_CONFIRM_PERCENT: 10,
} as const;

// The kinds of definition the platform knows.  Adding a kind is an M3 change.
export const DEFINITION_KIND = {
  STANDARD: 'standard',
  ACCESS_POLICY: 'accessPolicy',
  WORKFLOW: 'workflow',
  DATA_ELEMENT: 'dataElement',
  FORM: 'form',
} as const;
