// The fleet demo's fixed values: a tug and barge company, the shop that keeps
// its vessels running, and the want lists the crews send to that shop.

export const VESSEL_KIND = {
  TUG: 'tug',
  BARGE: 'barge',
} as const;

export const BARGE_CARGO = {
  SAND: 'sand',
  FUEL: 'fuel',
  PROPANE: 'propane',
  CONTAINERS: 'containers',
} as const;

export const TOILET_FLUSH = {
  SALTWATER: 'saltwater',
  FRESHWATER: 'freshwater',
} as const;

// Positions aboard a vessel and in the shop.
export const FLEET_POSITION = {
  CAPTAIN: 'captain',
  FIRST_MATE: 'firstMate',
  SECOND_MATE: 'secondMate',
  CHIEF_ENGINEER: 'chiefEngineer',
  ASSISTANT_ENGINEER: 'assistantEngineer',
  COOK: 'cook',
  TANKERMAN: 'tankerman',
  TANKERMAN_PIC: 'tankermanPic',
  SUPPLY_MANAGER: 'supplyManager',
  PORT_ENGINEER: 'portEngineer',
  OWNER_REPRESENTATIVE: 'ownerRepresentative',
  SENIOR_WELDER: 'seniorWelder',
  SENIOR_ELECTRICIAN: 'seniorElectrician',
} as const;

// Access roles.  A person's position decides which roles they hold.
export const FLEET_ROLE = {
  CREW_MEMBER: 'crewMember',
  SENDING_OFFICER: 'sendingOfficer',
  SHOP_STAFF: 'shopStaff',
  SUPPLY_MANAGER: 'supplyManager',
  PORT_ENGINEER: 'portEngineer',
  OWNER_REPRESENTATIVE: 'ownerRepresentative',
} as const;

export const FLEET_PERMISSION = {
  ADD_ITEM: 'addItem',
  REMOVE_ITEM: 'removeItem',
  SEND_LIST: 'sendList',
  ACKNOWLEDGE: 'acknowledge',
  STOCK: 'stock',
  BACK_ORDER: 'backOrder',
  REQUEST_APPROVAL: 'requestApproval',
  DECIDE: 'decide',
  CONFIRM_RECEIPT: 'confirmReceipt',
  EDIT_PROFILE: 'editProfile',
} as const;

// A want-list item's states, from the shop's existing supply process.
export const SUPPLY_STATUS = {
  NEW: 'new',
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged',
  APPROVAL_REQUEST: 'approvalRequest',
  APPROVED: 'approved',
  DENIED: 'denied',
  BACK_ORDERED: 'backOrdered',
  IN_LOCKER: 'inLocker',
  RECEIVED: 'received',
  NOT_RECEIVED: 'notReceived',
} as const;

// The steps between those states.
export const WANT_LIST_TRANSITION = {
  SEND: 'send',
  ACKNOWLEDGE: 'acknowledge',
  REQUEST_APPROVAL: 'requestApproval',
  APPROVE: 'approve',
  DENY: 'deny',
  BACK_ORDER: 'backOrder',
  STOCK: 'stock',
  RECEIVE: 'receive',
  REPORT_MISSING: 'reportMissing',
} as const;

export const SUPPLY_CATEGORY = {
  ENGINE: 'engine',
  FILTERS: 'filters',
  ELECTRICAL: 'electrical',
  ELECTRONICS: 'electronics',
  MOORING: 'mooring',
  SAFETY: 'safety',
  DECK: 'deck',
  GALLEY: 'galley',
  CLEANING: 'cleaning',
} as const;

// Fields on the fleet's records, for forms, conditions and rules.
export const VESSEL_FIELD = {
  NAME: 'name',
  KIND: 'kind',
  CARGO: 'cargo',
  IN_SERVICE: 'inService',
  MAIN_ENGINES: 'mainEngines',
  GENERATOR_ENGINES: 'generatorEngines',
  GENERATORS: 'generators',
  POTABLE_WATER_PUMP: 'potableWaterPump',
  POTABLE_WATER_GALLONS: 'potableWaterGallons',
  TOILET_FLUSH: 'toiletFlush',
  LAST_ANNUAL_INSPECTION: 'lastAnnualInspection',
  LAST_DRY_DOCK: 'lastDryDock',
  LAST_TANK_MAINTENANCE: 'lastTankMaintenance',
} as const;

export const WANT_ITEM_FIELD = {
  DESCRIPTION: 'description',
  CATEGORY: 'category',
  QUANTITY: 'quantity',
  UNIT_COST: 'unitCost',
  ESTIMATED_TOTAL: 'estimatedTotal',
  LIMITED: 'limited',
  STATUS: 'status',
  REQUESTED_BY: 'requestedBy',
  ADDED_DATE: 'addedDate',
} as const;

// Facts worked out for a vessel or an actor, alongside the record fields.
export const FLEET_FACT = {
  AS_OF_DATE: 'asOfDate',
  HAS_SENDING_OFFICER: 'hasSendingOfficer',
  ACTOR_ID: 'actorId',
  // The actor is aboard the vessel the record belongs to, on their rotation on.
  ON_THIS_VESSEL: 'onThisVessel',
  // The item's history holds an approval by the port engineer or the owner's representative.
  APPROVED: 'approved',
} as const;

export const FLEET_FORM = {
  VESSEL_PROFILE: 'vesselProfile',
  WANT_ITEM: 'wantItem',
} as const;

// The fleet's streams of dated entries on a vessel.
export const FLEET_STREAM = {
  WANT_LIST: 'wantList',
} as const;
