import { BARGE_CARGO, FLEET_FACT, SUPPLY_CATEGORY, SUPPLY_STATUS, TOILET_FLUSH, VESSEL_FIELD, VESSEL_KIND, WANT_ITEM_FIELD } from '@penji-demos/constants';
import { calculateField } from '@penji-demos/form-engine';
import { isPlainDate, toPlainDate } from '@penji-demos/time';
import { AnswerValue, Answers, BargeCargo, PlainDate, SupplyCategory, ToiletFlush, VesselKind, VesselRecord, WantItemRecord } from '@penji-demos/types';
import { WANT_ITEM_FORM } from './fleet-forms';

// Adapters between the fleet's records and the plain answers that forms,
// conditions and rules read.

const V = VESSEL_FIELD;
const W = WANT_ITEM_FIELD;

const asText = (value: AnswerValue | undefined): string => (typeof value === 'string' ? value : '');
const asNumber = (value: AnswerValue | undefined): number | null => (typeof value === 'number' ? value : null);
const asDate = (value: AnswerValue | undefined): PlainDate | null => (typeof value === 'string' && isPlainDate(value) ? toPlainDate(value) : null);
const asMember = <Value extends string>(allowed: Readonly<Record<string, Value>>, value: AnswerValue | undefined): Value | null =>
  Object.values(allowed).find((member) => member === value) ?? null;

export function resolveVesselAnswers(vessel: VesselRecord): Answers {
  const { profile } = vessel;
  return {
    [V.NAME]: vessel.name,
    [V.KIND]: vessel.kind,
    [V.CARGO]: vessel.cargo,
    [V.IN_SERVICE]: vessel.inService,
    [V.MAIN_ENGINES]: profile.mainEngines || null,
    [V.GENERATOR_ENGINES]: profile.generatorEngines || null,
    [V.GENERATORS]: profile.generators || null,
    [V.POTABLE_WATER_PUMP]: profile.potableWaterPump || null,
    [V.POTABLE_WATER_GALLONS]: profile.potableWaterGallons,
    [V.TOILET_FLUSH]: profile.toiletFlush,
    [V.LAST_ANNUAL_INSPECTION]: profile.lastAnnualInspection,
    [V.LAST_DRY_DOCK]: profile.lastDryDock,
    [V.LAST_TANK_MAINTENANCE]: profile.lastTankMaintenance,
  };
}

// A vessel with its profile replaced by what the form holds.
export function resolveVesselFromAnswers(vessel: VesselRecord, answers: Answers): VesselRecord {
  const kind: VesselKind = asMember(VESSEL_KIND, answers[V.KIND]) ?? vessel.kind;
  const cargo: BargeCargo | null = kind === VESSEL_KIND.BARGE ? asMember(BARGE_CARGO, answers[V.CARGO]) : null;
  const toiletFlush: ToiletFlush | null = asMember(TOILET_FLUSH, answers[V.TOILET_FLUSH]);
  return {
    ...vessel,
    name: asText(answers[V.NAME]) || vessel.name,
    kind,
    cargo,
    inService: answers[V.IN_SERVICE] === true,
    profile: {
      mainEngines: asText(answers[V.MAIN_ENGINES]),
      generatorEngines: asText(answers[V.GENERATOR_ENGINES]),
      generators: asText(answers[V.GENERATORS]),
      potableWaterPump: asText(answers[V.POTABLE_WATER_PUMP]),
      potableWaterGallons: asNumber(answers[V.POTABLE_WATER_GALLONS]),
      toiletFlush,
      lastAnnualInspection: asDate(answers[V.LAST_ANNUAL_INSPECTION]),
      lastDryDock: asDate(answers[V.LAST_DRY_DOCK]),
      lastTankMaintenance: asDate(answers[V.LAST_TANK_MAINTENANCE]),
    },
  };
}

// An item's answers, with the estimated total worked out by the form's own calculation.
export function resolveWantItemAnswers(item: WantItemRecord): Answers {
  const answers: Answers = {
    [W.DESCRIPTION]: item.description,
    [W.CATEGORY]: item.category,
    [W.QUANTITY]: item.quantity,
    [W.UNIT_COST]: item.unitCost,
    [W.LIMITED]: item.limited,
    [W.STATUS]: item.status,
    [W.REQUESTED_BY]: item.requestedBy,
    [W.ADDED_DATE]: item.addedDate,
    [FLEET_FACT.APPROVED]: item.history.some((step) => step.to === SUPPLY_STATUS.APPROVED),
  };
  const total = WANT_ITEM_FORM.fields.find((field) => field.key === W.ESTIMATED_TOTAL);
  return { ...answers, [W.ESTIMATED_TOTAL]: total?.kind === 'calculated' ? calculateField(total.calculation, answers) : null };
}

// An item with what the form holds; status, history and who added it stay with the record.
export function resolveWantItemFromAnswers(item: WantItemRecord, answers: Answers): WantItemRecord {
  const category: SupplyCategory = asMember(SUPPLY_CATEGORY, answers[W.CATEGORY]) ?? item.category;
  return {
    ...item,
    description: asText(answers[W.DESCRIPTION]) || item.description,
    category,
    quantity: asNumber(answers[W.QUANTITY]) ?? item.quantity,
    unitCost: asNumber(answers[W.UNIT_COST]),
    limited: answers[W.LIMITED] === true,
  };
}
