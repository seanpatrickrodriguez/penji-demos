import {
  ACCESS_SCOPE_KIND,
  BARGE_CARGO,
  COMPANY_FIELD,
  CREW_FIELD,
  FLEET_ENTITY,
  FLEET_PERMISSION,
  FLEET_POSITION,
  FLEET_ROLE,
  FLEET_STREAM,
  FLEET_TENANT_KIND,
  SUPPLY_CATEGORY,
  TOILET_FLUSH,
  VESSEL_FIELD,
  VESSEL_KIND,
  WANT_ITEM_FIELD,
  WANT_LIST_TRANSITION,
} from '@penji-demos/constants';
import { FLEET_CONFIGURATION } from '@penji-demos/fleet-configuration';
import { RecordChange, addEntry, applyEntryTransition, isPermittedOnRecord, readMember, resolveOpaqueId } from '@penji-demos/record-engine';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import {
  ActorId,
  ActorRecord,
  Answers,
  EntityRecord,
  PlainDate,
  PlatformData,
  RoleAssignment,
  TenantRecord,
  ValueOf,
  toActorId,
  toAssignmentId,
  toDefinitionId,
  toEntityId,
  toEntryId,
  toTenantId,
} from '@penji-demos/types';

// M0: a made-up tug and barge company and the shop that keeps its vessels
// running, written as the platform's records.  Every name is invented.  Crew
// are assigned to the vessel they rotate aboard, active while aboard; the
// shop's people are assigned over the company.  Every want-list item is added
// and moved through its workflow by the record engine, as the person the plan
// names, so the seed holds only what the access policy and the workflow allow,
// and each policy rule has a case that fires.

type FleetPosition = ValueOf<typeof FLEET_POSITION>;
type SupplyCategory = ValueOf<typeof SUPPLY_CATEGORY>;

// The date the fleet's records are read on.
export const FLEET_AS_OF: PlainDate = toPlainDate('2026-09-15');
const P = FLEET_POSITION;
const T = WANT_LIST_TRANSITION;
const V = VESSEL_FIELD;
const W = WANT_ITEM_FIELD;

export const FLEET_OWNER_ID = toTenantId('c7xq2m');
export const FLEET_SHOP_ID = toTenantId('c4hn8w');
const TENANTS: readonly TenantRecord[] = [
  { tenantId: FLEET_OWNER_ID, kind: toDefinitionId(FLEET_TENANT_KIND.COMPANY), parentId: null, name: 'Kestrel Tug & Barge', values: { [COMPANY_FIELD.HOME_PORT]: 'Kestrel Harbor' } },
  { tenantId: FLEET_SHOP_ID, kind: toDefinitionId(FLEET_TENANT_KIND.COMPANY), parentId: FLEET_OWNER_ID, name: 'Kestrel Marine Shop', values: { [COMPANY_FIELD.HOME_PORT]: 'Kestrel Harbor' } },
];

const date = (value: string): PlainDate => toPlainDate(value);

const vessel = (id: string, name: string, kind: ValueOf<typeof VESSEL_KIND>, cargo: ValueOf<typeof BARGE_CARGO> | null, inService: boolean, profile: Answers): EntityRecord => ({
  entityId: toEntityId(id),
  kind: toDefinitionId(FLEET_ENTITY.VESSEL),
  tenantId: FLEET_OWNER_ID,
  parentId: null,
  values: { [V.NAME]: name, [V.KIND]: kind, [V.CARGO]: cargo, [V.IN_SERVICE]: inService, ...profile },
});

const TUG_ENGINES = { [V.GENERATOR_ENGINES]: '2 × John Deere 4045', [V.GENERATORS]: '2 × 99 kW', [V.POTABLE_WATER_PUMP]: 'Centrifugal, 1 hp' };

