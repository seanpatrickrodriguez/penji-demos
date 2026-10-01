import { PROGRAM_PHASE, REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { CohortId, ParticipantId } from '../primitives/branded-ids';
import { PlainDate } from '../primitives/plain-date';
import { RequirementDefinition } from '../definitions/requirement-definition';
import { RuleFinding } from '../definitions/compliance-definition';
import { OutcomePathway, RecognitionStatus } from '../definitions/standard-definition';
import { SessionRecord } from '../records/program-records';

export type ProgramPhase = ValueOf<typeof PROGRAM_PHASE>;
export type RequirementOutcome = ValueOf<typeof REQUIREMENT_OUTCOME>;

// One criterion checked, whether it held, and what it was checked against.
export interface Finding {
  readonly criterion: string;
  readonly met: boolean;
  readonly detail: string;
}

// A determination always carries its evidence, so a reviewer sees why.
export interface Determination {
  readonly met: boolean;
  readonly findings: readonly Finding[];
}

// Eligibility under one standard: the criteria checked and the bases that held.
export interface EligibilityDetermination extends Determination {
  readonly basesMet: readonly string[];
}

// What one standard makes of one subject.
export interface StandardEvaluation {
  readonly standardShortName: string;
  readonly applies: boolean;
  // Null when the standard only checks records.
  readonly eligibility: EligibilityDetermination | null;
  readonly findings: readonly RuleFinding[];
}

// A session placed on the program calendar of its cohort.
export interface ProgramSession extends SessionRecord {
  readonly programMonth: number;
  readonly phase: ProgramPhase;
}

export interface WeightChange {
  readonly firstPounds: number;
  readonly firstDate: PlainDate;
  readonly lastPounds: number;
  readonly lastDate: PlainDate;
  readonly lossPercent: number;
}

export interface ActivitySummary {
  readonly reportingSessions: number;
  readonly weeklyMeanMinutes: number | null;
}

export interface OutcomeResult {
  readonly pathway: OutcomePathway;
  readonly label: string;
  readonly met: boolean;
  readonly detail: string;
}

export interface ParticipantEvaluation {
  readonly participantId: ParticipantId;
  readonly cohortId: CohortId;
  readonly sessions: readonly ProgramSession[];
  // Sessions on or after the cohort's first session and within the program year.
  readonly sessionsAttended: number;
  // Eligibility and record findings under every standard on record; the recognition standard's come first.
  readonly standards: readonly StandardEvaluation[];
  readonly eligibility: EligibilityDetermination;
  readonly completer: Determination & { readonly corePhaseSessions: number; readonly fullMonthsFirstToLast: number };
  readonly weightChange: WeightChange | null;
  readonly activity: ActivitySummary;
  readonly outcomes: readonly OutcomeResult[];
  readonly riskReduced: boolean;
  readonly retainedAtProgramMonth: Readonly<Record<number, boolean>>;
}

// A metric's value, with the counts behind a share so the page can show them.
export interface MetricValue {
  readonly value: number | null;
  readonly numerator: number | null;
  readonly denominator: number | null;
}

export interface RequirementResult {
  readonly requirement: RequirementDefinition;
  readonly measured: MetricValue;
  readonly outcome: RequirementOutcome;
}

export interface CohortWindow {
  readonly firstSessionOnOrAfter: PlainDate;
  readonly firstSessionBefore: PlainDate;
}

export interface RecognitionEvaluation {
  readonly submissionMonth: PlainDate;
  readonly window: CohortWindow;
  readonly evaluationCohortIds: readonly CohortId[];
  readonly participants: readonly ParticipantEvaluation[];
  readonly requirements: readonly RequirementResult[];
  readonly status: RecognitionStatus;
}
