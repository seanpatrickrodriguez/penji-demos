import { FLEET_PERMISSION, FLEET_POSITION, SUPPLY_CATEGORY, SUPPLY_STATUS, WANT_LIST_TRANSITION } from '@penji-demos/constants';
import { FLEET_FACT_LABELS, VESSEL_PROFILE_FORM, WANT_ITEM_FORM } from '@penji-demos/fleet-records';
import { resolveConditionFields, validateDefinition } from '@penji-demos/form-engine';
import { toPlainDate } from '@penji-demos/time';
import { Condition, PersonRecord, RuleCheck, WantItemRecord, toCompanyId, toPersonId, toVesselId, toWantItemId } from '@penji-demos/types';
import { validateWorkflowDefinition } from '@penji-demos/workflow-engine';
import { describe, expect, it } from 'vitest';
import { FLEET_ACCESS_POLICY, POSITION_ROLES } from './fleet-access-policy';
import { FLEET_STANDARDS, applyItemTransition, isPermittedOnVessel, isRemovable, resolveItemOptions } from './resolve-fleet-context';
import { WANT_LIST_WORKFLOW } from './want-list-workflow';

const P = FLEET_POSITION;
const T = WANT_LIST_TRANSITION;
const TUG = toVesselId('tug');
const OTHER_TUG = toVesselId('other-tug');
const DAY = toPlainDate('2026-09-01');

const person = (id: string, position: PersonRecord['position'], vesselIds: readonly string[] = [TUG], aboard = true): PersonRecord => ({
  personId: toPersonId(id),
  name: id,
  position,
  companyId: toCompanyId('company'),
  vesselIds: vesselIds.map(toVesselId),
  aboard,
});

const COOK = person('cook', P.COOK);
const DECKHAND = person('second-mate', P.SECOND_MATE);
const CAPTAIN = person('captain', P.CAPTAIN);
const OFF_ROTATION_CAPTAIN = person('captain-off', P.CAPTAIN, [TUG], false);
const OTHER_CAPTAIN = person('other-captain', P.CAPTAIN, [OTHER_TUG]);
const SUPPLY_MANAGER = person('supply', P.SUPPLY_MANAGER, []);
const PORT_ENGINEER = person('port', P.PORT_ENGINEER, []);
const OWNER_REPRESENTATIVE = person('owner', P.OWNER_REPRESENTATIVE, []);
const WELDER = person('welder', P.SENIOR_WELDER, []);

const item = (values: Partial<WantItemRecord> = {}): WantItemRecord => ({
  itemId: toWantItemId('item'),
  vesselId: TUG,
  requestedBy: COOK.personId,
  addedDate: DAY,
  description: 'Hand soap',
  category: SUPPLY_CATEGORY.CLEANING,
  quantity: 2,
  unitCost: 30,
  limited: false,
  status: SUPPLY_STATUS.NEW,
  history: [],
  ...values,
});

const option = (actor: PersonRecord, record: WantItemRecord, transitionId: string) =>
  resolveItemOptions(actor, record).find((candidate) => candidate.transition.id === transitionId);

const step = (actor: PersonRecord, record: WantItemRecord, transitionId: string, note = ''): WantItemRecord => {
  const result = applyItemTransition(actor, record, transitionId, DAY, note);
  if (!result.ok) throw new Error(result.problems.join(' '));
  return result.item;
};

describe('the fleet definitions', () => {
  it('fit together: every step names a state and a permission the policy defines, and every state is reached', () => {
    expect(validateWorkflowDefinition(WANT_LIST_WORKFLOW, FLEET_ACCESS_POLICY)).toEqual([]);
  });

  it('use the shop’s statuses as the workflow’s states, and grant every permission to someone', () => {
    expect(WANT_LIST_WORKFLOW.states.map((state) => state.id).sort()).toEqual(Object.values(SUPPLY_STATUS).sort());
    const granted = new Set(FLEET_ACCESS_POLICY.roles.flatMap((role) => role.grants.map((grant) => grant.permission)));
    expect(Object.values(FLEET_PERMISSION).filter((permission) => !granted.has(permission))).toEqual([]);
  });

  it('give every position a role the policy defines', () => {
    const roles = new Set(FLEET_ACCESS_POLICY.roles.map((role) => role.id));
    for (const position of Object.values(P)) expect(POSITION_ROLES[position].every((role) => roles.has(role)), position).toBe(true);
  });

  it('hold forms the form engine accepts', () => {
    expect(validateDefinition(VESSEL_PROFILE_FORM)).toEqual([]);
    expect(validateDefinition(WANT_ITEM_FORM)).toEqual([]);
  });

  it('read only facts the fleet records supply', () => {
    const checkFields = (check: RuleCheck): readonly string[] => {
      switch (check.kind) {
        case 'condition':
          return resolveConditionFields(check.condition);
        case 'atMostPerWindow':
          return resolveConditionFields(check.counts);
        case 'requiredWhen':
          return [check.field, ...resolveConditionFields(check.when)];
        default:
          return 'field' in check ? [check.field] : [];
      }
    };
    const conditions: readonly Condition[] = [
      ...FLEET_STANDARDS.flatMap((standard) => [standard.appliesWhen, ...standard.rules.map((rule) => rule.appliesWhen)]).filter((condition) => condition !== null),
      ...FLEET_ACCESS_POLICY.roles.flatMap((role) => role.grants.flatMap((grant) => (grant.when ? [grant.when] : []))),
      ...WANT_LIST_WORKFLOW.transitions.flatMap((transition) => (transition.guard ? [transition.guard.condition] : [])),
    ];
    const read = [...conditions.flatMap(resolveConditionFields), ...FLEET_STANDARDS.flatMap((standard) => standard.rules.flatMap((rule) => checkFields(rule.check)))];
    expect([...new Set(read)].filter((field) => !(field in FLEET_FACT_LABELS))).toEqual([]);
  });
});

