import { DEFINITION_KIND, FLEET_FACT, FLEET_PERMISSION, FLEET_POSITION, FLEET_ROLE, SUPPLY_STATUS, WANT_ITEM_FIELD } from '@penji-demos/constants';
import { AccessPolicyDefinition, Condition, FleetPosition, PermissionGrant, toDefinitionId } from '@penji-demos/types';
import { FLEET_POLICY_SOURCE } from './fleet-policy-source';

// M1: who may do what with a vessel's want list.  The same workflow engine
// that would run an article review reads this policy; the conditions on the
// grants are the platform's condition language, read over the actor's facts
// and the item's values together.

const P = FLEET_PERMISSION;
const W = WANT_ITEM_FIELD;

const always = (permission: string): PermissionGrant => ({ permission, when: null });
const when = (permission: string, condition: Condition): PermissionGrant => ({ permission, when: condition });

const aboard: Condition = { kind: 'equals', field: FLEET_FACT.ON_THIS_VESSEL, value: true };
const addedByActor: Condition = { kind: 'sameAs', field: FLEET_FACT.ACTOR_ID, other: W.REQUESTED_BY };
const notYetSent: Condition = { kind: 'equals', field: W.STATUS, value: SUPPLY_STATUS.NEW };
const awaitingApproval: Condition = { kind: 'equals', field: W.STATUS, value: SUPPLY_STATUS.APPROVAL_REQUEST };

export const FLEET_ACCESS_POLICY: AccessPolicyDefinition = {
  kind: DEFINITION_KIND.ACCESS_POLICY,
  id: toDefinitionId('fleet-want-list-access'),
  version: '1',
  title: 'Want-list access',
  source: FLEET_POLICY_SOURCE,
  permissions: [
    { id: P.ADD_ITEM, label: 'Add to the want list' },
    { id: P.REMOVE_ITEM, label: 'Remove an item' },
    { id: P.SEND_LIST, label: 'Send the want list' },
    { id: P.ACKNOWLEDGE, label: 'Acknowledge an item' },
    { id: P.STOCK, label: 'Put an item in the locker' },
    { id: P.BACK_ORDER, label: 'Back-order an item' },
    { id: P.REQUEST_APPROVAL, label: 'Ask the port engineer to approve' },
    { id: P.DECIDE, label: 'Approve or deny an item' },
    { id: P.CONFIRM_RECEIPT, label: 'Confirm what arrived' },
    { id: P.EDIT_PROFILE, label: 'Edit the vessel profile' },
  ],
  roles: [
    {
      id: FLEET_ROLE.CREW_MEMBER,
      label: 'Crew member',
      description: 'Anyone aboard: adds to the list, removes their own items before the list is sent, and confirms what arrived.',
      grants: [
        when(P.ADD_ITEM, aboard),
        when(P.REMOVE_ITEM, { kind: 'all', conditions: [aboard, addedByActor, notYetSent] }),
        when(P.CONFIRM_RECEIPT, aboard),
      ],
    },
    {
      id: FLEET_ROLE.SENDING_OFFICER,
      label: 'Sending officer',
      description: 'The captain, first mate, chief engineer or tankerman in charge: sends the list to the shop and keeps the profile current.',
      grants: [when(P.SEND_LIST, aboard), when(P.REMOVE_ITEM, { kind: 'all', conditions: [aboard, notYetSent] }), when(P.EDIT_PROFILE, aboard)],
    },
    {
      id: FLEET_ROLE.SHOP_STAFF,
      label: 'Shop staff',
      description: 'The senior trades: stock what the shop has and keep vessel profiles current.',
      grants: [always(P.STOCK), always(P.EDIT_PROFILE)],
    },
    {
      id: FLEET_ROLE.SUPPLY_MANAGER,
      label: 'Supply manager',
      description: 'Works every list: acknowledges, stocks, back-orders, denies, and sends what needs approval to the port engineer.',
      grants: [
        always(P.ACKNOWLEDGE),
        always(P.STOCK),
        always(P.BACK_ORDER),
        always(P.REQUEST_APPROVAL),
        when(P.DECIDE, { kind: 'not', condition: awaitingApproval }),
        always(P.EDIT_PROFILE),
      ],
    },
    {
      id: FLEET_ROLE.PORT_ENGINEER,
      label: 'Port engineer',
      description: 'The highest authority over the fleet: every permission, on every vessel.',
      grants: Object.values(P).map(always),
    },
    {
      id: FLEET_ROLE.OWNER_REPRESENTATIVE,
      label: "Owner's representative",
      description: 'Decides with the port engineer on items sent for approval.',
      grants: [when(P.DECIDE, awaitingApproval)],
    },
  ],
};

// The roles each position holds.  Officers who send the list are crew members too.
export const POSITION_ROLES: Readonly<Record<FleetPosition, readonly string[]>> = {
  [FLEET_POSITION.CAPTAIN]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [FLEET_POSITION.FIRST_MATE]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [FLEET_POSITION.SECOND_MATE]: [FLEET_ROLE.CREW_MEMBER],
  [FLEET_POSITION.CHIEF_ENGINEER]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [FLEET_POSITION.ASSISTANT_ENGINEER]: [FLEET_ROLE.CREW_MEMBER],
  [FLEET_POSITION.COOK]: [FLEET_ROLE.CREW_MEMBER],
  [FLEET_POSITION.TANKERMAN]: [FLEET_ROLE.CREW_MEMBER],
  [FLEET_POSITION.TANKERMAN_PIC]: [FLEET_ROLE.CREW_MEMBER, FLEET_ROLE.SENDING_OFFICER],
  [FLEET_POSITION.SUPPLY_MANAGER]: [FLEET_ROLE.SUPPLY_MANAGER],
  [FLEET_POSITION.PORT_ENGINEER]: [FLEET_ROLE.PORT_ENGINEER],
  [FLEET_POSITION.OWNER_REPRESENTATIVE]: [FLEET_ROLE.OWNER_REPRESENTATIVE],
  [FLEET_POSITION.SENIOR_WELDER]: [FLEET_ROLE.SHOP_STAFF],
  [FLEET_POSITION.SENIOR_ELECTRICIAN]: [FLEET_ROLE.SHOP_STAFF],
};
