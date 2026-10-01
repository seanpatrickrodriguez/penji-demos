import { SUBMISSION_COLUMN } from '@penji-demos/constants';
import { isOnOrAfter, resolveProgramMonthStart } from '@penji-demos/time';
import { CohortRecord, ParticipantEvaluation, ParticipantRecord, StandardDefinition } from '@penji-demos/types';
import { resolveDataElement } from '../definitions/data-dictionary-2024';
import { calculateActivity, calculateWeightChange } from './calculate-measures';
import { evaluateCompleter } from './evaluate-completer';
import { evaluateEligibility } from './evaluate-eligibility';
import { calculateA1cReduction, evaluateOutcomes } from './evaluate-outcomes';
import { resolveCountedSessions, resolveProgramSessions } from './resolve-program-sessions';
import { validateParticipantRecord } from './validate-participant-record';

// Everything the standard says about one participant, with the evidence for each part.
export function evaluateParticipant(standard: StandardDefinition, participant: ParticipantRecord, cohort: CohortRecord): ParticipantEvaluation {
  const start = cohort.firstSessionDate;
  const sessions = resolveProgramSessions(standard, start, participant.sessions);
  const counted = resolveCountedSessions(sessions);
  const weightChange = calculateWeightChange(counted);
  const activity = calculateActivity(counted);
  const a1c = calculateA1cReduction(standard, participant, start, counted);
  const outcomes = evaluateOutcomes(standard, {
    weightChange,
    activity,
    sessionsAttended: counted.length,
    a1cReductionPoints: a1c.points,
    a1cDetail: a1c.detail,
  });
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
    eligibility: evaluateEligibility(standard, participant, counted),
    completer: evaluateCompleter(standard, start, counted),
    weightChange,
    activity,
    outcomes,
    riskReduced: outcomes.some((outcome) => outcome.met),
    retainedAtProgramMonth,
    issues: validateParticipantRecord(standard, participant, cohort, sessions, resolveDataElement(SUBMISSION_COLUMN.WEIGHT)),
  };
}
