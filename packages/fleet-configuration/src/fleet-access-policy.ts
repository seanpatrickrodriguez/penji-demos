import { DEFINITION_KIND, FLEET_PERMISSION, FLEET_ROLE, PLATFORM_FACT, SUPPLY_STATUS } from '@penji-demos/constants';
import { AccessPolicyDefinition, Condition, PermissionGrant, toDefinitionId } from '@penji-demos/types';
import { FLEET_POLICY_SOURCE } from './fleet-policy-source';

// M1: who may do what with a vessel and its want list.  Where a role applies
// comes from each person's assignments: crew are assigned to the vessel they
// rotate aboard and hold nothing while off rotation; the shop's people are
// assigned at the company, over every vessel.  The conditions on the grants
// are the platform's condition language, read over the vessel, the item and
// who is acting.

const P = FLEET_PERMISSION;

const always = (permission: string): PermissionGrant => ({ permission, when: null });
const when = (permission: string, condition: Condition): PermissionGrant => ({ permission, when: condition });

const addedByActor: Condition = { kind: 'sameAs', field: PLATFORM_FACT.ACTOR_ID, other: PLATFORM_FACT.ENTRY_AUTHOR };
const notYetSent: Condition = { kind: 'equals', field: PLATFORM_FACT.ENTRY_STATUS, value: SUPPLY_STATUS.NEW };
const awaitingApproval: Condition = { kind: 'equals', field: PLATFORM_FACT.ENTRY_STATUS, value: SUPPLY_STATUS.APPROVAL_REQUEST };
const ownUnsentItem: Condition = { kind: 'all', conditions: [addedByActor, notYetSent] };

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
    { id: P.EDIT_ITEM, label: 'Edit an item' },
    { id: P.EDIT_PROFILE, label: 'Edit the vessel profile' },
  ],
  roles: [
    {
      id: FLEET_ROLE.CREW_MEMBER,
      label: 'Crew member',
      description: 'Anyone aboard: adds to the list, changes or removes their own items before the list is sent, and confirms what arrived.',
      grants: [always(P.ADD_ITEM), when(P.EDIT_ITEM, ownUnsentItem), when(P.REMOVE_ITEM, ownUnsentItem), always(P.CONFIRM_RECEIPT)],
    },
    {
      id: FLEET_ROLE.SENDING_OFFICER,
      label: 'Sending officer',
      description: 'The captain, first mate, chief engineer or tankerman in charge: sends the list to the shop and keeps the profile current.',
      grants: [always(P.SEND_LIST), when(P.EDIT_ITEM, notYetSent), when(P.REMOVE_ITEM, notYetSent), always(P.EDIT_PROFILE)],
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
        always(P.EDIT_ITEM),
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