export const FLEET_VESSELS = {
  TERN: vessel('v2k9fq', 'Tern', VESSEL_KIND.TUG, null, true, {
    ...TUG_ENGINES,
    [V.MAIN_ENGINES]: '2 × EMD 16-645',
    [V.POTABLE_WATER_GALLONS]: 1500,
    [V.TOILET_FLUSH]: TOILET_FLUSH.SALTWATER,
    [V.LAST_ANNUAL_INSPECTION]: date('2025-12-10'),
    [V.LAST_DRY_DOCK]: date('2023-04-02'),
  }),
  PETREL: vessel('v8m3za', 'Petrel', VESSEL_KIND.TUG, null, true, {
    ...TUG_ENGINES,
    [V.MAIN_ENGINES]: '2 × MTU 12V4000',
    [V.POTABLE_WATER_GALLONS]: 1200,
    [V.TOILET_FLUSH]: TOILET_FLUSH.FRESHWATER,
    [V.LAST_ANNUAL_INSPECTION]: date('2025-08-01'),
    [V.LAST_DRY_DOCK]: date('2021-03-15'),
  }),
  SHEARWATER: vessel('v5t7nc', 'Shearwater', VESSEL_KIND.TUG, null, true, {
    ...TUG_ENGINES,
    [V.POTABLE_WATER_GALLONS]: 1000,
    [V.LAST_ANNUAL_INSPECTION]: date('2025-09-30'),
    [V.LAST_DRY_DOCK]: date('2024-06-18'),
  }),
  KESTREL_201: vessel('v1q6rd', 'Kestrel 201', VESSEL_KIND.BARGE, BARGE_CARGO.SAND, true, {
    [V.LAST_DRY_DOCK]: date('2022-10-11'),
  }),
  KESTREL_305: vessel('v9w4hs', 'Kestrel 305', VESSEL_KIND.BARGE, BARGE_CARGO.FUEL, true, {
    [V.GENERATOR_ENGINES]: '1 × Cummins QSB',
    [V.GENERATORS]: '1 × 60 kW',
    [V.LAST_ANNUAL_INSPECTION]: date('2026-05-05'),
    [V.LAST_DRY_DOCK]: date('2023-01-24'),
    [V.LAST_TANK_MAINTENANCE]: date('2021-01-20'),
  }),
  KESTREL_410: vessel('v6c2jy', 'Kestrel 410', VESSEL_KIND.BARGE, BARGE_CARGO.PROPANE, true, {
    [V.GENERATOR_ENGINES]: '1 × Cummins QSB',
    [V.GENERATORS]: '1 × 60 kW',
    [V.LAST_ANNUAL_INSPECTION]: date('2026-03-01'),
    [V.LAST_DRY_DOCK]: date('2024-02-08'),
    [V.LAST_TANK_MAINTENANCE]: date('2016-05-02'),
  }),
  KESTREL_512: vessel('v3p8ue', 'Kestrel 512', VESSEL_KIND.BARGE, BARGE_CARGO.CONTAINERS, false, {}),
} satisfies Readonly<Record<string, EntityRecord>>;

const FIRST_NAMES = ['Leilani', 'Keoni', 'Malia', 'Sione', 'Tevita', 'Ana', 'Mateo', 'Noelani', 'Kai', 'Lani', 'Iosefa', 'Mele', 'Rafael', 'Grace', 'Daniel', 'Rosa', 'Kekoa', 'Tomas', 'Lose', 'Henry', 'Alana', 'Paulo', 'Kaimana', 'Joseph', 'Marisol'];
const LAST_NAMES = ['Akana', 'Fonoti', 'Santos', 'Mahoe', 'Tupou', 'Kealoha', 'Ramos', 'Faleolo', 'Nakamura', 'Pereira', 'Kahale', 'Taufa', 'Cabral', 'Lui', 'Moana', 'Ortiz', 'Palakiko', 'Silva', 'Tanaka', 'Vaifale', 'Keola', 'Baptiste', 'Navarro', 'Hoapili', 'Lemalu'];
const nameAt = (index: number) =>
  `${FIRST_NAMES[index % FIRST_NAMES.length] ?? ''} ${LAST_NAMES[(index * 7 + Math.floor(index / LAST_NAMES.length)) % LAST_NAMES.length] ?? ''}`;

