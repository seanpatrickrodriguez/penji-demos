import { ACCESS_SCOPE_KIND, DEFINITION_KIND, FACT_DERIVATION_KIND, PLATFORM_FACT, RULE_CHECK_KIND, RULE_SCOPE, VALIDATION_SEVERITY } from '@penji-demos/constants';
import { toPlainDate } from '@penji-demos/time';
import {
  AccessPolicyDefinition,
  ComplianceStandardDefinition,
  EntityDefinition,
  FieldDefinition,
  FormDefinition,
  PlatformConfiguration,
  PlatformData,
  WorkflowDefinition,
  toActorId,
  toAssignmentId,
  toDefinitionId,
  toEntityId,
  toEntryId,
  toTenantId,
} from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { resolveEntryOptions, isPermittedOnRecord, resolvePermissionOption } from './resolve-access';
import { resolveDataAsOf } from './resolve-as-of';
import { describeRecordValue, evaluateEntity } from './evaluate-entity';
import { addEntry, applyEntryTransition, removeEntry } from './record-changes';
import { resolveRuleRoles } from './resolve-scope';
import { resolveEntityFacts, resolveEntryAnswers } from './resolve-subject';
import { validateConfiguration } from './validate-configuration';

// The engine is tested on a made-up product of its own: a tool library
// network.  Libraries sit under the network, households borrow, members of a
// household borrow tools and visit.  Nothing here comes from either demo.

const SOURCE = { title: 'Tool library rules', url: 'https://example.org/tools' };
const id = toDefinitionId;
const form = (formId: string, fields: readonly FieldDefinition[]): FormDefinition => ({ kind: DEFINITION_KIND.FORM, id: id(formId), version: '1', title: formId, source: SOURCE, description: formId, fields, rules: [] });

const FORMS = [
  form('network', [{ kind: 'text', key: 'region', label: 'Region' }]),
  form('library', [{ kind: 'text', key: 'branch', label: 'Branch' }]),
  form('person', [
    {
      kind: 'choice',
      key: 'duty',
      label: 'Duty',
      options: [
        { value: 'librarian', label: 'Librarian' },
        { value: 'volunteer', label: 'Volunteer' },
      ],
    },
  ]),
  form('household', [
    { kind: 'text', key: 'zone', label: 'Zone' },
    { kind: 'date', key: 'joined', label: 'Joined' },
  ]),
  form('member', [
    { kind: 'text', key: 'memberName', label: 'Name' },
    { kind: 'number', key: 'heightInches', label: 'Height' },
  ]),
  form('visit', [
    { kind: 'date', key: 'visitDate', label: 'Visit date' },
    { kind: 'number', key: 'reachInches', label: 'Reach' },
  ]),
  form('loan', [
    { kind: 'text', key: 'tool', label: 'Tool' },
    { kind: 'number', key: 'value', label: 'Value' },
    { kind: 'number', key: 'days', label: 'Days' },
    { kind: 'calculated', key: 'valueDays', label: 'Value-days', calculation: { kind: 'product', fields: ['value', 'days'] }, format: 'number' },
  ]),
];

const LOAN_WORKFLOW: WorkflowDefinition = {
  kind: DEFINITION_KIND.WORKFLOW,
  id: id('loan-workflow'),
  version: '1',
  title: 'Loan',
  source: SOURCE,
  initial: 'requested',
  states: [
    { id: 'requested', label: 'Requested', description: '', closed: false },
    { id: 'out', label: 'Out', description: '', closed: false },
    { id: 'returned', label: 'Returned', description: '', closed: true },
  ],
  transitions: [
    { id: 'lend', label: 'Lend', from: ['requested'], to: 'out', permission: 'lend', guard: { condition: { kind: 'not', condition: { kind: 'atLeast', field: 'value', value: 500 } }, blockedReason: 'Costly tools are lent by a librarian in person.' }, needsNote: false },
    { id: 'return', label: 'Return', from: ['out'], to: 'returned', permission: 'lend', guard: null, needsNote: false },
  ],
};

