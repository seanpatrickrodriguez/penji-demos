import { ACCESS_SCOPE_KIND, DEFINITION_KIND, PLATFORM_FACT, RULE_CLAUSE, RULES_ORIGIN, STORAGE_OPERATION } from '@penji-demos/constants';
import {
  AccessPolicyDefinition,
  EntityDefinition,
  FieldDefinition,
  FormDefinition,
  PlatformConfiguration,
  PlatformData,
  TenantKindDefinition,
  toActorId,
  toAssignmentId,
  toDefinitionId,
  toEntityId,
  toTenantId,
} from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { evaluateAccessPolicy } from './evaluate-access-policy';
import { evaluateStorageRequest } from './evaluate-storage-request';
import { resolveRulesSections, resolveSecurityRules } from './resolve-security-rules';
import { resolveStoredEntity, resolveStoredTenant, resolveTokenClaims } from './resolve-stored-records';
import { validateStoredValues } from './validate-stored-values';

// The engine is tested on a made-up product of its own: a network of
// community gardens.  A garden may look after a smaller garden, gardens keep
// plots, and a plot holds beds.  Nothing here comes from any demo.

const SOURCE = { title: 'Garden rules', url: 'https://example.org/gardens' };
const id = toDefinitionId;
const form = (formId: string, fields: readonly FieldDefinition[]): FormDefinition => ({ kind: DEFINITION_KIND.FORM, id: id(formId), version: '1', title: formId, source: SOURCE, description: formId, fields, rules: [] });

const PLOT_FORM = form('plot', [
  { kind: 'text', key: 'plotName', label: 'Plot name', required: true, maxLength: 12 },
  {
    kind: 'choice',
    key: 'soil',
    label: 'Soil',
    required: true,
    options: [
      { value: 'loam', label: 'Loam' },
      { value: "o'clay", label: 'Clay' },
    ],
  },
  { kind: 'number', key: 'beds', label: 'Beds', min: 1, max: 20, wholeNumber: true },
  { kind: 'date', key: 'opened', label: 'Opened' },
  { kind: 'yesNo', key: 'shaded', label: 'Shaded' },
  { kind: 'text', key: 'shadeNote', label: 'Shade note', required: true, showWhen: { kind: 'equals', field: 'shaded', value: true } },
  { kind: 'calculated', key: 'bedsTwice', label: 'Beds twice', calculation: { kind: 'product', fields: ['beds'], factor: 2 }, format: 'number' },
]);
const BED_FORM = form('bed', [{ kind: 'text', key: 'crop', label: 'Crop' }]);
const GARDENER_FORM = form('gardener', [
  {
    kind: 'choice',
    key: 'duty',
    label: 'Duty',
    options: [
      { value: 'steward', label: 'Steward' },
      { value: 'helper', label: 'Helper' },
    ],
  },
]);

const POLICY: AccessPolicyDefinition = {
  kind: DEFINITION_KIND.ACCESS_POLICY,
  id: id('garden-access'),
  version: '1',
  title: 'Garden access',
  source: SOURCE,
  permissions: [
    { id: 'tendPlot', label: 'Tend a plot' },
    { id: 'plantBed', label: 'Plant a bed' },
  ],
  roles: [
    { id: 'steward', label: 'Steward', description: '', grants: [{ permission: 'tendPlot', when: null }, { permission: 'plantBed', when: null }] },
    { id: 'helper', label: 'Helper', description: '', grants: [{ permission: 'plantBed', when: { kind: 'sameAs', field: PLATFORM_FACT.ACTOR_ID, other: 'planter' } }] },
  ],
  roleRules: [
    { id: 'stewards', label: 'Stewards', when: { kind: 'equals', field: 'duty', value: 'steward' }, roleIds: ['steward'] },
    { id: 'helpers', label: 'Helpers', when: { kind: 'equals', field: 'duty', value: 'helper' }, roleIds: ['helper'] },
  ],
};

const entity = (entityId: string, label: string, formId: string, editPermission: string, parentKind: string | null): EntityDefinition => ({
  kind: DEFINITION_KIND.ENTITY,
  id: id(entityId),
  version: '1',
  title: label,
  source: SOURCE,
  label,
  pluralLabel: `${label}s`,
  formId: id(formId),
  editPermission,
  parentKind: parentKind === null ? null : id(parentKind),
  startField: null,
  streams: [],
  facts: [],
  standardIds: [],
});