// The roles each position holds.  Officers who send the list are crew members too.
const POSITION_ROLES: Readonly<Record<FleetPosition, readonly string[]>> = {
  [P.CAPTAIN]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [P.FIRST_MATE]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [P.SECOND_MATE]: [FLEET_ROLE.CREW_MEMBER],
  [P.CHIEF_ENGINEER]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [P.ASSISTANT_ENGINEER]: [FLEET_ROLE.CREW_MEMBER],
  [P.COOK]: [FLEET_ROLE.CREW_MEMBER],
  [P.TANKERMAN]: [FLEET_ROLE.CREW_MEMBER],
  [P.TANKERMAN_PIC]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [P.SUPPLY_MANAGER]: [FLEET_ROLE.SUPPLY_MANAGER],
  [P.PORT_ENGINEER]: [FLEET_ROLE.PORT_ENGINEER],
  [P.OWNER_REPRESENTATIVE]: [FLEET_ROLE.OWNER_REPRESENTATIVE],
  [P.SENIOR_WELDER]: [FLEET_ROLE.SHOP_STAFF],
  [P.SENIOR_ELECTRICIAN]: [FLEET_ROLE.SHOP_STAFF],
};

// Where a person works: the vessels they rotate aboard, and whether they are aboard now.  Shop staff work over the whole fleet.
interface Placement {
  readonly position: FleetPosition;
  readonly vessels: readonly EntityRecord[];
  readonly aboard: boolean;
}

const TUG_POSITIONS: readonly FleetPosition[] = [P.CAPTAIN, P.FIRST_MATE, P.SECOND_MATE, P.CHIEF_ENGINEER, P.ASSISTANT_ENGINEER, P.COOK];
const TUGS = [FLEET_VESSELS.TERN, FLEET_VESSELS.PETREL, FLEET_VESSELS.SHEARWATER];

// Twelve people rotate through each tug's six positions, one of each pair aboard at a time.
const tugCrews: readonly Placement[] = TUGS.flatMap((tug) => TUG_POSITIONS.flatMap((position) => [true, false].map((aboard) => ({ position, vessels: [tug], aboard }))));

// Tankermen rotate through the tank barges.  Both of the propane barge's tankermen in charge are off this rotation.
const tankermen: readonly Placement[] = [
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_305], aboard: true },
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_305], aboard: false },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_305], aboard: true },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_305], aboard: false },
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_410], aboard: false },
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_410], aboard: false },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_410], aboard: true },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_410], aboard: false },
];

const shop: readonly Placement[] = [P.SUPPLY_MANAGER, P.PORT_ENGINEER, P.OWNER_REPRESENTATIVE, P.SENIOR_WELDER, P.SENIOR_ELECTRICIAN].map((position) => ({
  position,
  vessels: [],
  aboard: false,
}));

const PLACEMENTS: readonly Placement[] = [...tugCrews, ...tankermen, ...shop];
const ACTORS: readonly ActorRecord[] = PLACEMENTS.map((placement, index) => ({
  actorId: toActorId(resolveOpaqueId('u', index)),
  tenantId: placement.vessels.length > 0 ? FLEET_OWNER_ID : FLEET_SHOP_ID,
  name: nameAt(index),
  values: { [CREW_FIELD.POSITION]: placement.position },
}));

let assignmentCount = 0;
const assignment = (actorId: ActorId, roleId: string, scope: RoleAssignment['scope'], active: boolean): RoleAssignment => ({
  assignmentId: toAssignmentId(resolveOpaqueId('s', assignmentCount++)),
  actorId,
  roleId,
  scope,
  active,
});
const ASSIGNMENTS: readonly RoleAssignment[] = PLACEMENTS.flatMap((placement, index) => {
  const actor = ACTORS[index];
  if (!actor) return [];
  const roles = POSITION_ROLES[placement.position];
  return placement.vessels.length > 0
    ? placement.vessels.flatMap((each) => roles.map((roleId) => assignment(actor.actorId, roleId, { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: each.entityId }, placement.aboard)))
    : roles.map((roleId) => assignment(actor.actorId, roleId, { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: FLEET_OWNER_ID }, true));
});