const POLICY: AccessPolicyDefinition = {
  kind: DEFINITION_KIND.ACCESS_POLICY,
  id: id('tool-access'),
  version: '1',
  title: 'Tool access',
  source: SOURCE,
  permissions: [
    { id: 'borrow', label: 'Borrow a tool' },
    { id: 'removeLoan', label: 'Remove a loan' },
    { id: 'lend', label: 'Lend a tool' },
    { id: 'edit', label: 'Edit a record' },
  ],
  roles: [
    { id: 'librarian', label: 'Librarian', description: '', grants: ['borrow', 'removeLoan', 'lend', 'edit'].map((permission) => ({ permission, when: null })) },
    {
      id: 'volunteer',
      label: 'Volunteer',
      description: '',
      grants: [
        { permission: 'borrow', when: null },
        { permission: 'removeLoan', when: { kind: 'sameAs', field: PLATFORM_FACT.ACTOR_ID, other: PLATFORM_FACT.ENTRY_AUTHOR } },
      ],
    },
  ],
  roleRules: [
    { id: 'librarians', label: 'Librarians', when: { kind: 'equals', field: 'duty', value: 'librarian' }, roleIds: ['librarian'] },
    { id: 'volunteers', label: 'Volunteers', when: { kind: 'equals', field: 'duty', value: 'volunteer' }, roleIds: ['volunteer'] },
  ],
};

const SAFETY: ComplianceStandardDefinition = {
  kind: DEFINITION_KIND.STANDARD,
  id: id('safety'),
  version: '1',
  title: 'Safety',
  shortName: 'Safety',
  source: SOURCE,
  appliesWhen: null,
  eligibility: null,
  rules: [
    {
      id: 'reach',
      title: 'Reach recorded',
      citation: SOURCE,
      scope: RULE_SCOPE.EVENT,
      stream: 'visits',
      check: { kind: RULE_CHECK_KIND.REQUIRED, field: 'reachInches' },
      appliesWhen: null,
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: 'No reach.',
      guidance: 'Measure it.',
      fixTarget: { form: 'visit', field: 'reachInches' },
    },
  ],
  interpretations: [],
};

const HOUSEHOLD: EntityDefinition = {
  kind: DEFINITION_KIND.ENTITY,
  id: id('household'),
  version: '1',
  title: 'Household',
  source: SOURCE,
  label: 'Household',
  pluralLabel: 'Households',
  formId: id('household'),
  editPermission: 'edit',
  parentKind: null,
  startField: 'joined',
  streams: [],
  facts: [],
  standardIds: [],
};

const MEMBER: EntityDefinition = {
  ...HOUSEHOLD,
  id: id('member'),
  title: 'Member',
  label: 'Member',
  pluralLabel: 'Members',
  formId: id('member'),
  parentKind: id('household'),
  startField: null,
  streams: [
    { id: 'visits', label: 'Visits', entryLabel: 'Visit', formId: id('visit'), dateField: 'visitDate', workflowId: null, addPermission: 'edit', editPermission: 'edit', removePermission: 'edit', facts: [] },
    {
      id: 'loans',
      label: 'Loans',
      entryLabel: 'Loan',
      formId: id('loan'),
      dateField: null,
      workflowId: id('loan-workflow'),
      addPermission: 'borrow',
      editPermission: 'edit',
      removePermission: 'removeLoan',
      facts: [{ key: 'everOut', label: 'Ever lent', derivation: { kind: FACT_DERIVATION_KIND.STATE_REACHED, states: ['out'] } }],
    },
  ],
  facts: [
    { key: 'zone', label: 'Household zone', derivation: { kind: FACT_DERIVATION_KIND.PARENT_VALUE, field: 'zone' } },
    { key: 'firstReach', label: 'First reach', derivation: { kind: FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE, stream: 'visits', field: 'reachInches', where: { kind: 'answered', field: 'reachInches' }, onOrAfter: null } },
    { key: 'reachRatio', label: 'Reach ratio', derivation: { kind: FACT_DERIVATION_KIND.CALCULATED, calculation: { kind: 'quotient', numerator: ['firstReach'], denominator: ['heightInches'], factor: 1, decimals: 2 } } },
    { key: 'hasBorrowed', label: 'Has borrowed', derivation: { kind: FACT_DERIVATION_KIND.ANY_ENTRY, stream: 'loans', where: null } },
    { key: 'borrowerAssigned', label: 'A volunteer is assigned to the household', derivation: { kind: FACT_DERIVATION_KIND.PERMISSION_HELD, permission: 'borrow', assignedTo: ACCESS_SCOPE_KIND.ENTITY } },
    { key: 'lenderOnDuty', label: 'A lender is on duty', derivation: { kind: FACT_DERIVATION_KIND.PERMISSION_HELD, permission: 'lend', assignedTo: null } },
  ],
  standardIds: [id('safety')],
};

