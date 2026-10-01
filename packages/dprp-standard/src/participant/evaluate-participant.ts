import { FieldLabels, evaluateStandard } from '@penji-demos/compliance-engine';
import { FACT_LABELS, resolveComplianceSubject } from '@penji-demos/program-records';
import { isOnOrAfter, resolveProgramMonthStart } from '@penji-demos/time';
import { CohortRecord, ComplianceStandardDefinition, ParticipantEvaluation, ParticipantRecord, RecognitionStandardDefinition } from '@penji-demos/types';
import { calculateActivity, calculateWeightChange } from './calculate-measures';
import { evaluateCompleter } from './evaluate-completer';
import { calculateA1cReduction, evaluateOutcomes } from './evaluate-outcomes';
import { resolveCountedSessions, resolveProgramSessions } from './resolve-program-sessions';

// Everything the recognition standard says about one participant, with the
// evidence for each part, plus what every other standard on record makes of them.
export function evaluateParticipant(
  standard: RecognitionStandardDefinition,
  participant: ParticipantRecord,
  cohort: CohortRecord,
  otherStandards: readonly ComplianceStandardDefinition[] = [],
  labels: FieldLabels = FACT_LABELS,
): ParticipantEvaluation {
  const start = cohort.firstSessionDate;
  const subject = resolveComplianceSubject(participant, cohort);
  const standards = [standard, ...otherStandards].map((each) => evaluateStandard(each, subject, labels));
  const recognition = standards[0];
  if (!recognition) throw new Error('The recognition standard was not evaluated.');

  const sessions = resolveProgramSessions(standard, start, participant.sessions);
  const counted = resolveCountedSessions(sessions);
  const weightChange = calculateWeightChange(counted);
  const activity = calculateActivity(counted);
  const a1c = calculateA1cReduction(standard, participant, start, counted);
  const outcomes = evaluateOutcomes(standard, { weightChange, activity, sessionsAttended: counted.length, a1cReductionPoints: a1c.points, a1cDetail: a1c.detail });
  const retainedAtProgramMonth = Object.fromEntries(
    standard.retentionCheckpoints.map(({ programMonth }) => {
      const checkpoint = resolveProgramMonthStart(start, programMonth);
      return [programMonth, counted.some((session) => isOnOrAfter(session.sessionDate, checkpoint))];
    }),
  );

  return {
    participantId: participant.participantId,
    cohortId: participant.cohortId,
    sessions,
    sessionsAttended: counted.length,
    standards,
    eligibility: recognition.eligibility,
    completer: evaluateCompleter(standard, start, counted),
    weightChange,
    activity,
    outcomes,
    riskReduced: outcomes.some((outcome) => outcome.met),
    retainedAtProgramMonth,
  };
}