const positionOf = (actor: ActorRecord): FleetPosition | null => readMember(actor.values, CREW_FIELD.POSITION, FLEET_POSITION);
const isAboard = (actorId: ActorId, vesselEntity: EntityRecord): boolean =>
  ASSIGNMENTS.some((each) => each.actorId === actorId && each.active && each.scope.kind === ACCESS_SCOPE_KIND.ENTITY && each.scope.entityId === vesselEntity.entityId);

// Who takes a step: the person who added the item, an officer aboard who can
// send, or someone at the shop by position.
type Actor = 'requester' | 'sender' | FleetPosition;

interface PlannedStep {
  readonly transition: string;
  readonly by: Actor;
  readonly daysLater: number;
  readonly note?: string;
}

interface PlannedItem {
  readonly id: string;
  readonly vessel: EntityRecord;
  readonly requester: FleetPosition;
  readonly added: string;
  readonly description: string;
  readonly category: SupplyCategory;
  readonly quantity: number;
  readonly unitCost: number | null;
  readonly limited?: boolean;
  readonly steps: readonly PlannedStep[];
}

const sent = (daysLater = 1): PlannedStep => ({ transition: T.SEND, by: 'sender', daysLater });
const acknowledged = (daysLater = 2): PlannedStep => ({ transition: T.ACKNOWLEDGE, by: P.SUPPLY_MANAGER, daysLater });
const stocked = (daysLater = 3): PlannedStep => ({ transition: T.STOCK, by: P.SUPPLY_MANAGER, daysLater });
const received = (daysLater = 5): PlannedStep => ({ transition: T.RECEIVE, by: 'requester', daysLater });
const forApproval = (daysLater = 2): PlannedStep => ({ transition: T.REQUEST_APPROVAL, by: P.SUPPLY_MANAGER, daysLater });
const approved = (daysLater = 3): PlannedStep => ({ transition: T.APPROVE, by: P.PORT_ENGINEER, daysLater });

const MOORING_LINE = 'Mooring line, 8-strand, 2½ in × 600 ft';