const CONFIGURATION: PlatformConfiguration = {
  kind: DEFINITION_KIND.CONFIGURATION,
  id: id('tool-library'),
  version: '1',
  title: 'Tool library',
  source: SOURCE,
  tenantKinds: [
    { kind: DEFINITION_KIND.TENANT_KIND, id: id('network'), version: '1', title: 'Network', source: SOURCE, label: 'Network', parentKinds: [], formId: id('network') },
    { kind: DEFINITION_KIND.TENANT_KIND, id: id('library'), version: '1', title: 'Library', source: SOURCE, label: 'Library', parentKinds: [id('network')], formId: id('library') },
  ],
  entities: [HOUSEHOLD, MEMBER],
  forms: FORMS,
  workflows: [LOAN_WORKFLOW],
  accessPolicy: POLICY,
  actorFormId: id('person'),
  standards: [SAFETY],
};

const NETWORK = toTenantId('t-network');
const NORTH = toTenantId('t-north');
const SOUTH = toTenantId('t-south');
const LIBRARIAN = toActorId('a-librarian');
const VOLUNTEER = toActorId('a-volunteer');
const RESTING = toActorId('a-resting');
const date = toPlainDate;

const DATA: PlatformData = {
  tenants: [
    { tenantId: NETWORK, kind: id('network'), parentId: null, name: 'Network', values: {} },
    { tenantId: NORTH, kind: id('library'), parentId: NETWORK, name: 'North', values: {} },
    { tenantId: SOUTH, kind: id('library'), parentId: NETWORK, name: 'South', values: {} },
  ],
  actors: [
    { actorId: LIBRARIAN, tenantId: NETWORK, name: 'Librarian', values: { duty: 'librarian' } },
    { actorId: VOLUNTEER, tenantId: NORTH, name: 'Volunteer', values: { duty: 'volunteer' } },
    { actorId: RESTING, tenantId: NORTH, name: 'Resting volunteer', values: { duty: 'volunteer' } },
  ],
  assignments: [
    { assignmentId: toAssignmentId('s1'), actorId: LIBRARIAN, scope: { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: NETWORK }, active: true },
    { assignmentId: toAssignmentId('s2'), actorId: VOLUNTEER, scope: { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: toEntityId('h-north') }, active: true },
    { assignmentId: toAssignmentId('s3'), actorId: RESTING, scope: { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: toEntityId('h-north') }, active: false },
  ],
  entities: [
    { entityId: toEntityId('h-north'), kind: id('household'), tenantId: NORTH, parentId: null, values: { zone: 'Ridge', joined: '2026-01-10' } },
    { entityId: toEntityId('h-south'), kind: id('household'), tenantId: SOUTH, parentId: null, values: { zone: 'Bay', joined: '2026-05-01' } },
    { entityId: toEntityId('m-north'), kind: id('member'), tenantId: NORTH, parentId: toEntityId('h-north'), values: { memberName: 'Ana', heightInches: 64 } },
    { entityId: toEntityId('m-south'), kind: id('member'), tenantId: SOUTH, parentId: toEntityId('h-south'), values: { memberName: 'Kai', heightInches: 70 } },
  ],
  entries: [
    { entryId: toEntryId('v2'), streamId: 'visits', entityId: toEntityId('m-north'), date: date('2026-03-01'), authorId: LIBRARIAN, values: { visitDate: '2026-03-01', reachInches: 80 }, status: null, history: [] },
    { entryId: toEntryId('v1'), streamId: 'visits', entityId: toEntityId('m-north'), date: date('2026-02-01'), authorId: LIBRARIAN, values: { visitDate: '2026-02-01', reachInches: null }, status: null, history: [] },
    { entryId: toEntryId('l1'), streamId: 'loans', entityId: toEntityId('m-north'), date: date('2026-03-02'), authorId: VOLUNTEER, values: { tool: 'Drill', value: 120, days: 3 }, status: 'requested', history: [] },
  ],
};

const entity = (entityId: string) => {
  const found = DATA.entities.find((candidate) => candidate.entityId === entityId);
  if (!found) throw new Error(entityId);
  return found;
};
const entry = (data: PlatformData, entryId: string) => {
  const found = data.entries.find((candidate) => candidate.entryId === entryId);
  if (!found) throw new Error(entryId);
  return found;
};
const changed = (change: ReturnType<typeof addEntry>): PlatformData => {
  if (!change.ok) throw new Error(change.problems.join(' '));
  return change.data;
};

