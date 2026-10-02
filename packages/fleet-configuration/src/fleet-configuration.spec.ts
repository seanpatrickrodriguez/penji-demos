import { ACCESS_SCOPE_KIND, CREW_FIELD, FLEET_ENTITY, FLEET_PERMISSION, FLEET_POSITION, FLEET_ROLE, FLEET_STREAM, FLEET_TENANT_KIND, SUPPLY_CATEGORY, SUPPLY_STATUS, WANT_ITEM_FIELD, WANT_LIST_TRANSITION } from '@penji-demos/constants';
import { RecordChange, addEntry, applyEntryTransition, isPermittedOnRecord, removeEntry, resolveEntryOptions, resolveRuleRoles, validateConfiguration } from '@penji-demos/record-engine';
import { toPlainDate } from '@penji-demos/time';
import { ActorId, Answers, Assignment, EntityRecord, PlatformData, toActorId, toAssignmentId, toDefinitionId, toEntityId, toEntryId, toTenantId } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { FLEET_CONFIGURATION } from './fleet-configuration';
import { WANT_LIST_WORKFLOW } from './want-list-workflow';

const T = WANT_LIST_TRANSITION;
const R = FLEET_ROLE;
const DAY = toPlainDate('2026-09-01');
const OWNER = toTenantId('owner');
const SHOP = toTenantId('shop');
const vessel = (id: string): EntityRecord => ({ entityId: toEntityId(id), kind: toDefinitionId(FLEET_ENTITY.VESSEL), tenantId: OWNER, parentId: null, values: {} });
const TUG = vessel('tug');
const OTHER_TUG = vessel('other-tug');

// Each person is a position, placed on a vessel or over the fleet; the access policy's role rules give the roles.
let count = 0;
const onVessel = (position: string, target = TUG, active = true) => ({
  position,
  assign: (actorId: ActorId): Assignment => ({ assignmentId: toAssignmentId(`s${count++}`), actorId, scope: { kind: ACCESS_SCOPE_KIND.ENTITY, entityId: target.entityId }, active }),
});
const overFleet = (position: string) => ({
  position,
  assign: (actorId: ActorId): Assignment => ({ assignmentId: toAssignmentId(`s${count++}`), actorId, scope: { kind: ACCESS_SCOPE_KIND.TENANT, tenantId: OWNER }, active: true }),
});

const O = FLEET_POSITION;
const PEOPLE = {
  COOK: onVessel(O.COOK),
  DECKHAND: onVessel(O.SECOND_MATE),
  CAPTAIN: onVessel(O.CAPTAIN),
  OFF_ROTATION_CAPTAIN: onVessel(O.CAPTAIN, TUG, false),
  OTHER_CAPTAIN: onVessel(O.CAPTAIN, OTHER_TUG),
  PIC: onVessel(O.TANKERMAN_PIC),
  SUPPLY_MANAGER: overFleet(O.SUPPLY_MANAGER),
  PORT_ENGINEER: overFleet(O.PORT_ENGINEER),
  OWNER_REPRESENTATIVE: overFleet(O.OWNER_REPRESENTATIVE),
  WELDER: overFleet(O.SENIOR_WELDER),
};
type Person = keyof typeof PEOPLE;
const actor = (person: Person) => toActorId(person.toLowerCase());

const DATA: PlatformData = {
  tenants: [
    { tenantId: OWNER, kind: toDefinitionId(FLEET_TENANT_KIND.COMPANY), parentId: null, name: 'Owner', values: {} },
    { tenantId: SHOP, kind: toDefinitionId(FLEET_TENANT_KIND.COMPANY), parentId: OWNER, name: 'Shop', values: {} },
  ],
  actors: Object.entries(PEOPLE).map(([person, { position }]) => ({ actorId: toActorId(person.toLowerCase()), tenantId: OWNER, name: person, values: { [CREW_FIELD.POSITION]: position } })),
  assignments: Object.entries(PEOPLE).map(([person, { assign }]) => assign(toActorId(person.toLowerCase()))),
  entities: [TUG, OTHER_TUG],
  entries: [],
};

