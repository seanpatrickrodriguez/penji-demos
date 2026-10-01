import { BARGE_CARGO, FLEET_PERMISSION, FLEET_POSITION, SUPPLY_CATEGORY, SUPPLY_STATUS, TOILET_FLUSH, VESSEL_KIND, WANT_LIST_TRANSITION } from '@penji-demos/constants';
import { applyItemTransition, isAboard, isPermittedOnVessel } from '@penji-demos/fleet-standard';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import {
  CompanyRecord,
  FleetData,
  FleetPosition,
  PersonRecord,
  PlainDate,
  SupplyCategory,
  VesselId,
  VesselProfile,
  VesselRecord,
  WantItemRecord,
  toCompanyId,
  toPersonId,
  toVesselId,
  toWantItemId,
} from '@penji-demos/types';

// M0: a made-up tug and barge company and the shop that keeps its vessels
// running.  Every name is invented.  Every item's history is replayed through
// the want-list workflow, so the seed holds only steps the policy allows, and
// each policy rule has a case that fires.

const AS_OF = toPlainDate('2026-09-15');
const P = FLEET_POSITION;
const T = WANT_LIST_TRANSITION;

// Opaque IDs from a multiplicative hash, the same on every build.
const opaqueId = (prefix: string, index: number) => `${prefix}${(Math.imul(index + 1, 2654435761) >>> 0).toString(36)}`;

const OWNER: CompanyRecord = { companyId: toCompanyId('c7xq2m'), name: 'Kestrel Tug & Barge', parentId: null };
const SHOP: CompanyRecord = { companyId: toCompanyId('c4hn8w'), name: 'Kestrel Marine Shop', parentId: OWNER.companyId };

const date = (value: string): PlainDate => toPlainDate(value);
const profile = (values: Partial<VesselProfile>): VesselProfile => ({
  mainEngines: '',
  generatorEngines: '',
  generators: '',
  potableWaterPump: '',
  potableWaterGallons: null,
  toiletFlush: null,
  lastAnnualInspection: null,
  lastDryDock: null,
  lastTankMaintenance: null,
  ...values,
});

const vessel = (id: string, name: string, kind: VesselRecord['kind'], cargo: VesselRecord['cargo'], inService: boolean, values: Partial<VesselProfile>): VesselRecord => ({
  vesselId: toVesselId(id),
  ownerId: OWNER.companyId,
  name,
  kind,
  cargo,
  inService,
  profile: profile(values),
});

const TUG_ENGINES = { generatorEngines: '2 × John Deere 4045', generators: '2 × 99 kW', potableWaterPump: 'Centrifugal, 1 hp' };

export const FLEET_VESSELS = {
  TERN: vessel('v2k9fq', 'Tern', VESSEL_KIND.TUG, null, true, {
    ...TUG_ENGINES,
    mainEngines: '2 × EMD 16-645',
    potableWaterGallons: 1500,
    toiletFlush: TOILET_FLUSH.SALTWATER,
    lastAnnualInspection: date('2025-12-10'),
    lastDryDock: date('2023-04-02'),
  }),
  PETREL: vessel('v8m3za', 'Petrel', VESSEL_KIND.TUG, null, true, {
    ...TUG_ENGINES,
    mainEngines: '2 × MTU 12V4000',
    potableWaterGallons: 1200,
    toiletFlush: TOILET_FLUSH.FRESHWATER,
    lastAnnualInspection: date('2025-08-01'),
    lastDryDock: date('2021-03-15'),
  }),
  SHEARWATER: vessel('v5t7nc', 'Shearwater', VESSEL_KIND.TUG, null, true, {
    ...TUG_ENGINES,
    potableWaterGallons: 1000,
    lastAnnualInspection: date('2025-09-30'),
    lastDryDock: date('2024-06-18'),
  }),
  KESTREL_201: vessel('v1q6rd', 'Kestrel 201', VESSEL_KIND.BARGE, BARGE_CARGO.SAND, true, {
    lastDryDock: date('2022-10-11'),
  }),
  KESTREL_305: vessel('v9w4hs', 'Kestrel 305', VESSEL_KIND.BARGE, BARGE_CARGO.FUEL, true, {
    generatorEngines: '1 × Cummins QSB',
    generators: '1 × 60 kW',
    lastAnnualInspection: date('2026-05-05'),
    lastDryDock: date('2023-01-24'),
    lastTankMaintenance: date('2021-01-20'),
  }),
  KESTREL_410: vessel('v6c2jy', 'Kestrel 410', VESSEL_KIND.BARGE, BARGE_CARGO.PROPANE, true, {
    generatorEngines: '1 × Cummins QSB',
    generators: '1 × 60 kW',
    lastAnnualInspection: date('2026-03-01'),
    lastDryDock: date('2024-02-08'),
    lastTankMaintenance: date('2016-05-02'),
  }),
  KESTREL_512: vessel('v3p8ue', 'Kestrel 512', VESSEL_KIND.BARGE, BARGE_CARGO.CONTAINERS, false, {}),
} satisfies Readonly<Record<string, VesselRecord>>;