describe('a configuration bundle', () => {
  it('validates when every reference resolves', () => {
    expect(validateConfiguration(CONFIGURATION)).toEqual([]);
  });

  it('names each reference that does not', () => {
    const broken: PlatformConfiguration = {
      ...CONFIGURATION,
      entities: [HOUSEHOLD, { ...MEMBER, streams: [{ ...MEMBER.streams[0]!, formId: id('missing'), addPermission: 'fly' }], standardIds: [id('safety'), id('nothing')] }],
      accessPolicy: {
        ...POLICY,
        roles: [{ id: 'clerk', label: 'Clerk', description: '', grants: [{ permission: 'lend', when: { kind: 'equals', field: 'shoeSize', value: 9 } }] }],
        roleRules: [{ id: 'clerks', label: 'Clerks', when: { kind: 'equals', field: 'zone', value: 'Ridge' }, roleIds: ['clerk', 'janitor'] }],
      },
    };
    const problems = validateConfiguration(broken);
    expect(problems).toContain('Entity "member", stream "visits" names the form "missing", which is not in the bundle.');
    expect(problems).toContain('Entity "member", stream "visits" needs "fly", which the access policy does not define.');
    expect(problems).toContain('Entity "member" is evaluated by "nothing", which is not in the bundle.');
    expect(problems).toContain('"shoeSize" is read by a definition, and no form, fact or platform fact supplies it.');
    expect(problems).toContain('Role rule "clerks" gives the role "janitor", which the access policy does not define.');
    expect(problems).toContain('Role rule "clerks" reads "zone", which is not on the actor form.');
  });
});

describe('scope', () => {
  it('reaches down the tenant tree and the entity tree, and nowhere else', () => {
    expect(isPermittedOnRecord(CONFIGURATION, DATA, LIBRARIAN, 'lend', entity('m-south'))).toBe(true);
    expect(isPermittedOnRecord(CONFIGURATION, DATA, VOLUNTEER, 'borrow', entity('m-north'))).toBe(true);
    expect(isPermittedOnRecord(CONFIGURATION, DATA, VOLUNTEER, 'borrow', entity('m-south'))).toBe(false);
  });

  it('says why an action is not available, in the access policy’s words', () => {
    const own = entry(DATA, 'l1');
    expect(resolvePermissionOption(CONFIGURATION, DATA, VOLUNTEER, 'removeLoan', entity('m-north'), own)).toEqual({ permission: 'removeLoan', available: true, reason: null });
    expect(resolvePermissionOption(CONFIGURATION, DATA, RESTING, 'removeLoan', entity('m-north'), own)).toEqual({ permission: 'removeLoan', available: false, reason: 'Needs permission to remove a loan.' });
  });

  it('grants nothing through an inactive assignment', () => {
    expect(isPermittedOnRecord(CONFIGURATION, DATA, RESTING, 'borrow', entity('m-north'))).toBe(false);
  });

  it('gives each person the roles their record matches, wherever they are assigned', () => {
    expect(resolveRuleRoles(POLICY, { actorId: VOLUNTEER, tenantId: NORTH, name: 'Volunteer', values: { duty: 'volunteer' } })).toEqual(['volunteer']);
    expect(isPermittedOnRecord(CONFIGURATION, DATA, VOLUNTEER, 'lend', entity('m-north'))).toBe(false);
    const promoted: PlatformData = { ...DATA, actors: DATA.actors.map((actor) => (actor.actorId === VOLUNTEER ? { ...actor, values: { duty: 'librarian' } } : actor)) };
    expect(isPermittedOnRecord(CONFIGURATION, promoted, VOLUNTEER, 'lend', entity('m-north'))).toBe(true);
    expect(isPermittedOnRecord(CONFIGURATION, promoted, VOLUNTEER, 'lend', entity('m-south'))).toBe(false);
  });
});