const ok = (change: RecordChange): PlatformData => {
  if (!change.ok) throw new Error(change.problems.join(' '));
  return change.data;
};
const ITEM = toEntryId('item');
const withItem = (values: Answers = {}, by: Person = 'COOK'): PlatformData =>
  ok(
    addEntry(FLEET_CONFIGURATION, DATA, {
      actorId: actor(by),
      entityId: TUG.entityId,
      streamId: FLEET_STREAM.WANT_LIST,
      entryId: ITEM,
      values: { [WANT_ITEM_FIELD.DESCRIPTION]: 'Hand soap', [WANT_ITEM_FIELD.CATEGORY]: SUPPLY_CATEGORY.CLEANING, [WANT_ITEM_FIELD.QUANTITY]: 2, [WANT_ITEM_FIELD.UNIT_COST]: 30, [WANT_ITEM_FIELD.LIMITED]: false, ...values },
      date: DAY,
    }),
  );
const step = (data: PlatformData, by: Person, transitionId: string, note = ''): PlatformData =>
  ok(applyEntryTransition(FLEET_CONFIGURATION, data, { actorId: actor(by), entryId: ITEM, transitionId, date: DAY, note }));
const entry = (data: PlatformData) => {
  const found = data.entries.find((candidate) => candidate.entryId === ITEM);
  if (!found) throw new Error('No item.');
  return found;
};
const option = (data: PlatformData, by: Person, transitionId: string) => resolveEntryOptions(FLEET_CONFIGURATION, data, actor(by), entry(data)).find((candidate) => candidate.transition.id === transitionId);
const may = (by: Person, permission: string, target = TUG) => isPermittedOnRecord(FLEET_CONFIGURATION, DATA, actor(by), permission, target);

describe('the fleet configuration', () => {
  it('resolves every reference, and every field its policies, grants, guards and facts read is supplied', () => {
    expect(validateConfiguration(FLEET_CONFIGURATION)).toEqual([]);
  });

  it('uses the shop’s statuses as the workflow’s states, and grants every permission to someone', () => {
    expect(WANT_LIST_WORKFLOW.states.map((state) => state.id).sort()).toEqual(Object.values(SUPPLY_STATUS).sort());
    const granted = new Set(FLEET_CONFIGURATION.accessPolicy.roles.flatMap((role) => role.grants.map((grant) => grant.permission)));
    expect(Object.values(FLEET_PERMISSION).filter((permission) => !granted.has(permission))).toEqual([]);
  });

  it('gives every position its roles through one role rule, and the officers who send the list the sending officer’s role', () => {
    const rolesOf = (position: string) => resolveRuleRoles(FLEET_CONFIGURATION.accessPolicy, { actorId: toActorId('p'), tenantId: OWNER, name: 'p', values: { [CREW_FIELD.POSITION]: position } });
    for (const position of Object.values(FLEET_POSITION)) expect(rolesOf(position).length, position).toBeGreaterThan(0);
    const senders = Object.values(FLEET_POSITION).filter((position) => rolesOf(position).includes(R.SENDING_OFFICER));
    expect(senders.sort()).toEqual([FLEET_POSITION.CAPTAIN, FLEET_POSITION.CHIEF_ENGINEER, FLEET_POSITION.FIRST_MATE, FLEET_POSITION.TANKERMAN_PIC].sort());
  });
});