const FIRST_NAMES = ['Leilani', 'Keoni', 'Malia', 'Sione', 'Tevita', 'Ana', 'Mateo', 'Noelani', 'Kai', 'Lani', 'Iosefa', 'Mele', 'Rafael', 'Grace', 'Daniel', 'Rosa', 'Kekoa', 'Tomas', 'Lose', 'Henry', 'Alana', 'Paulo', 'Kaimana', 'Joseph', 'Marisol'];
const LAST_NAMES = ['Akana', 'Fonoti', 'Santos', 'Mahoe', 'Tupou', 'Kealoha', 'Ramos', 'Faleolo', 'Nakamura', 'Pereira', 'Kahale', 'Taufa', 'Cabral', 'Lui', 'Moana', 'Ortiz', 'Palakiko', 'Silva', 'Tanaka', 'Vaifale', 'Keola', 'Baptiste', 'Navarro', 'Hoapili', 'Lemalu'];
const nameAt = (index: number) =>
  `${FIRST_NAMES[index % FIRST_NAMES.length] ?? ''} ${LAST_NAMES[(index * 7 + Math.floor(index / LAST_NAMES.length)) % LAST_NAMES.length] ?? ''}`;

interface Assignment {
  readonly position: FleetPosition;
  readonly vessels: readonly VesselRecord[];
  readonly aboard: boolean;
}

const TUG_POSITIONS: readonly FleetPosition[] = [P.CAPTAIN, P.FIRST_MATE, P.SECOND_MATE, P.CHIEF_ENGINEER, P.ASSISTANT_ENGINEER, P.COOK];
const TUGS = [FLEET_VESSELS.TERN, FLEET_VESSELS.PETREL, FLEET_VESSELS.SHEARWATER];

// Twelve people rotate through each tug's six positions, one of each pair aboard at a time.
const tugCrews: readonly Assignment[] = TUGS.flatMap((tug) => TUG_POSITIONS.flatMap((position) => [true, false].map((aboard) => ({ position, vessels: [tug], aboard }))));

// Tankermen rotate through the tank barges.  Both of the propane barge's tankermen in charge are off this rotation.
const tankermen: readonly Assignment[] = [
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_305], aboard: true },
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_305], aboard: false },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_305], aboard: true },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_305], aboard: false },
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_410], aboard: false },
  { position: P.TANKERMAN_PIC, vessels: [FLEET_VESSELS.KESTREL_410], aboard: false },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_410], aboard: true },
  { position: P.TANKERMAN, vessels: [FLEET_VESSELS.KESTREL_410], aboard: false },
];

const shop: readonly Assignment[] = [P.SUPPLY_MANAGER, P.PORT_ENGINEER, P.OWNER_REPRESENTATIVE, P.SENIOR_WELDER, P.SENIOR_ELECTRICIAN].map((position) => ({
  position,
  vessels: [],
  aboard: false,
}));

const PEOPLE: readonly PersonRecord[] = [...tugCrews, ...tankermen, ...shop].map((assignment, index) => ({
  personId: toPersonId(opaqueId('u', index)),
  name: nameAt(index),
  position: assignment.position,
  companyId: assignment.vessels.length > 0 ? OWNER.companyId : SHOP.companyId,
  vesselIds: assignment.vessels.map((each) => each.vesselId),
  aboard: assignment.aboard,
}));

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
  readonly vessel: VesselRecord;
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

const firstAboard = (vesselId: VesselId, matches: (person: PersonRecord) => boolean): PersonRecord | undefined =>
  PEOPLE.find((person) => isAboard(person, vesselId) && matches(person));

function resolveActor(by: Actor, item: PlannedItem, requester: PersonRecord): PersonRecord {
  const vesselId = item.vessel.vesselId;
  const actor =
    by === 'requester'
      ? requester
      : by === 'sender'
        ? firstAboard(vesselId, (person) => isPermittedOnVessel(person, vesselId, FLEET_PERMISSION.SEND_LIST))
        : PEOPLE.find((person) => person.position === by);
  if (!actor) throw new Error(`No one can act as ${by} on item ${item.id}.`);
  return actor;
}

function buildItem(plan: PlannedItem): WantItemRecord {
  const requester = firstAboard(plan.vessel.vesselId, (person) => person.position === plan.requester);
  if (!requester) throw new Error(`No ${plan.requester} is aboard for item ${plan.id}.`);
  const added = toPlainDate(plan.added);
  const start: WantItemRecord = {
    itemId: toWantItemId(plan.id),
    vesselId: plan.vessel.vesselId,
    requestedBy: requester.personId,
    addedDate: added,
    description: plan.description,
    category: plan.category,
    quantity: plan.quantity,
    unitCost: plan.unitCost,
    limited: plan.limited ?? false,
    status: SUPPLY_STATUS.NEW,
    history: [],
  };
  return plan.steps.reduce((item, planned) => {
    const result = applyItemTransition(resolveActor(planned.by, plan, requester), item, planned.transition, resolveDaysLater(added, planned.daysLater), planned.note ?? '');
    if (!result.ok) throw new Error(`Item ${plan.id} cannot ${planned.transition}: ${result.problems.join(' ')}`);
    return result.item;
  }, start);
}

export function buildSyntheticFleet(): FleetData {
  return {
    asOfDate: AS_OF,
    companies: [OWNER, SHOP],
    vessels: Object.values(FLEET_VESSELS),
    people: PEOPLE,
    wantItems: PLANNED_ITEMS.map(buildItem),
  };
}
