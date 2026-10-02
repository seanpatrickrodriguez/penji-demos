import {
  ACCESS_SCOPE_KIND,
  COHORT_FIELD,
  COHORT_KIND,
  DELIVERY_MODE,
  HUB_FIELD,
  ORGANIZATION_FIELD,
  PROGRAM_ENTITY,
  PROGRAM_TENANT_KIND,
  STAFF_FIELD,
  STAFF_POSITION,
  STORAGE_OPERATION,
  STORED_FIELD,
} from '@penji-demos/constants';
import { resolveOpaqueId } from '@penji-demos/record-engine';
import { toPlainDate } from '@penji-demos/time';
import { ActorId, Answers, DemoSignIn, EntityId, EntityRecord, NamedStorageRequest, PlatformData, TenantId, toActorId, toAssignmentId, toDefinitionId, toEntityId, toTenantId } from '@penji-demos/types';

// M0: a synthetic hub network, kept in a live database to show tenant
// isolation.  The hub oversees two organizations, and one of them oversees a
// smaller organization of its own.  Each organization keeps its cohorts; no
// participant records are stored.  Every person and organization is invented,
// and the sign-ins below are public demo values.

const tenantId = (index: number): TenantId => toTenantId(resolveOpaqueId('nt', index));
const actorId = (index: number): ActorId => toActorId(resolveOpaqueId('na', index));
const entityId = (index: number): EntityId => toEntityId(resolveOpaqueId('ne', index));

export const NETWORK_HUB_ID = tenantId(0);
export const RIVERBEND_ID = tenantId(1);
export const WESTFIELD_ID = tenantId(2);
export const WESTFIELD_NORTH_ID = tenantId(3);

export const HUB_DATA_SPECIALIST_ID = actorId(0);
export const WESTFIELD_DATA_SPECIALIST_ID = actorId(1);
export const WESTFIELD_NORTH_DATA_SPECIALIST_ID = actorId(2);
export const RIVERBEND_COACH_ID = actorId(3);

export const RIVERBEND_EVENING_COHORT_ID = entityId(0);
export const RIVERBEND_MORNING_COHORT_ID = entityId(1);
export const WESTFIELD_COHORT_ID = entityId(2);
export const WESTFIELD_NORTH_SPRING_COHORT_ID = entityId(3);
export const WESTFIELD_NORTH_FALL_COHORT_ID = entityId(4);

const organization = (code: string, effectiveDate: string) => ({
  [ORGANIZATION_FIELD.CODE]: code,
  [ORGANIZATION_FIELD.DELIVERY_MODE]: DELIVERY_MODE.IN_PERSON,
  [ORGANIZATION_FIELD.EFFECTIVE_DATE]: toPlainDate(effectiveDate),
});

const cohort = (id: EntityId, owner: TenantId, code: string, kind: string, startDate: string): EntityRecord => ({
  entityId: id,
  kind: toDefinitionId(PROGRAM_ENTITY.COHORT),
  tenantId: owner,
  parentId: null,
  values: { [COHORT_FIELD.CODE]: code, [COHORT_FIELD.KIND]: kind, [COHORT_FIELD.START_DATE]: toPlainDate(startDate) },
});

const dataSpecialist = { [STAFF_FIELD.POSITION]: STAFF_POSITION.DATA_SPECIALIST };
const coach = { [STAFF_FIELD.POSITION]: STAFF_POSITION.LIFESTYLE_COACH };

export const SYNTHETIC_NETWORK: PlatformData = {
  tenants: [
    { tenantId: NETWORK_HUB_ID, kind: toDefinitionId(PROGRAM_TENANT_KIND.HUB), parentId: null, name: 'Lantern Bay Network', values: { [HUB_FIELD.REGION]: 'Lantern Bay' } },
    { tenantId: RIVERBEND_ID, kind: toDefinitionId(PROGRAM_TENANT_KIND.ORGANIZATION), parentId: NETWORK_HUB_ID, name: 'Riverbend Community Programs', values: organization('DEMO0101', '2024-01-01') },
    { tenantId: WESTFIELD_ID, kind: toDefinitionId(PROGRAM_TENANT_KIND.ORGANIZATION), parentId: NETWORK_HUB_ID, name: 'Westfield Family Center', values: organization('DEMO0201', '2023-07-01') },
    { tenantId: WESTFIELD_NORTH_ID, kind: toDefinitionId(PROGRAM_TENANT_KIND.ORGANIZATION), parentId: WESTFIELD_ID, name: 'Westfield North Outreach', values: organization('DEMO0202', '2025-01-01') },
  ],
  actors: [
    { actorId: HUB_DATA_SPECIALIST_ID, tenantId: NETWORK_HUB_ID, name: 'Rosa Delgado', values: dataSpecialist },
    { actorId: WESTFIELD_DATA_SPECIALIST_ID, tenantId: WESTFIELD_ID, name: 'Kai Fonoti', values: dataSpecialist },
    { actorId: WESTFIELD_NORTH_DATA_SPECIALIST_ID, tenantId: WESTFIELD_NORTH_ID, name: 'Lena Moreau', values: dataSpecialist },
    { actorId: RIVERBEND_COACH_ID, tenantId: RIVERBEND_ID, name: 'Tomas Reyes', values: coach },
  ],
  assignments: [
    { assignmentId: toAssignmentId(resolveOpaqueId('ns', 0)), actorId: HUB_DATA_SPECIALIST_ID, scope: { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: NETWORK_HUB_ID }, active: true },
    { assignmentId: toAssignmentId(resolveOpaqueId('ns', 1)), actorId: WESTFIELD_DATA_SPECIALIST_ID, scope: { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: WESTFIELD_ID }, active: true },
    { assignmentId: toAssignmentId(resolveOpaqueId('ns', 2)), actorId: WESTFIELD_NORTH_DATA_SPECIALIST_ID, scope: { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: WESTFIELD_NORTH_ID }, active: true },
    // A coach is assigned to the cohort they teach, not to the organization.
    { assignmentId: toAssignmentId(resolveOpaqueId('ns', 3)), actorId: RIVERBEND_COACH_ID, scope: { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: RIVERBEND_EVENING_COHORT_ID }, active: true },
  ],
  entities: [
    cohort(RIVERBEND_EVENING_COHORT_ID, RIVERBEND_ID, 'RB-EVE-26', COHORT_KIND.GROUP, '2026-02-03'),
    cohort(RIVERBEND_MORNING_COHORT_ID, RIVERBEND_ID, 'RB-AM-26', COHORT_KIND.GROUP, '2026-03-10'),
    cohort(WESTFIELD_COHORT_ID, WESTFIELD_ID, 'WF-01-26', COHORT_KIND.GROUP, '2026-01-13'),
    cohort(WESTFIELD_NORTH_SPRING_COHORT_ID, WESTFIELD_NORTH_ID, 'WN-SPR-26', COHORT_KIND.GROUP, '2026-04-07'),
    cohort(WESTFIELD_NORTH_FALL_COHORT_ID, WESTFIELD_NORTH_ID, 'WN-IND-26', COHORT_KIND.INDIVIDUAL, '2026-09-15'),
  ],
  entries: [],
};