const TENANT_KINDS: readonly TenantKindDefinition[] = [
  { kind: DEFINITION_KIND.TENANT_KIND, id: id('network'), version: '1', title: 'Network', source: SOURCE, label: 'Network', parentKinds: [], formId: id('gardener') },
  { kind: DEFINITION_KIND.TENANT_KIND, id: id('garden'), version: '1', title: 'Garden', source: SOURCE, label: 'Garden', parentKinds: [id('network'), id('garden')], formId: id('gardener') },
];

const CONFIGURATION: PlatformConfiguration = {
  kind: DEFINITION_KIND.CONFIGURATION,
  id: id('gardens'),
  version: '1',
  title: 'Community gardens',
  source: SOURCE,
  tenantKinds: TENANT_KINDS,
  entities: [entity('plot', 'Plot', 'plot', 'tendPlot', null), entity('bed', 'Bed', 'bed', 'plantBed', 'plot')],
  forms: [PLOT_FORM, BED_FORM, GARDENER_FORM],
  workflows: [],
  accessPolicy: POLICY,
  actorFormId: id('gardener'),
  standards: [],
};

const NETWORK = toTenantId('t-network');
const NORTH = toTenantId('t-north');
const NORTH_ANNEX = toTenantId('t-annex');
const SOUTH = toTenantId('t-south');
const NETWORK_STEWARD = toActorId('a-network');
const NORTH_STEWARD = toActorId('a-north');
const ANNEX_STEWARD = toActorId('a-annex');
const HELPER = toActorId('a-helper');
const RESTING = toActorId('a-resting');
const NORTH_PLOT = toEntityId('e-north-plot');
const ANNEX_PLOT = toEntityId('e-annex-plot');
const SOUTH_PLOT = toEntityId('e-south-plot');
const ANNEX_BED = toEntityId('e-annex-bed');
const PLOT_VALUES = { plotName: 'Sunny', soil: 'loam', beds: 4, opened: '2026-03-01', shaded: false };

const tenantScope = (tenantId: ReturnType<typeof toTenantId>) => ({ kind: ACCESS_SCOPE_KIND.TENANT, tenantId }) as const;

const DATA: PlatformData = {
  tenants: [
    { tenantId: NETWORK, kind: id('network'), parentId: null, name: 'Network', values: {} },
    { tenantId: NORTH, kind: id('garden'), parentId: NETWORK, name: 'North Garden', values: {} },
    { tenantId: NORTH_ANNEX, kind: id('garden'), parentId: NORTH, name: 'North Annex', values: {} },
    { tenantId: SOUTH, kind: id('garden'), parentId: NETWORK, name: 'South Garden', values: {} },
  ],
  actors: [
    { actorId: NETWORK_STEWARD, tenantId: NETWORK, name: 'Network steward', values: { duty: 'steward' } },
    { actorId: NORTH_STEWARD, tenantId: NORTH, name: 'North steward', values: { duty: 'steward' } },
    { actorId: ANNEX_STEWARD, tenantId: NORTH_ANNEX, name: 'Annex steward', values: { duty: 'steward' } },
    { actorId: HELPER, tenantId: NORTH_ANNEX, name: 'Helper', values: { duty: 'helper' } },
    { actorId: RESTING, tenantId: SOUTH, name: 'Resting steward', values: { duty: 'steward' } },
  ],
  assignments: [
    { assignmentId: toAssignmentId('s1'), actorId: NETWORK_STEWARD, scope: tenantScope(NETWORK), active: true },
    { assignmentId: toAssignmentId('s2'), actorId: NORTH_STEWARD, scope: tenantScope(NORTH), active: true },
    { assignmentId: toAssignmentId('s3'), actorId: ANNEX_STEWARD, scope: tenantScope(NORTH_ANNEX), active: true },
    { assignmentId: toAssignmentId('s4'), actorId: HELPER, scope: { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: ANNEX_PLOT }, active: true },
    { assignmentId: toAssignmentId('s5'), actorId: RESTING, scope: tenantScope(SOUTH), active: false },
  ],
  entities: [
    { entityId: NORTH_PLOT, kind: id('plot'), tenantId: NORTH, parentId: null, values: PLOT_VALUES },
    { entityId: ANNEX_PLOT, kind: id('plot'), tenantId: NORTH_ANNEX, parentId: null, values: PLOT_VALUES },
    { entityId: SOUTH_PLOT, kind: id('plot'), tenantId: SOUTH, parentId: null, values: PLOT_VALUES },
    { entityId: ANNEX_BED, kind: id('bed'), tenantId: NORTH_ANNEX, parentId: ANNEX_PLOT, values: { crop: 'beans' } },
  ],
  entries: [],
};

