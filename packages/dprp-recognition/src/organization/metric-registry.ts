import { METRIC_KEY } from '@penji-demos/constants';
import { MetricCalculator } from '@penji-demos/rule-engine';
import { MetricValue, ParticipantEvaluation, RecognitionStandardDefinition, ValueOf } from '@penji-demos/types';

// What the DPRP metrics are calculated from.
export interface RecognitionContext {
  readonly standard: RecognitionStandardDefinition;
  // Participants in the evaluation cohort.
  readonly evaluationCohort: readonly ParticipantEvaluation[];
  // Every participant on record, for requirements that look beyond the evaluation cohort.
  readonly allParticipants: readonly ParticipantEvaluation[];
  // Which six-month data submission this is: 1 at six months after the effective date.
  readonly submissionSequence: number;
}

const count = (value: number): MetricValue => ({ value, numerator: null, denominator: null });
const share = (numerator: number, denominator: number): MetricValue => ({
  value: denominator === 0 ? null : numerator / denominator,
  numerator,
  denominator,
});

const eligibleIn = (participants: readonly ParticipantEvaluation[]) => participants.filter((participant) => participant.eligibility.met);
const completersIn = (participants: readonly ParticipantEvaluation[]) => eligibleIn(participants).filter((participant) => participant.completer.met);
const retainedShare = (programMonth: number) => (context: RecognitionContext): MetricValue => {
  const eligible = eligibleIn(context.evaluationCohort);
  return share(eligible.filter((participant) => participant.retainedAtProgramMonth[programMonth]).length, eligible.length);
};

// How each metric the standard names is calculated.  The standard decides the
// thresholds; this registry decides only what is counted.
export const DPRP_METRIC_REGISTRY = {
  [METRIC_KEY.ELIGIBLE_PARTICIPANTS]: (context) => count(eligibleIn(context.evaluationCohort).length),
  [METRIC_KEY.COMPLETER_SHARE_OF_ELIGIBLE]: (context) =>
    share(completersIn(context.evaluationCohort).length, eligibleIn(context.evaluationCohort).length),
  [METRIC_KEY.RISK_REDUCTION_SHARE_OF_COMPLETERS]: (context) => {
    const completers = completersIn(context.evaluationCohort);
    return share(completers.filter((participant) => participant.riskReduced).length, completers.length);
  },
  [METRIC_KEY.BLOOD_TEST_OR_GDM_SHARE_OF_COMPLETERS]: (context) => {
    const completers = completersIn(context.evaluationCohort);
    const laboratory = new Set(context.standard.laboratoryBases);
    return share(completers.filter((participant) => participant.eligibility.basesMet.some((basis) => laboratory.has(basis))).length, completers.length);
  },
  [METRIC_KEY.RETAINED_SHARE_AT_MONTH_4]: retainedShare(4),
  [METRIC_KEY.RETAINED_SHARE_AT_MONTH_7]: retainedShare(7),
  [METRIC_KEY.RETAINED_SHARE_AT_MONTH_10]: retainedShare(10),
  // Only defined at the submissions the standard opens this route for; elsewhere it is unmeasured.
  [METRIC_KEY.ELIGIBLE_WITH_MINIMUM_CORE_SESSIONS]: ({ standard, allParticipants, submissionSequence }) =>
    standard.earlyPreliminary.submissionSequences.includes(submissionSequence)
      ? count(eligibleIn(allParticipants).filter((participant) => participant.sessionsAttended >= standard.earlyPreliminary.minimumSessionsAttended).length)
      : { value: null, numerator: null, denominator: null },
} satisfies Readonly<Record<ValueOf<typeof METRIC_KEY>, MetricCalculator<RecognitionContext>>>;