describe('who may do what', () => {
  it('lets anyone aboard add to the list, and no one off rotation or on another vessel', () => {
    expect(isPermittedOnVessel(COOK, TUG, FLEET_PERMISSION.ADD_ITEM)).toBe(true);
    expect(isPermittedOnVessel(OFF_ROTATION_CAPTAIN, TUG, FLEET_PERMISSION.ADD_ITEM)).toBe(false);
    expect(isPermittedOnVessel(OTHER_CAPTAIN, TUG, FLEET_PERMISSION.ADD_ITEM)).toBe(false);
  });

  it('lets crew remove only their own rows, and only before the list is sent', () => {
    expect(isRemovable(COOK, item())).toBe(true);
    expect(isRemovable(DECKHAND, item())).toBe(false);
    expect(isRemovable(COOK, item({ status: SUPPLY_STATUS.SUBMITTED }))).toBe(false);
  });

  it('lets an officer aboard remove any unsent row on the vessel', () => {
    expect(isRemovable(CAPTAIN, item())).toBe(true);
    expect(isRemovable(OTHER_CAPTAIN, item())).toBe(false);
  });

  it('lets only a sending officer aboard send the list', () => {
    expect(option(CAPTAIN, item(), T.SEND)?.available).toBe(true);
    expect(option(COOK, item(), T.SEND)).toMatchObject({ available: false, reason: 'Needs permission to send the want list.' });
    expect(option(OFF_ROTATION_CAPTAIN, item(), T.SEND)?.available).toBe(false);
    expect(isPermittedOnVessel(person('pic', P.TANKERMAN_PIC), TUG, FLEET_PERMISSION.SEND_LIST)).toBe(true);
  });

  it('keeps the shop’s trades to stocking and profiles', () => {
    expect(isPermittedOnVessel(WELDER, TUG, FLEET_PERMISSION.EDIT_PROFILE)).toBe(true);
    const acknowledged = step(SUPPLY_MANAGER, step(CAPTAIN, item(), T.SEND), T.ACKNOWLEDGE);
    expect(option(WELDER, acknowledged, T.STOCK)?.available).toBe(true);
    expect(option(WELDER, acknowledged, T.DENY)?.available).toBe(false);
  });
});

describe('the escalation hard block', () => {
  const mooring = step(SUPPLY_MANAGER, step(CAPTAIN, item({ category: SUPPLY_CATEGORY.MOORING, unitCost: 900 }), T.SEND), T.ACKNOWLEDGE);
  const costly = step(SUPPLY_MANAGER, step(CAPTAIN, item({ category: SUPPLY_CATEGORY.ENGINE, quantity: 1, unitCost: 3100 }), T.SEND), T.ACKNOWLEDGE);

  it('keeps mooring lines and costly items out of the locker until approved', () => {
    for (const record of [mooring, costly]) {
      expect(option(SUPPLY_MANAGER, record, T.STOCK)).toMatchObject({ available: false, reason: expect.stringContaining('port engineer’s approval') });
    }
    expect(option(SUPPLY_MANAGER, step(CAPTAIN, item(), T.SEND), T.ACKNOWLEDGE)?.available).toBe(true);
  });

  it('opens once the port engineer or the owner’s representative approves', () => {
    const requested = step(SUPPLY_MANAGER, mooring, T.REQUEST_APPROVAL);
    expect(option(SUPPLY_MANAGER, requested, T.APPROVE)?.available).toBe(false);
    expect(option(OWNER_REPRESENTATIVE, requested, T.APPROVE)?.available).toBe(true);
    const approved = step(PORT_ENGINEER, requested, T.APPROVE);
    expect(option(SUPPLY_MANAGER, approved, T.STOCK)?.available).toBe(true);
    const backOrdered = step(SUPPLY_MANAGER, approved, T.BACK_ORDER, 'Vendor ships next week.');
    expect(option(SUPPLY_MANAGER, backOrdered, T.STOCK)?.available).toBe(true);
  });

  it('asks for a reason to deny, and keeps who denied it', () => {
    expect(applyItemTransition(SUPPLY_MANAGER, costly, T.DENY, DAY, ' ')).toEqual({ ok: false, problems: ['Add a note saying why.'] });
    const denied = step(SUPPLY_MANAGER, costly, T.DENY, 'Overhauling the old one.');
    expect(denied.status).toBe(SUPPLY_STATUS.DENIED);
    expect(denied.history.at(-1)).toMatchObject({ actorId: SUPPLY_MANAGER.personId, from: SUPPLY_STATUS.ACKNOWLEDGED, note: 'Overhauling the old one.' });
  });
});