const claimsOf = (actorId: ReturnType<typeof toActorId>) => resolveTokenClaims(POLICY, DATA, actorId);
const get = (tenantId: ReturnType<typeof toTenantId>, entityId: ReturnType<typeof toEntityId>) => ({ operation: STORAGE_OPERATION.GET, tenantId, entityId }) as const;
const listOf = (tenantId: ReturnType<typeof toTenantId>) => ({ operation: STORAGE_OPERATION.LIST, tenantId }) as const;
const update = (tenantId: ReturnType<typeof toTenantId>, entityId: ReturnType<typeof toEntityId>, values: Record<string, string | number | boolean | null>, otherFields: Record<string, readonly string[]> = {}) =>
  ({ operation: STORAGE_OPERATION.UPDATE, tenantId, entityId, values, otherFields }) as const;
const decide = (actorId: ReturnType<typeof toActorId> | null, request: Parameters<typeof evaluateStorageRequest>[3]) =>
  evaluateStorageRequest(CONFIGURATION, DATA, actorId === null ? null : claimsOf(actorId), request);

describe('stored records and token claims', () => {
  it('stores each record with its line of ancestors, nearest first', () => {
    const annex = DATA.tenants.find((tenant) => tenant.tenantId === NORTH_ANNEX);
    const bed = DATA.entities.find((candidate) => candidate.entityId === ANNEX_BED);
    expect(annex && resolveStoredTenant(DATA, annex).line).toEqual([NORTH_ANNEX, NORTH, NETWORK]);
    expect(bed && resolveStoredEntity(DATA, bed).line).toEqual([ANNEX_BED, ANNEX_PLOT]);
  });

  it('puts the roles from the role rules and the active assignments on the token', () => {
    expect(claimsOf(NORTH_STEWARD)).toEqual({ roles: ['steward'], tenantScopes: [NORTH], entityScopes: [] });
    expect(claimsOf(HELPER)).toEqual({ roles: ['helper'], tenantScopes: [], entityScopes: [ANNEX_PLOT] });
  });

  it('gives a person with no active assignment no roles at all', () => {
    expect(claimsOf(RESTING)).toEqual({ roles: [], tenantScopes: [], entityScopes: [] });
  });
});

describe('what the rules decide', () => {
  it('refuses everything to a person who is not signed in or holds no role', () => {
    expect(decide(null, get(NORTH, NORTH_PLOT))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.SIGNED_IN });
    expect(decide(RESTING, get(SOUTH, SOUTH_PLOT))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.SCOPE });
  });

  it('lets a scope reach down the tenant tree and never up or across', () => {
    expect(decide(NETWORK_STEWARD, listOf(NORTH_ANNEX)).allowed).toBe(true);
    expect(decide(NORTH_STEWARD, listOf(NORTH_ANNEX)).allowed).toBe(true);
    expect(decide(NORTH_STEWARD, listOf(SOUTH))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.LIST_SCOPE });
    expect(decide(ANNEX_STEWARD, get(NORTH, NORTH_PLOT))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.SCOPE });
  });

  it('lets an assignment to one record reach that record and the records under it, and list nothing', () => {
    expect(decide(HELPER, get(NORTH_ANNEX, ANNEX_PLOT)).allowed).toBe(true);
    expect(decide(HELPER, get(NORTH_ANNEX, ANNEX_BED)).allowed).toBe(true);
    expect(decide(HELPER, listOf(NORTH_ANNEX))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.LIST_SCOPE });
  });

  it('refuses a record under a different tenant than the path names', () => {
    expect(decide(NETWORK_STEWARD, get(SOUTH, NORTH_PLOT))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.RECORD_EXISTS });
  });

  it('checks an edit for protected fields, then the permission, then the values', () => {
    expect(decide(NORTH_STEWARD, update(NORTH, NORTH_PLOT, { beds: 5 }, { line: [NORTH_PLOT, SOUTH_PLOT] }))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.PROTECTED_FIELD });
    expect(decide(NORTH_STEWARD, update(NORTH, NORTH_PLOT, { beds: 5 }, { line: [NORTH_PLOT] }))).toMatchObject({ allowed: true });
    expect(decide(HELPER, update(NORTH_ANNEX, ANNEX_BED, { crop: 'peas' }))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.PERMISSION });
    expect(decide(NORTH_STEWARD, update(NORTH, NORTH_PLOT, { soil: 'sand' }))).toMatchObject({ allowed: false, clause: RULE_CLAUSE.VALUES });
    expect(decide(NORTH_STEWARD, update(NORTH, NORTH_PLOT, { soil: "o'clay" }))).toMatchObject({ allowed: true, clause: RULE_CLAUSE.VALUES });
  });
});

