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

// Where the platform keeps its records in Firestore: each tenant a document,
// and every record a tenant keeps in a collection under it, so a record's
// path names the tenant it belongs to.
export const STORAGE_COLLECTION = {
  TENANTS: 'tenants',
  ENTITIES: 'entities',
} as const;

// The fields a stored record carries.  `line` is the record's own ID and its
// ancestors', nearest first: a tenant's line climbs the tenant tree, an
// entity's climbs the entity tree.  Only the server writes it.
export const STORED_FIELD = {
  KIND: 'kind',
  NAME: 'name',
  PARENT_ID: 'parentId',
  LINE: 'line',
  VALUES: 'values',
} as const;

// The custom claims on a person's sign-in token, set by the server from their
// staff record and assignments: the roles their record gives them, and the
// tenants and entities their active assignments cover.
export const TOKEN_CLAIM = {
  ROLES: 'roles',
  TENANT_SCOPES: 'tenantScopes',
  ENTITY_SCOPES: 'entityScopes',
} as const;

// What a request to the database asks to do.
export const STORAGE_OPERATION = {
  GET: 'get',
  LIST: 'list',
  UPDATE: 'update',
} as const;

// The part of the security rules that decides a request, checked in this order.
export const RULE_CLAUSE = {
  SIGNED_IN: 'signedIn',
  SCOPE: 'scope',
  LIST_SCOPE: 'listScope',
  RECORD_EXISTS: 'recordExists',
  PROTECTED_FIELD: 'protectedField',
  PERMISSION: 'permission',
  VALUES: 'values',
} as const;

// The longest text a stored answer may hold when its form sets no limit.
export const STORED_TEXT_LIMIT = 200;

// Where a part of the generated security rules comes from.
export const RULES_ORIGIN = {
  // Written once in the engine, the same for every product.
  PLATFORM: 'platform',
  // Generated from a product's configuration.
  CONFIGURATION: 'configuration',
} as const;
