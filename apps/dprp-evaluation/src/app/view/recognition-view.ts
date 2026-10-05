import { REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { SubmissionResult } from '@penji-demos/dprp-recognition';
import { COHORT_FIELD } from '@penji-demos/constants';
import { readDate, readText } from '@penji-demos/record-engine';
import { EntityRecord, RequirementOutcome } from '@penji-demos/types';
import { RecognitionStandardDefinition, RecognitionStatus } from '@penji-demos/dprp-standard';
import { formatDate, formatMonth, formatShortMonth } from '@penji-demos/ui';
import { OUTCOME_LABEL, STATUS_LABEL, formatMeasured, formatThreshold } from './format';

export interface SubmissionView {
  readonly sequence: number;
  readonly month: string;
  readonly shortMonth: string;
  readonly awarded: RecognitionStatus;
  readonly awardedLabel: string;
  readonly evaluatedLabel: string;
  readonly held: boolean;
  readonly note: string;
}

export function resolveSubmissionViews(timeline: readonly SubmissionResult[]): readonly SubmissionView[] {
  return timeline.map((entry) => {
    const held = entry.awarded !== entry.evaluation.status;
    return {
      sequence: entry.sequence,
      month: formatMonth(entry.evaluation.submissionMonth),
      shortMonth: formatShortMonth(entry.evaluation.submissionMonth),
      awarded: entry.awarded,
      awardedLabel: STATUS_LABEL[entry.awarded],
      evaluatedLabel: STATUS_LABEL[entry.evaluation.status],
      held,
      note: held ? `Evaluated ${STATUS_LABEL[entry.evaluation.status]}; ${STATUS_LABEL[entry.awarded]} held from ${entry.heldForMonths} months earlier` : `Earned at this submission`,
    };
  });
}

export interface RequirementRow {
  readonly id: string;
  readonly reference: string;
  readonly label: string;
  readonly measured: string;
  readonly threshold: string;
  readonly outcome: RequirementOutcome;
  readonly outcomeLabel: string;
  // Shown only where it differs from the row above, so a shared section is cited once.
  readonly citation: string | null;
  readonly citationUrl: string;
  readonly waitsOn: string;
}

export function resolveRequirementRows(entry: SubmissionResult): readonly RequirementRow[] {
  const labels = new Map(entry.evaluation.requirements.map((result) => [result.requirement.id, result.requirement.label]));
  return entry.evaluation.requirements.map(({ requirement, measured, outcome }, index, all) => ({
    id: requirement.id,
    reference: requirement.reference,
    label: requirement.label,
    measured: outcome === REQUIREMENT_OUTCOME.NOT_EVALUATED ? 'Not calculated' : formatMeasured(requirement, measured),
    threshold: formatThreshold(requirement),
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    citation: all[index - 1]?.requirement.source.section === requirement.source.section ? null : (requirement.source.section ?? requirement.source.title),
    citationUrl: requirement.source.url,
    waitsOn: requirement.evaluatedAfter.length > 0 ? `Calculated once ${requirement.evaluatedAfter.map((id) => labels.get(id)?.split(' ').slice(0, 4).join(' ') ?? id).join(' and ')} are met` : '',
  }));
}

export interface TierRequirementView {
  readonly mark: string;
  readonly reference: string;
  readonly label: string;
  readonly outcome: RequirementOutcome;
  readonly outcomeLabel: string;
}

export interface TierRouteView {
  readonly route: string | null;
  readonly reached: boolean;
  // False when the route is not offered at this submission, as option 3 after Sequence 2.
  readonly open: boolean;
  readonly requires: readonly TierRequirementView[];
}

export interface TierGroupView {
  readonly status: RecognitionStatus;
  readonly label: string;
  readonly reached: boolean;
  readonly routes: readonly TierRouteView[];
}

const OUTCOME_MARK: Readonly<Record<RequirementOutcome, string>> = {
  [REQUIREMENT_OUTCOME.MET]: '✓',
  [REQUIREMENT_OUTCOME.NOT_MET]: '✗',
  [REQUIREMENT_OUTCOME.UNMEASURED]: '–',
  [REQUIREMENT_OUTCOME.NOT_EVALUATED]: '–',
};

// Tiers grouped by the status they award, highest first, each route with the
// requirements it needs.  A status reached by any one route is reached.
export function resolveTierGroups(standard: RecognitionStandardDefinition, entry: SubmissionResult): readonly TierGroupView[] {
  const results = new Map(entry.evaluation.requirements.map((result) => [result.requirement.id, result]));
  const groups: TierGroupView[] = [];
  for (const tier of standard.tiers.filter((candidate) => candidate.requires.length > 0)) {
    const requires = tier.requires.flatMap((id) => {
      const result = results.get(id);
      return result ? [{ mark: OUTCOME_MARK[result.outcome], reference: result.requirement.reference, label: result.requirement.label, outcome: result.outcome, outcomeLabel: OUTCOME_LABEL[result.outcome] }] : [];
    });
    // A count with no value at all (no denominator either) is a route this submission does not offer.
    const open = !tier.requires.some((id) => results.get(id)?.outcome === REQUIREMENT_OUTCOME.UNMEASURED && results.get(id)?.measured.denominator === null);
    const route: TierRouteView = { route: tier.route, reached: requires.every((requirement) => requirement.outcome === REQUIREMENT_OUTCOME.MET), open, requires };
    const existing = groups.find((group) => group.status === tier.status);
    if (existing) groups[groups.indexOf(existing)] = { ...existing, reached: existing.reached || route.reached, routes: [...existing.routes, route] };
    else groups.push({ status: tier.status, label: STATUS_LABEL[tier.status], reached: route.reached, routes: [route] });
  }
  return groups;
}

export interface CohortRow {
  readonly cohortId: string;
  readonly cohortCode: string;
  readonly firstSession: string;
  readonly inWindow: boolean;
  readonly participants: number;
}

export function resolveCohortRows(cohorts: readonly EntityRecord[], entry: SubmissionResult): readonly CohortRow[] {
  const inWindow = new Set<string>(entry.evaluation.evaluationCohortIds);
  return cohorts.flatMap((cohort) => {
    const start = readDate(cohort.values, COHORT_FIELD.START_DATE);
    if (!start || start >= entry.evaluation.submissionMonth) return [];
    return [
      {
        cohortId: cohort.entityId,
        cohortCode: readText(cohort.values, COHORT_FIELD.CODE) ?? cohort.entityId,
        firstSession: formatDate(start),
        inWindow: inWindow.has(cohort.entityId),
        participants: entry.evaluation.participants.filter((participant) => participant.cohortId === cohort.entityId).length,
      },
    ];
  });
}

export const formatWindow = (entry: SubmissionResult): string =>
  `Cohorts whose first session fell from ${formatDate(entry.evaluation.window.firstSessionOnOrAfter)} up to ${formatDate(entry.evaluation.window.firstSessionBefore)}`;