const PLANNED_ITEMS: readonly PlannedItem[] = [
  // Tern: three mooring line requests inside 90 days, one priced over the approval limit and not yet approved.
  { id: 'w3fz8a', vessel: FLEET_VESSELS.TERN, requester: P.FIRST_MATE, added: '2026-07-20', description: MOORING_LINE, category: SUPPLY_CATEGORY.MOORING, quantity: 1, unitCost: 4200, steps: [sent(), forApproval(), approved(), stocked(6), received(9)] },
  { id: 'w8kd1r', vessel: FLEET_VESSELS.TERN, requester: P.FIRST_MATE, added: '2026-08-25', description: MOORING_LINE, category: SUPPLY_CATEGORY.MOORING, quantity: 1, unitCost: 4200, steps: [sent(), forApproval()] },
  { id: 'w2ny7c', vessel: FLEET_VESSELS.TERN, requester: P.FIRST_MATE, added: '2026-09-05', description: 'Mooring line, 8-strand, 2 in × 400 ft', category: SUPPLY_CATEGORY.MOORING, quantity: 1, unitCost: 2300, steps: [sent(), acknowledged()] },
  { id: 'w6qp4m', vessel: FLEET_VESSELS.TERN, requester: P.ASSISTANT_ENGINEER, added: '2026-09-02', description: 'Fuel filter elements, 30 micron', category: SUPPLY_CATEGORY.FILTERS, quantity: 24, unitCost: 18.5, steps: [sent(), acknowledged(), stocked(), received()] },
  { id: 'w9ta5k', vessel: FLEET_VESSELS.TERN, requester: P.CAPTAIN, added: '2026-09-08', description: 'Radar magnetron', category: SUPPLY_CATEGORY.ELECTRONICS, quantity: 1, unitCost: 1850, limited: true, steps: [sent(), acknowledged()] },
  { id: 'w4gh2e', vessel: FLEET_VESSELS.TERN, requester: P.COOK, added: '2026-09-10', description: 'Galley range thermostat', category: SUPPLY_CATEGORY.GALLEY, quantity: 1, unitCost: null, steps: [sent(), acknowledged()] },
  { id: 'w7mb3x', vessel: FLEET_VESSELS.TERN, requester: P.COOK, added: '2026-09-12', description: 'Hand soap, case of 12', category: SUPPLY_CATEGORY.CLEANING, quantity: 2, unitCost: 32, steps: [] },
  { id: 'w1vc9s', vessel: FLEET_VESSELS.TERN, requester: P.SECOND_MATE, added: '2026-09-13', description: 'Work gloves, size L', category: SUPPLY_CATEGORY.SAFETY, quantity: 12, unitCost: 6, steps: [] },

  // Petrel: a back order, an approved part waiting in the locker, a missing delivery and a denial.
  { id: 'w5ru6d', vessel: FLEET_VESSELS.PETREL, requester: P.CHIEF_ENGINEER, added: '2026-08-28', description: 'Turbocharger gasket kit', category: SUPPLY_CATEGORY.ENGINE, quantity: 2, unitCost: 145, steps: [sent(), acknowledged(), { transition: T.BACK_ORDER, by: P.SUPPLY_MANAGER, daysLater: 3, note: 'Vendor ships October 2.' }] },
  { id: 'w8ej4t', vessel: FLEET_VESSELS.PETREL, requester: P.CHIEF_ENGINEER, added: '2026-08-15', description: 'Main engine starter motor', category: SUPPLY_CATEGORY.ENGINE, quantity: 1, unitCost: 3100, steps: [sent(), forApproval(), approved(), stocked(20)] },
  { id: 'w2lx8b', vessel: FLEET_VESSELS.PETREL, requester: P.SECOND_MATE, added: '2026-08-20', description: 'Life ring lights', category: SUPPLY_CATEGORY.SAFETY, quantity: 4, unitCost: 65, steps: [sent(), acknowledged(), stocked(), { transition: T.REPORT_MISSING, by: 'requester', daysLater: 12, note: 'Not in the locker at pickup.' }] },
  { id: 'w6sf1n', vessel: FLEET_VESSELS.PETREL, requester: P.FIRST_MATE, added: '2026-09-01', description: 'Deck paint, gray, 5 gal', category: SUPPLY_CATEGORY.DECK, quantity: 3, unitCost: 210, steps: [sent(), acknowledged(), { transition: T.DENY, by: P.SUPPLY_MANAGER, daysLater: 3, note: 'Deck painting is on the yard list for dry dock.' }] },

  // Shearwater: an approved radar display waiting to be ordered, one item sent and one still on the list.
  { id: 'w5jr3u', vessel: FLEET_VESSELS.SHEARWATER, requester: P.CAPTAIN, added: '2026-09-04', description: 'Radar display unit', category: SUPPLY_CATEGORY.ELECTRONICS, quantity: 1, unitCost: 2900, limited: true, steps: [sent(), forApproval(), approved(5)] },
  { id: 'w3hk7p', vessel: FLEET_VESSELS.SHEARWATER, requester: P.ASSISTANT_ENGINEER, added: '2026-09-11', description: 'Generator coolant hose set', category: SUPPLY_CATEGORY.ENGINE, quantity: 1, unitCost: 260, steps: [sent()] },
  { id: 'w9bw2g', vessel: FLEET_VESSELS.SHEARWATER, requester: P.SECOND_MATE, added: '2026-09-13', description: 'Navigation light bulbs', category: SUPPLY_CATEGORY.ELECTRICAL, quantity: 6, unitCost: 12, steps: [] },

  // The fuel barge: hose gaskets in the locker, calibration gas waiting on approval.
  { id: 'w4zt6v', vessel: FLEET_VESSELS.KESTREL_305, requester: P.TANKERMAN, added: '2026-09-03', description: 'Cargo hose gaskets, 6 in', category: SUPPLY_CATEGORY.DECK, quantity: 20, unitCost: 9, steps: [sent(), acknowledged(), stocked()] },
  { id: 'w7cn5q', vessel: FLEET_VESSELS.KESTREL_305, requester: P.TANKERMAN_PIC, added: '2026-09-09', description: 'Gas detector calibration gas', category: SUPPLY_CATEGORY.SAFETY, quantity: 2, unitCost: 420, limited: true, steps: [sent(), acknowledged(), forApproval(3)] },

  // The propane barge: no one aboard can send its list.
  { id: 'w1dm8h', vessel: FLEET_VESSELS.KESTREL_410, requester: P.TANKERMAN, added: '2026-09-12', description: 'Relief valve rebuild kit', category: SUPPLY_CATEGORY.ENGINE, quantity: 1, unitCost: 980, steps: [] },
];

