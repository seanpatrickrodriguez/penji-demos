import { DEFINITION_KIND, FLEET_PERMISSION, SUPPLY_STATUS, WANT_LIST_TRANSITION } from '@penji-demos/constants';
import { TransitionDefinition, WorkflowDefinition, toDefinitionId } from '@penji-demos/types';
import { FLEET_POLICY_SOURCE } from './fleet-policy-source';
import { APPROVAL_REQUIRED_TOTAL_DOLLARS, IS_APPROVED, NEEDS_PORT_ENGINEER } from './supply-escalation';

// M1: the life of one want-list item, in the statuses the shop already uses.
// The escalation rule is a guard on the step into the locker: an item that
// needs the port engineer cannot be stocked until the port engineer or the
// owner's representative approves it.

const S = SUPPLY_STATUS;
const P = FLEET_PERMISSION;

const step = (id: string, label: string, from: readonly string[], to: string, permission: string, needsNote = false): TransitionDefinition => ({
  id,
  label,
  from,
  to,
  permission,
  guard: null,
  needsNote,
});

const T = WANT_LIST_TRANSITION;

export const WANT_LIST_WORKFLOW: WorkflowDefinition = {
  kind: DEFINITION_KIND.WORKFLOW,
  id: toDefinitionId('fleet-want-list'),
  version: '1',
  title: 'Want-list item',
  source: FLEET_POLICY_SOURCE,
  initial: S.NEW,
  states: [
    { id: S.NEW, label: 'New', description: 'On the vessel’s list, not yet sent.', closed: false },
    { id: S.SUBMITTED, label: 'Submitted', description: 'Sent to the shop.', closed: false },
    { id: S.ACKNOWLEDGED, label: 'Acknowledged', description: 'The supply manager is working it.', closed: false },
    { id: S.APPROVAL_REQUEST, label: 'Approval request', description: 'Waiting on the port engineer.', closed: false },
    { id: S.APPROVED, label: 'Approved', description: 'Approved for purchase.', closed: false },
    { id: S.DENIED, label: 'Denied', description: 'Will not be supplied.', closed: true },
    { id: S.BACK_ORDERED, label: 'Back-ordered', description: 'Ordered and waiting on the vendor.', closed: false },
    { id: S.IN_LOCKER, label: 'In locker', description: 'In the vessel’s locker at the shop, ready for pickup.', closed: false },
    { id: S.RECEIVED, label: 'Received', description: 'Aboard.', closed: true },
    { id: S.NOT_RECEIVED, label: 'Not received', description: 'The vessel reports it never arrived.', closed: false },
  ],
  transitions: [
    step(T.SEND, 'Send to the shop', [S.NEW], S.SUBMITTED, P.SEND_LIST),
    step(T.ACKNOWLEDGE, 'Acknowledge', [S.SUBMITTED, S.NOT_RECEIVED], S.ACKNOWLEDGED, P.ACKNOWLEDGE),
    step(T.REQUEST_APPROVAL, 'Send for approval', [S.SUBMITTED, S.ACKNOWLEDGED], S.APPROVAL_REQUEST, P.REQUEST_APPROVAL),
    step(T.APPROVE, 'Approve', [S.APPROVAL_REQUEST], S.APPROVED, P.DECIDE),
    step(T.DENY, 'Deny', [S.SUBMITTED, S.ACKNOWLEDGED, S.APPROVAL_REQUEST], S.DENIED, P.DECIDE, true),
    step(T.BACK_ORDER, 'Back-order', [S.ACKNOWLEDGED, S.APPROVED], S.BACK_ORDERED, P.BACK_ORDER, true),
    {
      ...step(T.STOCK, 'Put in the locker', [S.ACKNOWLEDGED, S.APPROVED, S.BACK_ORDERED], S.IN_LOCKER, P.STOCK),
      guard: {
        condition: { kind: 'any', conditions: [{ kind: 'not', condition: NEEDS_PORT_ENGINEER }, IS_APPROVED] },
        blockedReason: `Mooring lines and items of $${APPROVAL_REQUIRED_TOTAL_DOLLARS.toLocaleString('en-US')} or more need the port engineer’s approval first.`,
      },
    },
    step(T.RECEIVE, 'Mark received', [S.IN_LOCKER], S.RECEIVED, P.CONFIRM_RECEIPT),
    step(T.REPORT_MISSING, 'Report not received', [S.IN_LOCKER], S.NOT_RECEIVED, P.CONFIRM_RECEIPT, true),
  ],
};
