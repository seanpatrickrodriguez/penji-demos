import { COMPARATOR, REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { MetricKey, MetricValue, RequirementDefinition, RequirementResult, StatusPersistence, TierDefinition } from '@penji-demos/types';

// The engine knows requirements, metrics and tiers.  It does not know what a
// participant, a session or the DPRP is: a standard supplies the definitions,
// and a registry supplies how each named metric is calculated.

export type MetricCalculator<Context> = (context: Context) => MetricValue;
export type MetricRegistry<Context> = Readonly<Record<MetricKey, MetricCalculator<Context>>>;

export function isComparisonMet(requirement: RequirementDefinition, value: number): boolean {
  switch (requirement.comparator) {
    case COMPARATOR.AT_LEAST:
      return value >= requirement.threshold;
    case COMPARATOR.AT_MOST:
      return value <= requirement.threshold;
  }
}

export function evaluateRequirement(requirement: RequirementDefinition, measured: MetricValue): RequirementResult {
  if (measured.value === null) return { requirement, measured, outcome: REQUIREMENT_OUTCOME.UNMEASURED };
  return { requirement, measured, outcome: isComparisonMet(requirement, measured.value) ? REQUIREMENT_OUTCOME.MET : REQUIREMENT_OUTCOME.NOT_MET };
}

const NOT_CALCULATED: MetricValue = { value: null, numerator: null, denominator: null };

// Evaluates requirements in order.  Each metric is calculated once, and a
// requirement whose prerequisites are not all met is not calculated at all.
export function evaluateRequirements<Context>(
  requirements: readonly RequirementDefinition[],
  registry: MetricRegistry<Context>,
  context: Context,
): readonly RequirementResult[] {
  const metrics = new Map<MetricKey, MetricValue>();
  const results = new Map<string, RequirementResult>();
  for (const requirement of requirements) {
    const blocked = requirement.evaluatedAfter.some((id) => results.get(id)?.outcome !== REQUIREMENT_OUTCOME.MET);
    if (blocked) {
      results.set(requirement.id, { requirement, measured: NOT_CALCULATED, outcome: REQUIREMENT_OUTCOME.NOT_EVALUATED });
      continue;
    }
    let measured = metrics.get(requirement.metric);
    if (!measured) {
      measured = registry[requirement.metric](context);
      metrics.set(requirement.metric, measured);
    }
    results.set(requirement.id, evaluateRequirement(requirement, measured));
  }
  return requirements.map((requirement) => results.get(requirement.id) ?? { requirement, measured: NOT_CALCULATED, outcome: REQUIREMENT_OUTCOME.NOT_EVALUATED });
}

// Tiers are listed highest first; the first whose requirements are all met is awarded.
export function resolveTier<Status extends string>(
  tiers: readonly TierDefinition<Status>[],
  results: readonly RequirementResult[],
): TierDefinition<Status> | null {
  const outcome = new Map(results.map((result) => [result.requirement.id, result.outcome]));
  return tiers.find((tier) => tier.requires.every((id) => outcome.get(id) === REQUIREMENT_OUTCOME.MET)) ?? null;
}

// Problems in a set of requirement and tier definitions: a metric with no
// calculator, a prerequisite or tier entry naming no requirement, or a
// prerequisite listed after the requirement that needs it.
export function validateRequirementDefinitions<Context, Status extends string>(
  requirements: readonly RequirementDefinition[],
  tiers: readonly TierDefinition<Status>[],
  registry: Partial<MetricRegistry<Context>>,
): readonly string[] {
  const problems: string[] = [];
  const position = new Map(requirements.map((requirement, index) => [requirement.id, index]));
  requirements.forEach((requirement, index) => {
    if (!registry[requirement.metric]) problems.push(`Requirement "${requirement.id}" names metric "${requirement.metric}", which has no calculator.`);
    for (const id of requirement.evaluatedAfter) {
      const at = position.get(id);
      if (at === undefined) problems.push(`Requirement "${requirement.id}" waits on "${id}", which is not a requirement.`);
      else if (at >= index) problems.push(`Requirement "${requirement.id}" waits on "${id}", which is listed after it.`);
    }
  });
  for (const tier of tiers) {
    for (const id of tier.requires) if (!position.has(id)) problems.push(`Tier "${tier.status}" requires "${id}", which is not a requirement.`);
  }
  return problems;
}

export interface StatusAtSubmission<Status extends string> {
  readonly evaluated: Status;
  readonly awarded: Status;
  // When the awarded status is held over from an earlier submission, the months since it was earned.
  readonly heldForMonths: number | null;
}

// The status an organization holds at each submission, in order.  A status
// earned earlier carries forward for as long as its persistence allows; a
// higher status earned now replaces it.
export function resolveStatusTimeline<Status extends string>(
  order: readonly Status[],
  persistence: readonly StatusPersistence<Status>[],
  evaluated: readonly Status[],
  intervalMonths: number,
): readonly StatusAtSubmission<Status>[] {
  const rank = (status: Status) => order.indexOf(status);
  const rules = new Map(persistence.map((rule) => [rule.status, rule]));
  let held: { status: Status; earnedAt: number } | null = null;
  return evaluated.map((status, index) => {
    if (held) {
      const rule = rules.get(held.status);
      const age = (index - held.earnedAt) * intervalMonths;
      if (!rule) held = null;
      else if (rule.lastsMonths !== null && age >= rule.lastsMonths) held = rule.fallsTo ? { status: rule.fallsTo, earnedAt: index } : null;
    }
    if (!held || rank(status) >= rank(held.status)) held = rules.has(status) ? { status, earnedAt: index } : null;
    const awarded = held && rank(held.status) > rank(status) ? held.status : status;
    return { evaluated: status, awarded, heldForMonths: awarded === status ? null : (index - (held?.earnedAt ?? index)) * intervalMonths };
  });
}
