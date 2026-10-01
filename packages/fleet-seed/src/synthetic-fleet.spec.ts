import { SUPPLY_STATUS } from '@penji-demos/constants';
import { FLEET_STANDARDS, evaluateVessel, isSendingOfficerAboard } from '@penji-demos/fleet-standard';
import { describe, expect, it } from 'vitest';
import { FLEET_VESSELS, buildSyntheticFleet } from './synthetic-fleet';

const DATA = buildSyntheticFleet();
const fired = (vessel: (typeof DATA.vessels)[number]) => new Set(evaluateVessel(DATA, vessel).flatMap((evaluation) => evaluation.findings.map((finding) => finding.ruleId)));

describe('the synthetic fleet', () => {
  it('is the same on every build', () => {
    expect(buildSyntheticFleet()).toEqual(DATA);
  });

  it('keeps six aboard each tug out of twelve who rotate', () => {
    for (const tug of [FLEET_VESSELS.TERN, FLEET_VESSELS.PETREL, FLEET_VESSELS.SHEARWATER]) {
      const crew = DATA.people.filter((person) => person.vesselIds.includes(tug.vesselId));
      expect([crew.length, crew.filter((person) => person.aboard).length]).toEqual([12, 6]);
    }
  });

  it('holds a case for every fleet policy rule', () => {
    const all = new Set(DATA.vessels.flatMap((vessel) => [...fired(vessel)]));
    const ruleIds = FLEET_STANDARDS.flatMap((standard) => standard.rules.map((rule) => rule.id));
    expect(ruleIds.filter((id) => !all.has(id))).toEqual([]);
  });

  it('leaves an out-of-service vessel out of the maintenance schedule', () => {
    expect(evaluateVessel(DATA, FLEET_VESSELS.KESTREL_512)[0]).toMatchObject({ applies: false, findings: [] });
  });

  it('has no one aboard the propane barge who can send its list', () => {
    expect(isSendingOfficerAboard(DATA, FLEET_VESSELS.KESTREL_410.vesselId)).toBe(false);
    expect(isSendingOfficerAboard(DATA, FLEET_VESSELS.KESTREL_305.vesselId)).toBe(true);
  });

  it('puts items in every status the shop uses', () => {
    const used = new Set(DATA.wantItems.map((item) => item.status));
    expect(Object.values(SUPPLY_STATUS).filter((status) => !used.has(status))).toEqual([]);
  });
});
