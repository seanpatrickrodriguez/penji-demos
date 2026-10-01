import { COHORT_KIND, DELIVERY_MODE, INELIGIBILITY_EVENT, RESULT_SOURCE } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { CoachId, CohortId, OrganizationCode, ParticipantId } from '../primitives/branded-ids';
import { PlainDate } from '../primitives/plain-date';

// M0: the records an organization keeps.  They are stored in readable form;
// the DPRP's column names and codes are applied only when a submission file is made.

export type DeliveryMode = ValueOf<typeof DELIVERY_MODE>;
export type IneligibilityEvent = ValueOf<typeof INELIGIBILITY_EVENT>;

export interface OrganizationRecord {
  readonly organizationCode: OrganizationCode;
  readonly name: string;
  readonly deliveryMode: DeliveryMode;
  readonly effectiveDate: PlainDate;
}

export interface CohortRecord {
  readonly cohortId: CohortId;
  readonly organizationCode: OrganizationCode;
  readonly kind: ValueOf<typeof COHORT_KIND>;
  readonly firstSessionDate: PlainDate;
}

export type ResultSource = ValueOf<typeof RESULT_SOURCE>;

// The facts gathered at enrollment.  Each standard decides what they mean:
// the same fasting glucose of 105 is prediabetes for the DPRP and not for the MDPP.
export interface Enrollment {
  readonly enrollmentDate: PlainDate;
  readonly ageYears: number;
  readonly heightInches: number;
  readonly identifiesAsAsian: boolean;
  readonly a1cPercent: number | null;
  readonly a1cTestDate: PlainDate | null;
  readonly a1cReportedDate: PlainDate | null;
  readonly fastingGlucoseMgDl: number | null;
  readonly fastingGlucoseTestDate: PlainDate | null;
  readonly oralGlucoseToleranceMgDl: number | null;
  readonly oralGlucoseToleranceTestDate: PlainDate | null;
  readonly bloodTestSource: ResultSource | null;
  readonly gestationalDiabetesHistory: boolean;
  readonly riskTestPositive: boolean;
  readonly diabetesDiagnosed: boolean;
  readonly pregnant: boolean;
  readonly medicarePartB: boolean;
  readonly endStageRenalDisease: boolean;
  readonly priorMdpp: boolean;
}

// An A1C result recorded after enrollment, such as the final test for the A1C outcome.
export interface A1cResult {
  readonly percent: number;
  readonly testDate: PlainDate;
  readonly reportedDate: PlainDate;
}

export interface SessionRecord {
  readonly sessionDate: PlainDate;
  readonly isMakeUp: boolean;
  readonly deliveryMode: DeliveryMode;
  // Null when no weight was reported for the session.
  readonly weightPounds: number | null;
  // Minutes of moderate or brisk activity since the previous session attended.
  readonly activityMinutes: number;
}

export interface ParticipantRecord {
  readonly participantId: ParticipantId;
  readonly cohortId: CohortId;
  readonly coachId: CoachId;
  readonly enrollment: Enrollment;
  readonly sessions: readonly SessionRecord[];
  readonly finalA1c: A1cResult | null;
  readonly ineligibleSince: { readonly event: IneligibilityEvent; readonly date: PlainDate } | null;
}

export interface OrganizationData {
  readonly organization: OrganizationRecord;
  readonly cohorts: readonly CohortRecord[];
  readonly participants: readonly ParticipantRecord[];
}
