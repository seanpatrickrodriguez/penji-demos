import { ACCESS_SCOPE_KIND, FLEET_FACT, SUPPLY_STATUS } from '@penji-demos/constants';
import { FLEET_CONFIGURATION } from '@penji-demos/fleet-configuration';
import { evaluateEntity, resolveEntityFacts } from '@penji-demos/record-engine';
import { EntityRecord } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { FLEET_AS_OF, FLEET_VESSELS, buildSyntheticFleet } from './synthetic-fleet';

const DATA = buildSyntheticFleet();
const fired = (vessel: EntityRecord) => new Set(evaluateEntity(FLEET_CONFIGURATION, DATA, vessel, FLEET_AS_OF).flatMap((evaluation) => evaluation.findings.map((finding) => finding.ruleId)));

describe('the synthetic fleet', () => {
  it('is the same on every build', () => {
    expect(buildSyntheticFleet()).toEqual(DATA);
  });

  it('keeps six aboard each tug out of twelve who rotate', () => {
    for (const tug of [FLEET_VESSELS.TERN, FLEET_VESSELS.PETREL, FLEET_VESSELS.SHEARWATER]) {
      const assigned = DATA.assignments.filter((assignment) => assignment.scope.kind === ACCESS_SCOPE_KIND.ENTITY && assignment.scope.entityId === tug.entityId);
      const crew = new Set(assigned.map((assignment) => assignment.actorId));
      const aboard = new Set(assigned.filter((assignment) => assignment.active).map((assignment) => assignment.actorId));
      expect([crew.size, aboard.size]).toEqual([12, 6]);
    }
  });

  it('holds a case for every fleet policy rule', () => {
    const all = new Set(DATA.entities.flatMap((vessel) => [...fired(vessel)]));
    const ruleIds = FLEET_CONFIGURATION.standards.flatMap((standard) => standard.rules.map((rule) => rule.id));
    expect(ruleIds.filter((id) => !all.has(id))).toEqual([]);
  });

  it('leaves an out-of-service vessel out of the maintenance schedule', () => {
    expect(evaluateEntity(FLEET_CONFIGURATION, DATA, FLEET_VESSELS.KESTREL_512, FLEET_AS_OF)[0]).toMatchObject({ applies: false, findings: [] });
  });

  it('has no one aboard the propane barge who can send its list', () => {
    const canSend = (vessel: EntityRecord) => resolveEntityFacts(FLEET_CONFIGURATION, DATA, vessel, FLEET_AS_OF)[FLEET_FACT.HAS_SENDING_OFFICER];
    expect(canSend(FLEET_VESSELS.KESTREL_410)).toBe(false);
    expect(canSend(FLEET_VESSELS.KESTREL_305)).toBe(true);
  });

  it('puts items in every status the shop uses', () => {
    const used = new Set(DATA.entries.map((entry) => entry.status));
    expect(Object.values(SUPPLY_STATUS).filter((status) => !used.has(status))).toEqual([]);
  });
});
