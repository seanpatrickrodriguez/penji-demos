import { BARGE_CARGO, DEFINITION_KIND, FLEET_FACT, FLEET_FORM, PLATFORM_FACT, RULE_CHECK_KIND, RULE_SCOPE, VALIDATION_SEVERITY, VESSEL_FIELD, VESSEL_KIND } from '@penji-demos/constants';
import { ComplianceStandardDefinition, Condition, FieldKey, RuleDefinition, SourceReference, toDefinitionId } from '@penji-demos/types';
import { FLEET_POLICY_SOURCE } from './fleet-policy-source';

const fleetPolicySection = (section: string): SourceReference => ({ ...FLEET_POLICY_SOURCE, section });

// M1: the company's vessel maintenance and inspection schedule, written as a
// ComplianceStandardDefinition.  The intervals are this fictional company's
// policy.  The subject is one vessel: its profile, and the date it is checked on.

const V = VESSEL_FIELD;

const DAYS_PER_YEAR = 365;
const ANNUAL_INSPECTION_DAYS = DAYS_PER_YEAR;
const DUE_SOON_DAYS = 30;
const DRY_DOCK_YEARS = 5;
const FUEL_TANK_YEARS = 5;
const PROPANE_TANK_YEARS = 10;
const yearsInDays = (years: number) => years * DAYS_PER_YEAR + Math.floor(years / 4);

const isTug: Condition = { kind: 'equals', field: V.KIND, value: VESSEL_KIND.TUG };
const carries = (cargo: string): Condition => ({ kind: 'equals', field: V.CARGO, value: cargo });
const isManned: Condition = { kind: 'any', conditions: [isTug, carries(BARGE_CARGO.FUEL), carries(BARGE_CARGO.PROPANE)] };

// Holds while the last date is recorded and the check date falls within `days` after it.
const withinDaysOf = (last: FieldKey, days: number): Condition => ({ kind: 'withinDaysAfter', field: PLATFORM_FACT.AS_OF_DATE, anchor: last, days });
const unrecordedOr = (last: FieldKey, condition: Condition): Condition => ({ kind: 'any', conditions: [{ kind: 'not', condition: { kind: 'answered', field: last } }, condition] });

const interval = (id: string, title: string, section: string, last: FieldKey, days: number, appliesWhen: Condition | null, guidance: string): RuleDefinition => ({
  id,
  title,
  citation: fleetPolicySection(section),
  scope: RULE_SCOPE.SUBJECT,
  stream: null,
  appliesWhen,
  check: { kind: RULE_CHECK_KIND.CONDITION, condition: unrecordedOr(last, withinDaysOf(last, days)), describes: [last, PLATFORM_FACT.AS_OF_DATE] },
  severity: VALIDATION_SEVERITY.ERROR,
  blocks: true,
  bypassable: false,
  issue: `Overdue: {value}.`,
  guidance,
  fixTarget: { form: FLEET_FORM.VESSEL_PROFILE, field: last },
});

const profileField = (id: string, title: string, field: FieldKey, appliesWhen: Condition | null): RuleDefinition => ({
  id,
  title,
  citation: fleetPolicySection('Maintenance 6'),
  scope: RULE_SCOPE.SUBJECT,
  stream: null,
  appliesWhen,
  check: { kind: RULE_CHECK_KIND.REQUIRED, field },
  severity: VALIDATION_SEVERITY.WARNING,
  blocks: false,
  bypassable: true,
  issue: 'Missing from the vessel profile.',
  guidance: 'Record it, so the shop orders the right parts without a trip to the vessel.',
  fixTarget: { form: FLEET_FORM.VESSEL_PROFILE, field },
});