describe('the access policy beside the rules', () => {
  const policy = (actorId: ReturnType<typeof toActorId> | null, request: Parameters<typeof evaluateStorageRequest>[3]) => evaluateAccessPolicy(CONFIGURATION, DATA, actorId, request);

  it('gives the rules’ answer to every request that asks only about access', () => {
    const actors = [NETWORK_STEWARD, NORTH_STEWARD, ANNEX_STEWARD, HELPER, RESTING];
    const requests = [listOf(NORTH), listOf(NORTH_ANNEX), listOf(SOUTH), get(NORTH, NORTH_PLOT), get(NORTH_ANNEX, ANNEX_BED), update(NORTH_ANNEX, ANNEX_PLOT, { beds: 6 }), update(NORTH_ANNEX, ANNEX_BED, { crop: 'peas' })];
    for (const actorId of actors) {
      for (const request of requests) {
        const answer = policy(actorId, request);
        expect(answer.asksOnlyAboutAccess).toBe(true);
        expect(answer.permitted, `${actorId} ${JSON.stringify(request)}`).toBe(decide(actorId, request).allowed);
      }
    }
  });

  it('leaves server-kept fields and values outside the form to the rules', () => {
    expect(policy(NORTH_STEWARD, update(NORTH, NORTH_PLOT, { soil: 'sand' })).asksOnlyAboutAccess).toBe(false);
    expect(policy(NORTH_STEWARD, update(NORTH, NORTH_PLOT, {}, { line: [SOUTH_PLOT] })).asksOnlyAboutAccess).toBe(false);
  });

  it('permits nothing to nobody', () => {
    expect(policy(null, get(NORTH, NORTH_PLOT)).permitted).toBe(false);
  });
});

describe('values against their form', () => {
  it('accepts the form’s own fields within their limits', () => {
    expect(validateStoredValues(PLOT_FORM, PLOT_VALUES)).toEqual([]);
  });

  it('refuses unknown fields, missing required fields and values outside the form', () => {
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, bedsTwice: 8 })).toHaveLength(1);
    expect(validateStoredValues(PLOT_FORM, { soil: 'loam' })).toEqual(['Plot name is required.']);
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, plotName: 'A name far too long' })).toHaveLength(1);
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, beds: 2.5 })).toHaveLength(1);
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, beds: 21 })).toHaveLength(1);
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, opened: 'March 1' })).toHaveLength(1);
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, shaded: 'no' })).toHaveLength(1);
  });

  it('checks a field that shows only under a condition when it is present', () => {
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, shaded: true })).toEqual([]);
    expect(validateStoredValues(PLOT_FORM, { ...PLOT_VALUES, shadeNote: 7 })).toHaveLength(1);
  });
});

describe('the generated rules', () => {
  const rules = resolveSecurityRules(CONFIGURATION);

  it('generates the same text every time', () => {
    expect(resolveSecurityRules(CONFIGURATION)).toBe(rules);
  });

  it('marks the platform’s part and the part generated from the configuration', () => {
    expect(resolveRulesSections(CONFIGURATION).map((section) => section.origin)).toEqual([RULES_ORIGIN.PLATFORM, RULES_ORIGIN.PLATFORM, RULES_ORIGIN.CONFIGURATION, RULES_ORIGIN.CONFIGURATION]);
  });

  it('lets only the roles holding each kind’s edit permission outright edit it', () => {
    expect(rules).toContain("resource.data.kind == 'plot' && holdsAny(['steward']) && isPlotValues(request.resource.data.values)");
    expect(rules).toContain("resource.data.kind == 'bed' && holdsAny(['steward']) && isBedValues(request.resource.data.values)");
    expect(rules).toContain('Left to the server: helper may plantBed only under a condition.');
  });

  it('writes each form’s checks, escaping the values it quotes', () => {
    expect(rules).toContain("v.keys().hasOnly(['plotName', 'soil', 'beds', 'opened', 'shaded', 'shadeNote'])");
    expect(rules).toContain("('plotName' in v && v.plotName is string && v.plotName.size() <= 12)");
    expect(rules).toContain("v.soil in ['loam', 'o\\'clay']");
    expect(rules).toContain("(!('beds' in v) || v.beds == null || v.beds is int && v.beds >= 1 && v.beds <= 20)");
    expect(rules).toContain("(!('shadeNote' in v) || v.shadeNote == null || v.shadeNote is string");
  });
});
