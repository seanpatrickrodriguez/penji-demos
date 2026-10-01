import { FLEET_FACT, SUPPLY_CATEGORY, WANT_ITEM_FIELD } from '@penji-demos/constants';
import { Condition } from '@penji-demos/types';

// When a want-list item goes to the port engineer, as conditions the workflow
// guard and the supply policy's rules both read.

const W = WANT_ITEM_FIELD;

export const APPROVAL_REQUIRED_TOTAL_DOLLARS = 2500;
export const ESCALATION_SUGGESTED_TOTAL_DOLLARS = 750;

// Mooring lines, and anything estimated at the approval limit or more, are never stocked without approval.
export const NEEDS_PORT_ENGINEER: Condition = {
  kind: 'any',
  conditions: [
    { kind: 'equals', field: W.CATEGORY, value: SUPPLY_CATEGORY.MOORING },
    { kind: 'atLeast', field: W.ESTIMATED_TOTAL, value: APPROVAL_REQUIRED_TOTAL_DOLLARS },
  ],
};

// Limited items and costlier items usually go to the port engineer; the supply manager may decide otherwise.
export const ESCALATION_SUGGESTED: Condition = {
  kind: 'any',
  conditions: [
    { kind: 'equals', field: W.LIMITED, value: true },
    { kind: 'atLeast', field: W.ESTIMATED_TOTAL, value: ESCALATION_SUGGESTED_TOTAL_DOLLARS },
  ],
};

export const IS_APPROVED: Condition = { kind: 'equals', field: FLEET_FACT.APPROVED, value: true };
