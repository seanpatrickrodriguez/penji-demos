import { COMPARATOR, REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { MetricKey, MetricValue, RequirementDefinition, StatusPersistence, TierDefinition } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { MetricRegistry, evaluateRequirements, resolveStatusTimeline, resolveTier, validateRequirementDefinitions } from './rule-engine';

// The engine is tested with a context of plain numbers, to show it needs nothing domain-specific.
type Context = Readonly<Partial<Record<MetricKey, number | null>>>;

const SOURCE = { title: 'Test standard', url: 'https://example.org' };
const share = (value: number | null): MetricValue => ({ value, numerator: null, denominator: null });
const read = (key: MetricKey) => (context: Context) => share(context[key] ?? null);
// A made-up standard's metrics: members on the roster, members who stayed, members who improved.
const MEMBERS = 'members';
const STAYED = 'stayedShare';
const IMPROVED = 'improvedShare';
const registry: MetricRegistry<Context> = {
  [MEMBERS]: read(MEMBERS),
  [STAYED]: read(STAYED),
  [IMPROVED]: read(IMPROVED),
};

const requirement = (id: string, metric: MetricKey, threshold: number, evaluatedAfter: readonly string[] = []): RequirementDefinition => ({
  id,
  reference: id,
  label: id,
  metric,
  comparator: COMPARATOR.AT_LEAST,
  threshold,
  unit: 'share',
  evaluatedAfter,
  source: SOURCE,
});

const REQUIREMENTS = [
  requirement('enough', MEMBERS, 5),
  requirement('retained', STAYED, 0.3),
  requirement('outcomes', IMPROVED, 0.6, ['enough', 'retained']),
];
const TIERS: readonly TierDefinition<'gold' | 'silver' | 'base'>[] = [
  { status: 'gold', label: 'Gold', route: null, requires: ['enough', 'retained', 'outcomes'] },
  { status: 'silver', label: 'Silver', route: null, requires: ['enough', 'retained'] },
  { status: 'base', label: 'Base', route: null, requires: [] },
];

describe('evaluateRequirements', () => {
  it('compares each metric with its threshold', () => {
    const results = evaluateRequirements(REQUIREMENTS, registry, { members: 6, stayedShare: 0.25 });
    expect(results.map((result) => result.outcome)).toEqual([REQUIREMENT_OUTCOME.MET, REQUIREMENT_OUTCOME.NOT_MET, REQUIREMENT_OUTCOME.NOT_EVALUATED]);
  });

  it('reads a metric with no data as unmeasured, never as zero', () => {
    const [first] = evaluateRequirements(REQUIREMENTS, registry, {});
    expect(first?.outcome).toBe(REQUIREMENT_OUTCOME.UNMEASURED);
  });

  it('calculates a requirement once its prerequisites are met', () => {
    const results = evaluateRequirements(REQUIREMENTS, registry, { members: 6, stayedShare: 0.5, improvedShare: 0.7 });
    expect(results.every((result) => result.outcome === REQUIREMENT_OUTCOME.MET)).toBe(true);
  });
});

describe('resolveTier', () => {
  it('awards the highest tier whose requirements all hold', () => {
    const results = evaluateRequirements(REQUIREMENTS, registry, { members: 6, stayedShare: 0.5, improvedShare: 0.4 });
    expect(resolveTier(TIERS, results)?.status).toBe('silver');
  });
});

describe('validateRequirementDefinitions', () => {
  it('finds nothing wrong with consistent definitions', () => {
    expect(validateRequirementDefinitions(REQUIREMENTS, TIERS, registry)).toEqual([]);
  });

  it('reports missing calculators, unknown prerequisites and out-of-order prerequisites', () => {
    const { members: _omitted, ...partial } = registry;
    const broken = [requirement('late', MEMBERS, 1, ['later', 'missing']), requirement('later', STAYED, 1)];
    expect(validateRequirementDefinitions(broken, [{ status: 'base', label: 'Base', route: null, requires: ['nope'] }], partial)).toEqual([
      'Requirement "late" names metric "members", which has no calculator.',
      'Requirement "late" waits on "later", which is listed after it.',
      'Requirement "late" waits on "missing", which is not a requirement.',
      'Tier "base" requires "nope", which is not a requirement.',
    ]);
  });
});

describe('resolveStatusTimeline', () => {
  const ORDER = ['none', 'bronze', 'silver', 'gold'] as const;
  type Status = (typeof ORDER)[number];
  const PERSISTENCE: readonly StatusPersistence<Status>[] = [
    { status: 'bronze', lastsMonths: null, fallsTo: null },
    { status: 'silver', lastsMonths: null, fallsTo: null },
    { status: 'gold', lastsMonths: 12, fallsTo: 'silver' },
  ];

  it('carries a status forward, and lets a time-limited status fall back when it lapses', () => {
    const evaluated: readonly Status[] = ['bronze', 'none', 'silver', 'gold', 'silver', 'silver', 'silver'];
    expect(resolveStatusTimeline(ORDER, PERSISTENCE, evaluated, 6).map((entry) => entry.awarded)).toEqual(['bronze', 'bronze', 'silver', 'gold', 'gold', 'silver', 'silver']);
  });

  it('says how long a carried status has been held', () => {
    const [, second] = resolveStatusTimeline(ORDER, PERSISTENCE, ['bronze', 'none'], 6);
    expect(second).toEqual({ evaluated: 'none', awarded: 'bronze', heldForMonths: 6 });
  });
});
