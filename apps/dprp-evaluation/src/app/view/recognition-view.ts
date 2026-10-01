import { REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { SubmissionResult } from '@penji-demos/dprp-standard';
import { CohortRecord, RecognitionStandardDefinition, RecognitionStatus, RequirementOutcome } from '@penji-demos/types';
import { OUTCOME_LABEL, STATUS_LABEL, formatDate, formatMeasured, formatMonth, formatShortMonth, formatThreshold } from './format';

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

export interface TierView {
  readonly label: string;
  readonly reached: boolean;
  // False when a requirement of the tier cannot be measured at this submission, as the early route to Preliminary after Sequence 2.
  readonly open: boolean;
  readonly metCount: number;
  readonly requires: readonly { readonly label: string; readonly met: boolean }[];
}

export function resolveTierViews(standard: RecognitionStandardDefinition, entry: SubmissionResult): readonly TierView[] {
  const results = new Map(entry.evaluation.requirements.map((result) => [result.requirement.id, result]));
  return standard.tiers
    .filter((tier) => tier.requires.length > 0)
    .map((tier) => {
      const requires = tier.requires.map((id) => ({ label: results.get(id)?.requirement.label ?? id, met: results.get(id)?.outcome === REQUIREMENT_OUTCOME.MET }));
      // A count with no value at all (no denominator either) is a route this submission does not offer.
      const isClosed = (id: string) => results.get(id)?.outcome === REQUIREMENT_OUTCOME.UNMEASURED && results.get(id)?.measured.denominator === null;
      const open = !tier.requires.some(isClosed);
      return { label: tier.label, reached: requires.every((requirement) => requirement.met), open, metCount: requires.filter((requirement) => requirement.met).length, requires };
    });
}

export interface CohortRow {
  readonly cohortId: string;
  readonly firstSession: string;
  readonly inWindow: boolean;
  readonly participants: number;
}

export function resolveCohortRows(cohorts: readonly CohortRecord[], entry: SubmissionResult): readonly CohortRow[] {
  const inWindow = new Set<string>(entry.evaluation.evaluationCohortIds);
  return cohorts
    .filter((cohort) => cohort.firstSessionDate < entry.evaluation.submissionMonth)
    .map((cohort) => ({
      cohortId: cohort.cohortId,
      firstSession: formatDate(cohort.firstSessionDate),
      inWindow: inWindow.has(cohort.cohortId),
      participants: entry.evaluation.participants.filter((participant) => participant.cohortId === cohort.cohortId).length,
    }));
}

export const formatWindow = (entry: SubmissionResult): string =>
  `Cohorts whose first session fell from ${formatDate(entry.evaluation.window.firstSessionOnOrAfter)} up to ${formatDate(entry.evaluation.window.firstSessionBefore)}`;
