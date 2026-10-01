import { BARGE_CARGO, DEFINITION_KIND, FLEET_FACT, FLEET_FORM, SUPPLY_CATEGORY, TOILET_FLUSH, VESSEL_FIELD, VESSEL_KIND, WANT_ITEM_FIELD } from '@penji-demos/constants';
import { FieldDefinition, FormDefinition, toDefinitionId } from '@penji-demos/types';

// M1: the fleet's own forms, read by the same form engine as the program
// forms.  They collect a vessel's profile and a want-list item in plain terms;
// the company's policies reach them through their rules.

const PLATFORM_SOURCE = { title: 'Penji demos: fleet records', url: 'https://github.com/seanpatrickrodriguez/penji-demos' };
const V = VESSEL_FIELD;
const W = WANT_ITEM_FIELD;

const isTug = { kind: 'equals' as const, field: V.KIND, value: VESSEL_KIND.TUG };
const isTankBarge = { kind: 'oneOf' as const, field: V.CARGO, values: [BARGE_CARGO.FUEL, BARGE_CARGO.PROPANE] };

const VESSEL_PROFILE_FIELDS: readonly FieldDefinition[] = [
  { kind: 'text', key: V.NAME, label: 'Vessel name', required: true, maxLength: 60 },
  {
    kind: 'choice',
    key: V.KIND,
    label: 'Kind',
    required: true,
    options: [
      { value: VESSEL_KIND.TUG, label: 'Tug' },
      { value: VESSEL_KIND.BARGE, label: 'Barge' },
    ],
  },
  {
    kind: 'choice',
    key: V.CARGO,
    label: 'Cargo',
    required: true,
    showWhen: { kind: 'equals', field: V.KIND, value: VESSEL_KIND.BARGE },
    options: [
      { value: BARGE_CARGO.SAND, label: 'Sand and aggregate' },
      { value: BARGE_CARGO.FUEL, label: 'Fuel' },
      { value: BARGE_CARGO.PROPANE, label: 'Propane' },
      { value: BARGE_CARGO.CONTAINERS, label: 'Containers' },
    ],
  },
  { kind: 'yesNo', key: V.IN_SERVICE, label: 'In service', required: true },
  { kind: 'text', key: V.MAIN_ENGINES, label: 'Main engines', help: 'Make, model and count.', showWhen: isTug },
  { kind: 'text', key: V.GENERATOR_ENGINES, label: 'Generator engines', help: 'Make and model of the engines that drive the generators.' },
  { kind: 'text', key: V.GENERATORS, label: 'Generators', help: 'Make, model and rating.' },
  { kind: 'text', key: V.POTABLE_WATER_PUMP, label: 'Potable water pump', showWhen: isTug },
  { kind: 'number', key: V.POTABLE_WATER_GALLONS, label: 'Potable water tank (gallons)', min: 0, wholeNumber: true, showWhen: isTug },
  {
    kind: 'choice',
    key: V.TOILET_FLUSH,
    label: 'Toilet flush',
    showWhen: isTug,
    options: [
      { value: TOILET_FLUSH.SALTWATER, label: 'Saltwater' },
      { value: TOILET_FLUSH.FRESHWATER, label: 'Freshwater' },
    ],
  },
  { kind: 'date', key: V.LAST_ANNUAL_INSPECTION, label: 'Last annual inspection' },
  { kind: 'date', key: V.LAST_DRY_DOCK, label: 'Last dry dock' },
  { kind: 'date', key: V.LAST_TANK_MAINTENANCE, label: 'Last cargo tank maintenance', showWhen: isTankBarge },
];

const WANT_ITEM_FIELDS: readonly FieldDefinition[] = [
  { kind: 'text', key: W.DESCRIPTION, label: 'What is needed', required: true, maxLength: 120 },
  {
    kind: 'choice',
    key: W.CATEGORY,
    label: 'Category',
    required: true,
    options: [
      { value: SUPPLY_CATEGORY.ENGINE, label: 'Engine parts' },
      { value: SUPPLY_CATEGORY.FILTERS, label: 'Filters and fluids' },
      { value: SUPPLY_CATEGORY.ELECTRICAL, label: 'Electrical' },
      { value: SUPPLY_CATEGORY.ELECTRONICS, label: 'Radar and electronics' },
      { value: SUPPLY_CATEGORY.MOORING, label: 'Mooring lines and hardware' },
      { value: SUPPLY_CATEGORY.SAFETY, label: 'Safety gear' },
      { value: SUPPLY_CATEGORY.DECK, label: 'Deck supplies' },
      { value: SUPPLY_CATEGORY.GALLEY, label: 'Galley' },
      { value: SUPPLY_CATEGORY.CLEANING, label: 'Cleaning' },
    ],
  },
  { kind: 'number', key: W.QUANTITY, label: 'Quantity', required: true, min: 1, wholeNumber: true },
  { kind: 'number', key: W.UNIT_COST, label: 'Unit cost (dollars)', help: 'The shop fills this in when it prices the item.', min: 0 },
  { kind: 'calculated', key: W.ESTIMATED_TOTAL, label: 'Estimated total', calculation: { kind: 'product', fields: [W.QUANTITY, W.UNIT_COST] }, format: 'currency' },
  { kind: 'yesNo', key: W.LIMITED, label: 'Limited stock or a long lead time', required: true },
];

const form = (id: string, title: string, description: string, fields: readonly FieldDefinition[]): FormDefinition => ({
  kind: DEFINITION_KIND.FORM,
  id: toDefinitionId(id),
  version: '1',
  title,
  description,
  source: PLATFORM_SOURCE,
  fields,
  rules: [],
});

export const VESSEL_PROFILE_FORM = form(FLEET_FORM.VESSEL_PROFILE, 'Vessel profile', 'What the shop keeps on file for one vessel.', VESSEL_PROFILE_FIELDS);
export const WANT_ITEM_FORM = form(FLEET_FORM.WANT_ITEM, 'Want-list item', 'One thing a vessel needs from the shop.', WANT_ITEM_FIELDS);

// Labels for every fact a fleet rule or grant can read: the form fields, and
// the facts worked out from records.
export const FLEET_FACT_LABELS: Readonly<Record<string, string>> = {
  ...Object.fromEntries([...VESSEL_PROFILE_FIELDS, ...WANT_ITEM_FIELDS].map((field) => [field.key, field.label])),
  [W.STATUS]: 'Status',
  [W.REQUESTED_BY]: 'Added by',
  [W.ADDED_DATE]: 'Added on',
  [FLEET_FACT.AS_OF_DATE]: 'As of',
  [FLEET_FACT.HAS_SENDING_OFFICER]: 'Someone aboard can send the want list',
  [FLEET_FACT.ACTOR_ID]: 'You',
  [FLEET_FACT.ON_THIS_VESSEL]: 'You are aboard this vessel',
  [FLEET_FACT.APPROVED]: 'Approved for purchase',
};
