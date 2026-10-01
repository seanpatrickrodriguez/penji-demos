import { COMPARATOR, METRIC_KEY } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { SourceReference } from './definition';

export type MetricKey = ValueOf<typeof METRIC_KEY>;
export type Comparator = ValueOf<typeof COMPARATOR>;

// M2: one measurable requirement.  It names a metric, how to compare it and
// the threshold, and says nothing about how the metric is calculated.
export interface RequirementDefinition {
  readonly id: string;
  readonly label: string;
  readonly metric: MetricKey;
  readonly comparator: Comparator;
  readonly threshold: number;
  readonly unit: 'count' | 'share';
  // Requirements that must be met before this one is calculated at all.
  readonly evaluatedAfter: readonly string[];
  readonly source: SourceReference;
}

// M2: a status awarded when every requirement it lists is met.  Tiers are
// listed highest first; the first tier whose requirements all hold is awarded.
export interface TierDefinition<Status extends string> {
  readonly status: Status;
  readonly label: string;
  readonly requires: readonly string[];
}
