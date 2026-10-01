// The platform's own fixed values: the facts every record carries whatever
// it records, how an access grant is scoped, and how a fact is worked out.

// Facts the record engine supplies alongside a record's own values.
export const PLATFORM_FACT = {
  // The date a subject is evaluated on.
  AS_OF_DATE: 'asOfDate',
  // The person acting, when a grant or a guard is read.
  ACTOR_ID: 'actorId',
  // A stream entry's date, its workflow state and the person who added it.
  ENTRY_DATE: 'entryDate',
  ENTRY_STATUS: 'entryStatus',
  ENTRY_AUTHOR: 'entryAuthor',
} as const;

// Where a role assignment applies: a tenant and everything under it, or one
// entity and everything under it.
export const ACCESS_SCOPE_KIND = {
  TENANT: 'tenant',
  ENTITY: 'entity',
} as const;

// How a fact is worked out from records.
export const FACT_DERIVATION_KIND = {
  // A value on the entity's parent: a participant reads its cohort's start date.
  PARENT_VALUE: 'parentValue',
  // A value on the first entry of a stream that matches, in date order.
  FIRST_ENTRY_VALUE: 'firstEntryValue',
  // Whether a stream holds any entry that matches.
  ANY_ENTRY: 'anyEntry',
  // A calculation over facts worked out before it.
  CALCULATED: 'calculated',
  // Whether anyone on duty over the entity holds a permission.
  PERMISSION_HELD: 'permissionHeld',
  // Whether an entry's workflow has ever reached one of the named states.
  STATE_REACHED: 'stateReached',
} as const;