export const VESSEL_MAINTENANCE_POLICY: ComplianceStandardDefinition = {
  kind: DEFINITION_KIND.STANDARD,
  id: toDefinitionId('fleet-maintenance-policy'),
  version: '1',
  title: 'Vessel maintenance and inspection schedule',
  shortName: 'Maintenance',
  source: FLEET_POLICY_SOURCE,
  appliesWhen: { kind: 'equals', field: V.IN_SERVICE, value: true },
  eligibility: null,

  rules: [
    {
      id: 'maintenance-annual-recorded',
      title: 'Annual inspection on record',
      citation: fleetPolicySection('Maintenance 1'),
      scope: RULE_SCOPE.SUBJECT,
      stream: null,
      appliesWhen: null,
      check: { kind: RULE_CHECK_KIND.REQUIRED, field: V.LAST_ANNUAL_INSPECTION },
      severity: VALIDATION_SEVERITY.ERROR,
      blocks: true,
      bypassable: false,
      issue: 'No annual inspection is recorded.',
      guidance: 'Record the date of the last annual inspection from the inspection report.',
      fixTarget: { form: FLEET_FORM.VESSEL_PROFILE, field: V.LAST_ANNUAL_INSPECTION },
    },
    interval(
      'maintenance-annual-current',
      'Annual inspection within the last year',
      'Maintenance 1',
      V.LAST_ANNUAL_INSPECTION,
      ANNUAL_INSPECTION_DAYS,
      null,
      'Schedule the inspection with the port engineer before the vessel takes another job.',
    ),
    {
      id: 'maintenance-annual-due-soon',
      title: 'Annual inspection coming due',
      citation: fleetPolicySection('Maintenance 1'),
      scope: RULE_SCOPE.SUBJECT,
      stream: null,
      appliesWhen: null,
      check: {
        kind: RULE_CHECK_KIND.CONDITION,
        condition: {
          kind: 'any',
          conditions: [
            unrecordedOr(V.LAST_ANNUAL_INSPECTION, withinDaysOf(V.LAST_ANNUAL_INSPECTION, ANNUAL_INSPECTION_DAYS - DUE_SOON_DAYS)),
            { kind: 'not', condition: withinDaysOf(V.LAST_ANNUAL_INSPECTION, ANNUAL_INSPECTION_DAYS) },
          ],
        },
        describes: [V.LAST_ANNUAL_INSPECTION, PLATFORM_FACT.AS_OF_DATE],
      },
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: `Due within ${DUE_SOON_DAYS} days: {value}.`,
      guidance: 'Schedule the inspection and order anything the last report flagged.',
      fixTarget: null,
    },
    interval(
      'maintenance-dry-dock',
      `Dry dock within ${DRY_DOCK_YEARS} years`,
      'Maintenance 2',
      V.LAST_DRY_DOCK,
      yearsInDays(DRY_DOCK_YEARS),
      null,
      'Book the yard.  Hull, running gear and sea chests are opened up at dry dock.',
    ),
    interval(
      'maintenance-fuel-tanks',
      `Fuel cargo tanks maintained within ${FUEL_TANK_YEARS} years`,
      'Maintenance 3',
      V.LAST_TANK_MAINTENANCE,
      yearsInDays(FUEL_TANK_YEARS),
      carries(BARGE_CARGO.FUEL),
      'Gas-free the tanks and schedule the internal inspection and coating repair.  Purging takes days, so plan the barge out of service.',
    ),
    interval(
      'maintenance-propane-tanks',
      `Propane cargo tanks maintained within ${PROPANE_TANK_YEARS} years`,
      'Maintenance 4',
      V.LAST_TANK_MAINTENANCE,
      yearsInDays(PROPANE_TANK_YEARS),
      carries(BARGE_CARGO.PROPANE),
      'Purge the tanks and schedule the pressure test and valve overhaul.  Purging takes days, so plan the barge out of service.',
    ),
    {
      id: 'maintenance-sending-officer-aboard',
      title: 'Someone aboard can send the want list',
      citation: fleetPolicySection('Maintenance 5'),
      scope: RULE_SCOPE.SUBJECT,
      stream: null,
      appliesWhen: isManned,
      check: { kind: RULE_CHECK_KIND.CONDITION, condition: { kind: 'equals', field: FLEET_FACT.HAS_SENDING_OFFICER, value: true }, describes: [FLEET_FACT.HAS_SENDING_OFFICER] },
      severity: VALIDATION_SEVERITY.WARNING,
      blocks: false,
      bypassable: true,
      issue: 'No one aboard can send the want list.',
      guidance: 'The list waits until a captain, first mate, chief engineer or tankerman in charge is aboard.  Ask the port engineer to cover the rotation.',
      fixTarget: null,
    },
    profileField('maintenance-main-engines', 'Main engines on the profile', V.MAIN_ENGINES, isTug),
    profileField('maintenance-generators', 'Generators on the profile', V.GENERATORS, null),
    profileField('maintenance-toilet-flush', 'Toilet flush on the profile', V.TOILET_FLUSH, isTug),
  ],

  interpretations: [
    {
      clause: '"Within the last year"',
      reading: `No more than ${ANNUAL_INSPECTION_DAYS} days from the last inspection to the date the vessel is checked.`,
    },
    {
      clause: 'Five- and ten-year intervals',
      reading: 'Counted in days, with a leap day for every four years.',
    },
  ],
};
