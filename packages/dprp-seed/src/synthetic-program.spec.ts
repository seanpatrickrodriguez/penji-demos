import { COHORT_FIELD, PROGRAM_ENTITY, RECOGNITION_STATUS } from '@penji-demos/constants';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { evaluateRecognitionTimeline } from '@penji-demos/dprp-recognition';
import { DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { isPermittedOnRecord, resolveDataAsOf } from '@penji-demos/record-engine';
import { toPlainDate } from '@penji-demos/time';
import { describe, expect, it } from 'vitest';
import { SYNTHETIC_DATA_SPECIALIST_ID, SYNTHETIC_HUB_DATA_SPECIALIST_ID, SYNTHETIC_ORGANIZATION_ID, buildSyntheticProgram } from './synthetic-program';

const DATA = buildSyntheticProgram();
const TIMELINE = evaluateRecognitionTimeline(DPRP_STANDARD_2024, PROGRAM_CONFIGURATION, DATA, SYNTHETIC_ORGANIZATION_ID, toPlainDate('2027-01-01'));

describe('the synthetic program', () => {
  it('is the same on every build', () => {
    expect(buildSyntheticProgram()).toEqual(DATA);
  });

  it('holds a case for every DPRP and MDPP rule that can fire on records', () => {
    const fired = new Set(TIMELINE.at(-1)?.evaluation.participants.flatMap((participant) => participant.standards.flatMap((standard) => standard.findings.map((finding) => finding.ruleId))));
    for (const id of ['dprp-weight-range', 'dprp-weight-outlier', 'dprp-same-date-weight', 'dprp-one-regular-session-per-date', 'dprp-session-within-program-year', 'dprp-group-join-window', 'dprp-mdpp-lab-results', 'mdpp-blood-test-source']) {
      expect(fired.has(id), id).toBe(true);
    }
  });

  it('shows only the records that existed when each submission was due', () => {
    const asOf = resolveDataAsOf(PROGRAM_CONFIGURATION, DATA, toPlainDate('2024-07-01'));
    expect(asOf.entries.every((entry) => entry.date < '2024-07-01')).toBe(true);
    expect(asOf.entities.filter((entity) => entity.kind === PROGRAM_ENTITY.COHORT).map((cohort) => cohort.values[COHORT_FIELD.CODE])).toEqual(['G2403', 'G2406']);
  });

  it('moves through the recognition statuses over its submissions, carrying each forward as the Standards allow', () => {
    expect(TIMELINE.map((entry) => entry.awarded)).toEqual([
      RECOGNITION_STATUS.PENDING,
      RECOGNITION_STATUS.PRELIMINARY,
      RECOGNITION_STATUS.PRELIMINARY,
      RECOGNITION_STATUS.PRELIMINARY,
      RECOGNITION_STATUS.FULL_PLUS,
      RECOGNITION_STATUS.FULL_PLUS,
      RECOGNITION_STATUS.FULL_PLUS,
    ]);
    expect(TIMELINE.at(-1)?.evaluation.status).toBe(RECOGNITION_STATUS.PRELIMINARY);
  });

  it('lets the organization’s data specialist and the hub’s edit any participant, through the same kind of assignment at different tenants', () => {
    const participant = DATA.entities.find((entity) => entity.kind === PROGRAM_ENTITY.PARTICIPANT);
    if (!participant) throw new Error('The program has no participants.');
    for (const actorId of [SYNTHETIC_DATA_SPECIALIST_ID, SYNTHETIC_HUB_DATA_SPECIALIST_ID]) {
      expect(isPermittedOnRecord(PROGRAM_CONFIGURATION, DATA, actorId, 'editEnrollment', participant)).toBe(true);
    }
  });
});