describe('facts', () => {
  it('reads the parent, the first matching entry in date order, a calculation over both, any entry, and who is on duty', () => {
    const facts = resolveEntityFacts(CONFIGURATION, DATA, entity('m-north'), date('2026-04-01'));
    expect(facts).toMatchObject({ zone: 'Ridge', firstReach: 80, reachRatio: 1.25, hasBorrowed: true, lenderOnDuty: true, borrowerAssigned: true, [PLATFORM_FACT.AS_OF_DATE]: '2026-04-01' });
  });

  it('counts only the people assigned to the entity itself when the fact says so', () => {
    expect(resolveEntityFacts(CONFIGURATION, DATA, entity('m-south'), date('2026-04-01'))).toMatchObject({ lenderOnDuty: true, borrowerAssigned: false });
  });

  it('names an entry’s status the way its workflow does', () => {
    expect(describeRecordValue(CONFIGURATION, PLATFORM_FACT.ENTRY_STATUS, 'out')).toBe('Out');
  });

  it('works out an entry’s calculated fields and the platform’s entry facts', () => {
    expect(resolveEntryAnswers(CONFIGURATION, entry(DATA, 'l1'))).toMatchObject({ valueDays: 360, [PLATFORM_FACT.ENTRY_STATUS]: 'requested', [PLATFORM_FACT.ENTRY_AUTHOR]: VOLUNTEER, everOut: false });
  });

  it('feeds the compliance engine, rules reading only their stream', () => {
    const [safety] = evaluateEntity(CONFIGURATION, DATA, entity('m-north'), date('2026-04-01'));
    expect(safety?.findings.map((finding) => finding.eventId)).toEqual(['v1']);
  });
});

describe('changes', () => {
  it('adds an entry in its workflow’s first state, dated the day it is added', () => {
    const data = changed(addEntry(CONFIGURATION, DATA, { actorId: VOLUNTEER, entityId: toEntityId('m-north'), streamId: 'loans', entryId: toEntryId('l2'), values: { tool: 'Saw', value: 60, days: 1 }, date: date('2026-03-05') }));
    expect(entry(data, 'l2')).toMatchObject({ status: 'requested', date: '2026-03-05', authorId: VOLUNTEER });
    expect(addEntry(CONFIGURATION, DATA, { actorId: VOLUNTEER, entityId: toEntityId('m-south'), streamId: 'loans', entryId: toEntryId('l3'), values: {}, date: date('2026-03-05') })).toEqual({ ok: false, problems: ['Needs permission to borrow a tool.'] });
  });

  it('lets a volunteer remove only the loans they added', () => {
    const byLibrarian = changed(addEntry(CONFIGURATION, DATA, { actorId: LIBRARIAN, entityId: toEntityId('m-north'), streamId: 'loans', entryId: toEntryId('l4'), values: { tool: 'Ladder' }, date: date('2026-03-06') }));
    expect(removeEntry(CONFIGURATION, byLibrarian, { actorId: VOLUNTEER, entryId: toEntryId('l1') }).ok).toBe(true);
    expect(removeEntry(CONFIGURATION, byLibrarian, { actorId: VOLUNTEER, entryId: toEntryId('l4') })).toEqual({ ok: false, problems: ['Needs permission to remove a loan.'] });
  });

  it('runs the workflow with its guard, and keeps every step', () => {
    const costly = changed(addEntry(CONFIGURATION, DATA, { actorId: LIBRARIAN, entityId: toEntityId('m-north'), streamId: 'loans', entryId: toEntryId('l5'), values: { tool: 'Generator', value: 900 }, date: date('2026-03-07') }));
    expect(resolveEntryOptions(CONFIGURATION, costly, LIBRARIAN, entry(costly, 'l5'))).toMatchObject([{ available: false, reason: 'Costly tools are lent by a librarian in person.' }]);
    const lent = changed(applyEntryTransition(CONFIGURATION, DATA, { actorId: LIBRARIAN, entryId: toEntryId('l1'), transitionId: 'lend', date: date('2026-03-03'), note: '' }));
    const returned = changed(applyEntryTransition(CONFIGURATION, lent, { actorId: LIBRARIAN, entryId: toEntryId('l1'), transitionId: 'return', date: date('2026-03-06'), note: '' }));
    expect(entry(returned, 'l1').history.map((step) => step.to)).toEqual(['out', 'returned']);
    expect(resolveEntryAnswers(CONFIGURATION, entry(returned, 'l1'))).toMatchObject({ everOut: true });
  });
});

describe('records as of a date', () => {
  it('keeps entities that had begun, their children, and entries dated before it', () => {
    const asOf = resolveDataAsOf(CONFIGURATION, DATA, date('2026-03-01'));
    expect(asOf.entities.map((candidate) => candidate.entityId)).toEqual(['h-north', 'm-north']);
    expect(asOf.entries.map((candidate) => candidate.entryId)).toEqual(['v1']);
  });
});
