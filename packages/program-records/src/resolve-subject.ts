import { DERIVED_FACT, SESSION_FIELD } from '@penji-demos/constants';
import { ComplianceSubject } from '@penji-demos/compliance-engine';
import { isOnOrAfter } from '@penji-demos/time';
import { Answers, CohortRecord, Enrollment, ParticipantRecord, SessionRecord } from '@penji-demos/types';

// Body mass index from pounds and inches.
export function calculateBmi(weightPounds: number, heightInches: number): number {
  return (703 * weightPounds) / (heightInches * heightInches);
}

export function resolveEnrollmentAnswers(enrollment: Enrollment): Answers {
  return { ...enrollment };
}

export function resolveSessionAnswers(session: SessionRecord): Answers {
  return {
    [SESSION_FIELD.SESSION_DATE]: session.sessionDate,
    [SESSION_FIELD.IS_MAKE_UP]: session.isMakeUp,
    [SESSION_FIELD.DELIVERY_MODE]: session.deliveryMode,
    [SESSION_FIELD.WEIGHT_REPORTED]: session.weightPounds !== null,
    [SESSION_FIELD.WEIGHT_POUNDS]: session.weightPounds,
    [SESSION_FIELD.ACTIVITY_MINUTES]: session.activityMinutes,
  };
}

// A participant's facts: what was entered at enrollment, plus what their records show.
export function resolveParticipantFacts(participant: ParticipantRecord, cohort: CohortRecord): Answers {
  const attended = [...participant.sessions].filter((session) => isOnOrAfter(session.sessionDate, cohort.firstSessionDate)).sort((a, b) => (a.sessionDate < b.sessionDate ? -1 : 1));
  const firstWeight = attended.find((session) => session.weightPounds !== null)?.weightPounds ?? null;
  return {
    ...resolveEnrollmentAnswers(participant.enrollment),
    [DERIVED_FACT.COHORT_START_DATE]: cohort.firstSessionDate,
    [DERIVED_FACT.COHORT_KIND]: cohort.kind,
    [DERIVED_FACT.FIRST_SESSION_DATE]: attended[0]?.sessionDate ?? null,
    [DERIVED_FACT.FIRST_SESSION_BMI]: firstWeight === null ? null : Math.round(calculateBmi(firstWeight, participant.enrollment.heightInches) * 10) / 10,
    [DERIVED_FACT.RECODED_INELIGIBLE]: participant.ineligibleSince !== null,
  };
}

export function resolveComplianceSubject(participant: ParticipantRecord, cohort: CohortRecord): ComplianceSubject {
  return {
    facts: resolveParticipantFacts(participant, cohort),
    sessions: participant.sessions.map((session) => ({ sessionDate: session.sessionDate, values: resolveSessionAnswers(session) })),
  };
}
