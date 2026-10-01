import { DEFINITION_KIND, OUTCOME_PATHWAY, RECOGNITION_STATUS } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { Definition } from './definition';
import { RequirementDefinition, TierDefinition } from './requirement-definition';

export type RecognitionStatus = ValueOf<typeof RECOGNITION_STATUS>;
export type OutcomePathway = ValueOf<typeof OUTCOME_PATHWAY>;

export interface InclusiveRange {
  readonly min: number;
  readonly max: number;
}

// M2: who may be enrolled and evaluated.
export interface EligibilityDefinition {
  readonly minimumAgeYears: number;
  readonly minimumBmi: number;
  readonly minimumBmiAsian: number;
  readonly fastingGlucoseMgDl: InclusiveRange;
  readonly oralGlucoseToleranceMgDl: InclusiveRange;
  readonly a1cPercent: InclusiveRange;
  readonly bloodTestMaximumAgeDays: number;
}

// M2: the shape of the program year.
export interface ProgramDefinition {
  readonly durationDays: number;
  readonly corePhaseMonths: number;
  readonly minimumCoreSessionsOffered: number;
  readonly minimumCoreMaintenanceSessionsOffered: number;
}

// M2: who counts as a completer.
export interface CompleterDefinition {
  readonly minimumCorePhaseSessions: number;
  readonly minimumFullMonthsFirstSessionToLast: number;
}

// M2: one way a completer can show reduced risk.  Every threshold a pathway
// does not use is null, so one shape describes all of them.
export interface OutcomePathwayDefinition {
  readonly pathway: OutcomePathway;
  readonly label: string;
  readonly minimumWeightLossPercent: number | null;
  readonly minimumWeeklyActivityMinutes: number | null;
  readonly minimumActivitySessions: number | null;
  readonly minimumSessionsAttended: number | null;
  readonly minimumA1cReductionPoints: number | null;
}

// M2: rules on how sessions are held and recorded.
export interface SessionRulesDefinition {
  readonly groupJoinWindowDays: number;
  readonly makeUpSessionsPerWeek: number;
}

// M2: what makes an A1C pair usable for the A1C outcome.
export interface A1cOutcomeDefinition {
  readonly initialReportedWithinDaysOfFirstSession: number;
  readonly finalTestProgramMonths: InclusiveRange;
}

// M2: the early route to Preliminary recognition, open only at the first submissions.
export interface EarlyPreliminaryDefinition {
  readonly submissionSequences: readonly number[];
  readonly minimumSessionsAttended: number;
}

// M2: which cohorts an evaluation looks at, counted back from the submission month.
export interface EvaluationCohortDefinition {
  readonly minimumMonthsBeforeSubmission: number;
  readonly maximumMonthsBeforeSubmission: number;
}

// M2: retention checkpoints, as the start of a program month.
export interface RetentionCheckpoint {
  readonly programMonth: number;
}

// An ambiguous clause of the source text and how this standard definition reads it.
export interface Interpretation {
  readonly clause: string;
  readonly reading: string;
}

// M2: a recognition standard, complete enough to evaluate an organization.
export interface StandardDefinition extends Definition<typeof DEFINITION_KIND.STANDARD> {
  readonly edition: string;
  readonly eligibility: EligibilityDefinition;
  readonly program: ProgramDefinition;
  readonly completer: CompleterDefinition;
  readonly sessions: SessionRulesDefinition;
  readonly a1cOutcome: A1cOutcomeDefinition;
  readonly outcomePathways: readonly OutcomePathwayDefinition[];
  readonly evaluationCohort: EvaluationCohortDefinition;
  readonly retentionCheckpoints: readonly RetentionCheckpoint[];
  readonly earlyPreliminary: EarlyPreliminaryDefinition;
  readonly submissionIntervalMonths: number;
  readonly requirements: readonly RequirementDefinition[];
  readonly tiers: readonly TierDefinition<RecognitionStatus>[];
  readonly interpretations: readonly Interpretation[];
}