describe('who may do what', () => {
  it('lets anyone aboard add to the list, and no one off rotation or on another vessel', () => {
    expect(may('COOK', FLEET_PERMISSION.ADD_ITEM)).toBe(true);
    expect(may('OFF_ROTATION_CAPTAIN', FLEET_PERMISSION.ADD_ITEM)).toBe(false);
    expect(may('OTHER_CAPTAIN', FLEET_PERMISSION.ADD_ITEM)).toBe(false);
  });

  it('lets crew remove only their own rows, and only before the list is sent', () => {
    expect(removeEntry(FLEET_CONFIGURATION, withItem(), { actorId: actor('COOK'), entryId: ITEM }).ok).toBe(true);
    expect(removeEntry(FLEET_CONFIGURATION, withItem(), { actorId: actor('DECKHAND'), entryId: ITEM })).toEqual({ ok: false, problems: ['Needs permission to remove an item.'] });
    expect(removeEntry(FLEET_CONFIGURATION, step(withItem(), 'CAPTAIN', T.SEND), { actorId: actor('COOK'), entryId: ITEM }).ok).toBe(false);
  });

  it('lets an officer aboard remove any unsent row on the vessel', () => {
    expect(removeEntry(FLEET_CONFIGURATION, withItem(), { actorId: actor('CAPTAIN'), entryId: ITEM }).ok).toBe(true);
    expect(removeEntry(FLEET_CONFIGURATION, withItem(), { actorId: actor('OTHER_CAPTAIN'), entryId: ITEM }).ok).toBe(false);
  });

  it('lets only a sending officer aboard send the list', () => {
    expect(option(withItem(), 'CAPTAIN', T.SEND)?.available).toBe(true);
    expect(option(withItem(), 'COOK', T.SEND)).toMatchObject({ available: false, reason: 'Needs permission to send the want list.' });
    expect(option(withItem(), 'OFF_ROTATION_CAPTAIN', T.SEND)?.available).toBe(false);
    expect(may('PIC', FLEET_PERMISSION.SEND_LIST)).toBe(true);
  });

  it('keeps the shop’s trades to stocking and profiles, over every vessel', () => {
    expect(may('WELDER', FLEET_PERMISSION.EDIT_PROFILE, OTHER_TUG)).toBe(true);
    const acknowledged = step(step(withItem(), 'CAPTAIN', T.SEND), 'SUPPLY_MANAGER', T.ACKNOWLEDGE);
    expect(option(acknowledged, 'WELDER', T.STOCK)?.available).toBe(true);
    expect(option(acknowledged, 'WELDER', T.DENY)?.available).toBe(false);
  });
});

describe('the escalation hard block', () => {
  const sentAndAcknowledged = (values: Answers) => step(step(withItem(values), 'CAPTAIN', T.SEND), 'SUPPLY_MANAGER', T.ACKNOWLEDGE);
  const mooring = sentAndAcknowledged({ [WANT_ITEM_FIELD.CATEGORY]: SUPPLY_CATEGORY.MOORING, [WANT_ITEM_FIELD.UNIT_COST]: 900 });
  const costly = sentAndAcknowledged({ [WANT_ITEM_FIELD.CATEGORY]: SUPPLY_CATEGORY.ENGINE, [WANT_ITEM_FIELD.QUANTITY]: 1, [WANT_ITEM_FIELD.UNIT_COST]: 3100 });

  it('keeps mooring lines and costly items out of the locker until approved', () => {
    for (const data of [mooring, costly]) {
      expect(option(data, 'SUPPLY_MANAGER', T.STOCK)).toMatchObject({ available: false, reason: expect.stringContaining('port engineer’s approval') });
    }
    expect(option(sentAndAcknowledged({}), 'SUPPLY_MANAGER', T.STOCK)?.available).toBe(true);
  });

  it('opens once the port engineer or the owner’s representative approves', () => {
    const requested = step(mooring, 'SUPPLY_MANAGER', T.REQUEST_APPROVAL);
    expect(option(requested, 'SUPPLY_MANAGER', T.APPROVE)?.available).toBe(false);
    expect(option(requested, 'OWNER_REPRESENTATIVE', T.APPROVE)?.available).toBe(true);
    const approved = step(requested, 'PORT_ENGINEER', T.APPROVE);
    expect(option(approved, 'SUPPLY_MANAGER', T.STOCK)?.available).toBe(true);
    const backOrdered = step(approved, 'SUPPLY_MANAGER', T.BACK_ORDER, 'Vendor ships next week.');
    expect(option(backOrdered, 'SUPPLY_MANAGER', T.STOCK)?.available).toBe(true);
  });

  it('asks for a reason to deny, and keeps who denied it', () => {
    expect(applyEntryTransition(FLEET_CONFIGURATION, costly, { actorId: actor('SUPPLY_MANAGER'), entryId: ITEM, transitionId: T.DENY, date: DAY, note: ' ' })).toEqual({ ok: false, problems: ['Add a note saying why.'] });
    const denied = entry(step(costly, 'SUPPLY_MANAGER', T.DENY, 'Overhauling the old one.'));
    expect(denied.status).toBe(SUPPLY_STATUS.DENIED);
    expect(denied.history.at(-1)).toMatchObject({ actorId: actor('SUPPLY_MANAGER'), from: SUPPLY_STATUS.ACKNOWLEDGED, note: 'Overhauling the old one.' });
  });
});