const changed = (change: RecordChange, what: string): PlatformData => {
  if (!change.ok) throw new Error(`${what}: ${change.problems.join(' ')}`);
  return change.data;
};

function resolveActor(data: PlatformData, by: Actor, item: PlannedItem, requester: ActorId): ActorId {
  const actor =
    by === 'requester'
      ? ACTORS.find((candidate) => candidate.actorId === requester)
      : by === 'sender'
        ? ACTORS.find((candidate) => isAboard(candidate.actorId, item.vessel) && isPermittedOnRecord(FLEET_CONFIGURATION, data, candidate.actorId, FLEET_PERMISSION.SEND_LIST, item.vessel))
        : ACTORS.find((candidate) => positionOf(candidate) === by);
  if (!actor) throw new Error(`No one can act as ${by} on item ${item.id}.`);
  return actor.actorId;
}

function recordItem(data: PlatformData, plan: PlannedItem): PlatformData {
  const requester = ACTORS.find((candidate) => positionOf(candidate) === plan.requester && isAboard(candidate.actorId, plan.vessel));
  if (!requester) throw new Error(`No ${plan.requester} is aboard for item ${plan.id}.`);
  const added = toPlainDate(plan.added);
  const values: Answers = {
    [W.DESCRIPTION]: plan.description,
    [W.CATEGORY]: plan.category,
    [W.QUANTITY]: plan.quantity,
    [W.UNIT_COST]: plan.unitCost,
    [W.LIMITED]: plan.limited ?? false,
  };
  const entryId = toEntryId(plan.id);
  const withItem = changed(addEntry(FLEET_CONFIGURATION, data, { actorId: requester.actorId, entityId: plan.vessel.entityId, streamId: FLEET_STREAM.WANT_LIST, entryId, values, date: added }), `Item ${plan.id} cannot be added`);
  return plan.steps.reduce(
    (current, planned) =>
      changed(
        applyEntryTransition(FLEET_CONFIGURATION, current, {
          actorId: resolveActor(current, planned.by, plan, requester.actorId),
          entryId,
          transitionId: planned.transition,
          date: resolveDaysLater(added, planned.daysLater),
          note: planned.note ?? '',
        }),
        `Item ${plan.id} cannot ${planned.transition}`,
      ),
    withItem,
  );
}

export function buildSyntheticFleet(): PlatformData {
  const empty: PlatformData = { tenants: TENANTS, actors: ACTORS, assignments: ASSIGNMENTS, entities: Object.values(FLEET_VESSELS), entries: [] };
  return PLANNED_ITEMS.reduce(recordItem, empty);
}