// The demo accounts.  Anyone may sign in with these; the database rules decide what each one reaches.
export const NETWORK_SIGN_INS: readonly DemoSignIn[] = [
  { actorId: HUB_DATA_SPECIALIST_ID, email: 'hub.specialist@example.org', password: 'lantern-bay-hub' },
  { actorId: WESTFIELD_DATA_SPECIALIST_ID, email: 'westfield.specialist@example.org', password: 'lantern-bay-westfield' },
  { actorId: WESTFIELD_NORTH_DATA_SPECIALIST_ID, email: 'westfield.north.specialist@example.org', password: 'lantern-bay-north' },
  { actorId: RIVERBEND_COACH_ID, email: 'riverbend.coach@example.org', password: 'lantern-bay-coach' },
];

const tenantRecords = (owner: TenantId) => ({ operation: STORAGE_OPERATION.LIST, tenantId: owner }) as const;
const readCohort = (owner: TenantId, id: EntityId) => ({ operation: STORAGE_OPERATION.GET, tenantId: owner, entityId: id }) as const;
const saveCohort = (owner: TenantId, id: EntityId, values: Answers, otherFields: Readonly<Record<string, readonly string[]>> = {}) =>
  ({ operation: STORAGE_OPERATION.UPDATE, tenantId: owner, entityId: id, values, otherFields }) as const;

// The requests the page sends for whoever is signed in, the same for everyone.
// Every save writes a value the record already holds or one the rules refuse,
// so the shared records stay as seeded.
export const NETWORK_REQUESTS: readonly NamedStorageRequest[] = [
  { id: 'list-riverbend', label: 'List Riverbend Community Programs’ cohorts', request: tenantRecords(RIVERBEND_ID) },
  { id: 'list-westfield', label: 'List Westfield Family Center’s cohorts', request: tenantRecords(WESTFIELD_ID) },
  { id: 'list-westfield-north', label: 'List Westfield North Outreach’s cohorts', request: tenantRecords(WESTFIELD_NORTH_ID) },
  { id: 'read-riverbend-evening', label: 'Read cohort RB-EVE-26 at Riverbend', request: readCohort(RIVERBEND_ID, RIVERBEND_EVENING_COHORT_ID) },
  { id: 'read-riverbend-morning', label: 'Read cohort RB-AM-26 at Riverbend', request: readCohort(RIVERBEND_ID, RIVERBEND_MORNING_COHORT_ID) },
  { id: 'read-westfield-north', label: 'Read cohort WN-SPR-26 at Westfield North', request: readCohort(WESTFIELD_NORTH_ID, WESTFIELD_NORTH_SPRING_COHORT_ID) },
  {
    id: 'save-westfield-north',
    label: 'Save WN-SPR-26 as a group cohort',
    request: saveCohort(WESTFIELD_NORTH_ID, WESTFIELD_NORTH_SPRING_COHORT_ID, { [COHORT_FIELD.KIND]: COHORT_KIND.GROUP }),
  },
  {
    id: 'save-riverbend-evening',
    label: 'Save RB-EVE-26 as a group cohort',
    request: saveCohort(RIVERBEND_ID, RIVERBEND_EVENING_COHORT_ID, { [COHORT_FIELD.KIND]: COHORT_KIND.GROUP }),
  },
  {
    id: 'save-invalid-kind',
    label: 'Save WN-SPR-26 with a cohort kind the form does not offer',
    request: saveCohort(WESTFIELD_NORTH_ID, WESTFIELD_NORTH_SPRING_COHORT_ID, { [COHORT_FIELD.KIND]: 'weekly' }),
  },
  {
    id: 'move-westfield-north',
    label: 'Rewrite WN-SPR-26’s line to sit under Riverbend’s RB-EVE-26',
    request: saveCohort(WESTFIELD_NORTH_ID, WESTFIELD_NORTH_SPRING_COHORT_ID, {}, { [STORED_FIELD.LINE]: [WESTFIELD_NORTH_SPRING_COHORT_ID, RIVERBEND_EVENING_COHORT_ID] }),
  },
];
