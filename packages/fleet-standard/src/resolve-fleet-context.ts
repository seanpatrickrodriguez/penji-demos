import { ComplianceSubject, FieldLabels, evaluateStandard, resolveGuidanceItem } from '@penji-demos/compliance-engine';
import { FLEET_FACT, FLEET_PERMISSION, SUPPLY_STATUS } from '@penji-demos/constants';
import { FLEET_FACT_LABELS, resolveVesselAnswers, resolveWantItemAnswers } from '@penji-demos/fleet-records';
import { TransitionOption, applyTransition, isPermitted, resolveTransitionOptions } from '@penji-demos/workflow-engine';
import {
  Answers,
  ComplianceStandardDefinition,
  FleetData,
  GuidanceItem,
  GuidanceResolution,
  PersonRecord,
  PlainDate,
  StandardEvaluation,
  SupplyStatus,
  VesselId,
  VesselRecord,
  WantItemRecord,
} from '@penji-demos/types';
import { FLEET_ACCESS_POLICY, POSITION_ROLES } from './fleet-access-policy';
import { VESSEL_MAINTENANCE_POLICY } from './maintenance-policy';
import { FLEET_SUPPLY_POLICY } from './supply-policy';
import { WANT_LIST_WORKFLOW } from './want-list-workflow';

// The fleet's records, brought to the engines: a person becomes an actor with
// roles and facts, an item becomes the values a grant or guard reads, and a
// vessel becomes a compliance subject whose events are its want-list items.

export const FLEET_STANDARDS: readonly ComplianceStandardDefinition[] = [VESSEL_MAINTENANCE_POLICY, FLEET_SUPPLY_POLICY];

export const resolveRoleIds = (person: PersonRecord): readonly string[] => POSITION_ROLES[person.position];

export const isAboard = (person: PersonRecord, vesselId: VesselId): boolean => person.aboard && person.vesselIds.includes(vesselId);

export const resolveActorFacts = (person: PersonRecord, vesselId: VesselId): Answers => ({
  [FLEET_FACT.ACTOR_ID]: person.personId,
  [FLEET_FACT.ON_THIS_VESSEL]: isAboard(person, vesselId),
});

// What a grant or guard reads when this person acts on this item.
export const resolveItemContext = (person: PersonRecord, item: WantItemRecord): Answers => ({
  ...resolveWantItemAnswers(item),
  ...resolveActorFacts(person, item.vesselId),
});

// Whether the person may act on the vessel itself: add to its list, edit its profile.
export const isPermittedOnVessel = (person: PersonRecord, vesselId: VesselId, permission: string): boolean =>
  isPermitted(FLEET_ACCESS_POLICY, resolveRoleIds(person), permission, resolveActorFacts(person, vesselId));

export const isRemovable = (person: PersonRecord, item: WantItemRecord): boolean =>
  isPermitted(FLEET_ACCESS_POLICY, resolveRoleIds(person), FLEET_PERMISSION.REMOVE_ITEM, resolveItemContext(person, item));

export const resolveItemOptions = (person: PersonRecord, item: WantItemRecord): readonly TransitionOption[] =>
  resolveTransitionOptions(WANT_LIST_WORKFLOW, FLEET_ACCESS_POLICY, item.status, resolveRoleIds(person), resolveItemContext(person, item));

export type ItemTransitionResult = { readonly ok: true; readonly item: WantItemRecord } | { readonly ok: false; readonly problems: readonly string[] };

// One step on one item, taken by one person, with the step kept in the item's history.
export function applyItemTransition(person: PersonRecord, item: WantItemRecord, transitionId: string, date: PlainDate, note: string): ItemTransitionResult {
  const result = applyTransition(WANT_LIST_WORKFLOW, FLEET_ACCESS_POLICY, {
    state: item.status,
    transitionId,
    roleIds: resolveRoleIds(person),
    context: resolveItemContext(person, item),
    actorId: person.personId,
    date,
    note,
  });
  if (!result.ok) return result;
  const to = result.record.to;
  if (!isSupplyStatus(to)) return { ok: false, problems: [`"${to}" is not a supply status.`] };
  return { ok: true, item: { ...item, status: to, history: [...item.history, result.record] } };
}

const isSupplyStatus = (value: string): value is SupplyStatus => Object.values(SUPPLY_STATUS).some((status) => status === value);

// Someone aboard holds the permission to send the list.
export const isSendingOfficerAboard = (data: FleetData, vesselId: VesselId): boolean =>
  data.people.some((person) => isAboard(person, vesselId) && isPermittedOnVessel(person, vesselId, FLEET_PERMISSION.SEND_LIST));

// A vessel as the compliance engine sees it.
export function resolveVesselSubject(data: FleetData, vessel: VesselRecord): ComplianceSubject {
  return {
    facts: {
      ...resolveVesselAnswers(vessel),
      [FLEET_FACT.AS_OF_DATE]: data.asOfDate,
      [FLEET_FACT.HAS_SENDING_OFFICER]: isSendingOfficerAboard(data, vessel.vesselId),
    },
    events: data.wantItems
      .filter((item) => item.vesselId === vessel.vesselId)
      .sort((first, second) => first.addedDate.localeCompare(second.addedDate))
      .map((item) => ({ eventId: item.itemId, eventDate: item.addedDate, values: resolveWantItemAnswers(item) })),
  };
}

export const evaluateVessel = (data: FleetData, vessel: VesselRecord, labels: FieldLabels = FLEET_FACT_LABELS): readonly StandardEvaluation[] =>
  FLEET_STANDARDS.map((standard) => evaluateStandard(standard, resolveVesselSubject(data, vessel), labels));

// Every finding on a vessel as a guidance item, with any resolution recorded for it.
export function resolveVesselGuidance(data: FleetData, vessel: VesselRecord, resolutions: ReadonlyMap<string, GuidanceResolution>): readonly GuidanceItem[] {
  return evaluateVessel(data, vessel).flatMap((evaluation) => {
    const standard = FLEET_STANDARDS.find((candidate) => candidate.shortName === evaluation.standardShortName);
    return evaluation.findings.flatMap((finding) => {
      const rule = standard?.rules.find((candidate) => candidate.id === finding.ruleId);
      return rule ? [resolveGuidanceItem(vessel.vesselId, rule, finding, resolutions)] : [];
    });
  });
}
