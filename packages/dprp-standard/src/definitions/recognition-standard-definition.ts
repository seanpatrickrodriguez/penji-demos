import { OUTCOME_PATHWAY, RECOGNITION_STATUS } from '@penji-demos/constants';
import {
  ComplianceStandardDefinition,
  EligibilityRulesDefinition,
  InclusiveRange,
  RequirementDefinition,
  StatusPersistence,
  TierDefinition,
  ValueOf,
} from '@penji-demos/types';

// The DPRP's own M2: a recognition standard is a compliance standard that also
// measures outcomes over a program year and awards recognition to an
// organization.  The platform's compliance and rule engines read the parts
// they know; the recognition package reads the rest.

export type RecognitionStatus = ValueOf<typeof RECOGNITION_STATUS>;
export type OutcomePathway = ValueOf<typeof OUTCOME_PATHWAY>;

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

// M2: what makes an A1C pair usable for the A1C outcome.
export interface A1cOutcomeDefinition {
  readonly initialRange: InclusiveRange;
  readonly initialTestedWithinDaysBeforeFirstSession: number;
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

// M2: a recognition standard: a compliance standard that also measures
// outcomes over a program year and awards recognition to an organization.
export interface RecognitionStandardDefinition extends ComplianceStandardDefinition {
  readonly eligibility: EligibilityRulesDefinition;
  readonly edition: string;
  readonly program: ProgramDefinition;
  readonly completer: CompleterDefinition;
  // The eligibility bases that count toward Requirement 7: a blood test or a history of gestational diabetes.
  readonly laboratoryBases: readonly string[];
  readonly a1cOutcome: A1cOutcomeDefinition;
  readonly outcomePathways: readonly OutcomePathwayDefinition[];
  readonly evaluationCohort: EvaluationCohortDefinition;
  readonly retentionCheckpoints: readonly RetentionCheckpoint[];
  readonly earlyPreliminary: EarlyPreliminaryDefinition;
  readonly submissionIntervalMonths: number;
  readonly requirements: readonly RequirementDefinition[];
  readonly tiers: readonly TierDefinition<RecognitionStatus>[];
  // Statuses lowest to highest, and how long each lasts once awarded.
  readonly statusOrder: readonly RecognitionStatus[];
  readonly statusPersistence: readonly StatusPersistence<RecognitionStatus>[];
}
