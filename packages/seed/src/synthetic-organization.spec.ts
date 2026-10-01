import { RECOGNITION_STATUS } from '@penji-demos/constants';
import { DPRP_STANDARD_2024, evaluateRecognitionTimeline, resolveRecordsAsOf } from '@penji-demos/dprp-standard';
import { MDPP_STANDARD } from '@penji-demos/mdpp-standard';
import { toPlainDate } from '@penji-demos/time';
import { describe, expect, it } from 'vitest';
import { buildSyntheticOrganization } from './synthetic-organization';

const DATA = buildSyntheticOrganization();
const TIMELINE = evaluateRecognitionTimeline(DPRP_STANDARD_2024, DATA, toPlainDate('2027-01-01'), [MDPP_STANDARD]);

describe('the synthetic organization', () => {
  it('is the same on every build', () => {
    expect(buildSyntheticOrganization()).toEqual(DATA);
  });

  it('holds a case for every DPRP and MDPP rule that can fire on records', () => {
    const fired = new Set(TIMELINE.at(-1)?.evaluation.participants.flatMap((participant) => participant.standards.flatMap((standard) => standard.findings.map((finding) => finding.ruleId))));
    for (const id of ['dprp-weight-range', 'dprp-weight-outlier', 'dprp-same-date-weight', 'dprp-one-regular-session-per-date', 'dprp-session-within-program-year', 'dprp-group-join-window', 'dprp-mdpp-lab-results', 'mdpp-blood-test-source']) {
      expect(fired.has(id), id).toBe(true);
    }
  });

  it('shows only the records that existed when each submission was due', () => {
    const asOf = resolveRecordsAsOf(DATA, toPlainDate('2024-07-01'));
    expect(asOf.participants.every((participant) => participant.sessions.every((session) => session.sessionDate < '2024-07-01'))).toBe(true);
    expect(asOf.cohorts.map((cohort) => cohort.cohortId)).toEqual(['G2403', 'G2406']);
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
});
