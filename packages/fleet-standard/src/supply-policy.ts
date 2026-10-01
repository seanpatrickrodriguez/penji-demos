import { DEFINITION_KIND, FLEET_FORM, RULE_CHECK_KIND, RULE_SCOPE, SUPPLY_CATEGORY, SUPPLY_STATUS, VALIDATION_SEVERITY, WANT_ITEM_FIELD } from '@penji-demos/constants';
import { ComplianceStandardDefinition, Condition, toDefinitionId } from '@penji-demos/types';
import { FLEET_POLICY_SOURCE, fleetPolicySection } from './fleet-policy-source';
import { APPROVAL_REQUIRED_TOTAL_DOLLARS, ESCALATION_SUGGESTED, ESCALATION_SUGGESTED_TOTAL_DOLLARS, IS_APPROVED, NEEDS_PORT_ENGINEER } from './supply-escalation';

// M1: the company's supply policy, written as a ComplianceStandardDefinition.
// Its subject is a vessel and its events are the want-list items, so the same
// compliance engine that checks a participant's sessions checks a vessel's list.

const W = WANT_ITEM_FIELD;
const S = SUPPLY_STATUS;

const MOORING_REQUESTS_PER_WINDOW = 2;
const MOORING_WINDOW_DAYS = 90;
const dollars = (amount: number) => `$${amount.toLocaleString('en-US')}`;

const atTheShop: Condition = { kind: 'oneOf', field: W.STATUS, values: [S.SUBMITTED, S.ACKNOWLEDGED, S.BACK_ORDERED] };
const notEscalatedYet: Condition = { kind: 'oneOf', field: W.STATUS, values: [S.SUBMITTED, S.ACKNOWLEDGED] };
const holdsUnless = (applies: Condition): Condition => ({ kind: 'not', condition: applies });

export const FLEET_SUPPLY_POLICY: ComplianceStandardDefinition = {
  kind: DEFINITION_KIND.STANDARD,
  id: toDefinitionId('fleet-supply-policy'),
  version: '1',
  title: 'Supply policy',
  shortName: 'Supply',
  source: FLEET_POLICY_SOURCE,
  appliesWhen: null,
  eligibility: null,

  rules: [
    {
      id: 'supply-port-engineer-approval',
      title: 'Port engineer approval before stocking',
      citation: fleetPolicySection('Supply 1'),
      scope: RULE_SCOPE.EVENT,
      appliesWhen: null,
      check: {
        kind: RULE_CHECK_KIND.CONDITION,
        condition: holdsUnless({ kind: 'all', conditions: [atTheShop, NEEDS_PORT_ENGINEER, { kind: 'not', condition: IS_APPROVED }] }),
        describes: [W.DESCRIPTION, W.CATEGORY, W.ESTIMATED_TOTAL],
      },
      severity: VALIDATION_SEVERITY.ERROR,
      blocks: true,
      bypassable: false,
      issue: 'Needs the port engineer’s approval before it is stocked: {value}.',
      guidance: `Send it for approval.  Mooring lines, and items estimated at ${dollars(APPROVAL_REQUIRED_TOTAL_DOLLARS)} or more, are approved by the port engineer or the owner’s representative.`,
      fixTarget: null,
    },
    {
      id: 'supply-escalation-suggested',
      title: 'Limited and costlier items usually go for approval',
      citation: fleetPolicySection('Supply 2'),
      scope: RULE_SCOPE.EVENT,
      appliesWhen: null,
      check: {
        kind: RULE_CHECK_KIND.CONDITION,
        condition: holdsUnless({ kind: 'all', conditions: [notEscalatedYet, ESCALATION_SUGGESTED, { kind: 'not', condition: NEEDS_PORT_ENGINEER }] }),
        describes: [W.DESCRIPTION, W.LIMITED, W.ESTIMATED_TOTAL],
      },
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: 'Usually goes to the port engineer: {value}.',
      guidance: `Items with limited stock or a long lead time, and items estimated at ${dollars(ESCALATION_SUGGESTED_TOTAL_DOLLARS)} or more, usually go for approval.  Send it, or accept it with the reason you are supplying it directly.`,
      fixTarget: null,
    },
    {
      id: 'supply-unit-cost',
      title: 'Priced once the shop is working it',
      citation: fleetPolicySection('Supply 3'),
      scope: RULE_SCOPE.EVENT,
      appliesWhen: null,
      check: {
        kind: RULE_CHECK_KIND.REQUIRED_WHEN,
        field: W.UNIT_COST,
        when: { kind: 'oneOf', field: W.STATUS, values: [S.ACKNOWLEDGED, S.APPROVAL_REQUEST, S.BACK_ORDERED] },
      },
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: 'No unit cost is recorded.',
      guidance: 'Record the unit cost.  The approval limits are checked on the estimated total, and an item with no price cannot be checked.',
      fixTarget: { form: FLEET_FORM.WANT_ITEM, field: W.UNIT_COST },
    },
    {
      id: 'supply-not-received',
      title: 'Items reported missing are followed up',
      citation: fleetPolicySection('Supply 4'),
      scope: RULE_SCOPE.EVENT,
      appliesWhen: null,
      check: { kind: RULE_CHECK_KIND.CONDITION, condition: { kind: 'not', condition: { kind: 'equals', field: W.STATUS, value: S.NOT_RECEIVED } }, describes: [W.DESCRIPTION] },
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: 'Reported not received: {value}.',
      guidance: 'Find it at the shop or on the dock, or acknowledge it again and resupply it.',
      fixTarget: null,
    },
    {
      id: 'supply-mooring-frequency',
      title: 'Frequent mooring line requests are reviewed',
      citation: fleetPolicySection('Supply 5'),
      scope: RULE_SCOPE.HISTORY,
      appliesWhen: null,
      check: {
        kind: RULE_CHECK_KIND.AT_MOST_PER_WINDOW,
        counts: { kind: 'equals', field: W.CATEGORY, value: SUPPLY_CATEGORY.MOORING },
        max: MOORING_REQUESTS_PER_WINDOW,
        windowDays: MOORING_WINDOW_DAYS,
      },
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: `{value} mooring line requests within ${MOORING_WINDOW_DAYS} days.`,
      guidance: 'Lines are wearing faster than expected.  The port engineer looks at the chocks, bitts and chafe gear before more line is ordered.',
      fixTarget: null,
    },
  ],

  interpretations: [
    {
      clause: '"Estimated total"',
      reading: 'Quantity times unit cost, as the want-list form calculates it.  An item with no unit cost has no estimated total and is checked on its category alone.',
    },
  ],
};
