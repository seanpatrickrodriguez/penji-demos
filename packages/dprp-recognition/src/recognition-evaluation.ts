import { DELIVERY_MODE, PROGRAM_PHASE } from '@penji-demos/constants';
import { OutcomePathway, RecognitionStatus } from '@penji-demos/dprp-standard';
import { Determination, EligibilityDetermination, EntityId, EntryId, PlainDate, RequirementResult, StandardEvaluation, ValueOf } from '@penji-demos/types';

// What the DPRP's recognition evaluation produces: participants read on the
// program calendar, their outcomes, and the organization's recognition.

export type DeliveryMode = ValueOf<typeof DELIVERY_MODE>;
export type ProgramPhase = ValueOf<typeof PROGRAM_PHASE>;

// A session entry read as a session and placed on the program calendar of its cohort.
export interface ProgramSession {
  readonly entryId: EntryId;
  readonly sessionDate: PlainDate;
  readonly isMakeUp: boolean;
  readonly deliveryMode: DeliveryMode | null;
  // Null when no weight was reported for the session.
  readonly weightPounds: number | null;
  // Minutes of moderate or brisk activity since the previous session attended.
  readonly activityMinutes: number;
  readonly programMonth: number;
  readonly phase: ProgramPhase;
}

// An A1C result recorded after enrollment, read from its stream entry.
export interface A1cResult {
  readonly percent: number;
  readonly testDate: PlainDate;
  readonly reportedDate: PlainDate;
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
  readonly participantId: EntityId;
  // The IDs the organization assigned, as the participant and cohort records hold them.
  readonly participantCode: string;
  readonly cohortId: EntityId;
  readonly cohortCode: string;
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

export interface CohortWindow {
  readonly firstSessionOnOrAfter: PlainDate;
  readonly firstSessionBefore: PlainDate;
}

export interface RecognitionEvaluation {
  readonly submissionMonth: PlainDate;
  readonly window: CohortWindow;
  readonly evaluationCohortIds: readonly EntityId[];
  readonly participants: readonly ParticipantEvaluation[];
  readonly requirements: readonly RequirementResult[];
  readonly status: RecognitionStatus;
}
