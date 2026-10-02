import { evaluateEligibility } from '@penji-demos/compliance-engine';
import { COHORT_FIELD, PARTICIPANT_FIELD } from '@penji-demos/constants';
import { evaluateEntity, readText, resolveEntityFacts, resolveFieldDefinitions, resolveFieldLabels } from '@penji-demos/record-engine';
import { isOnOrAfter, resolveProgramMonthStart } from '@penji-demos/time';
import { PlainDate, PlatformConfiguration, PlatformData } from '@penji-demos/types';
import { RecognitionStandardDefinition } from '@penji-demos/dprp-standard';
import { ParticipantEvaluation } from '../recognition-evaluation';
import { calculateActivity, calculateWeightChange } from './calculate-measures';
import { evaluateCompleter } from './evaluate-completer';
import { calculateA1cReduction, evaluateOutcomes } from './evaluate-outcomes';
import { ProgramParticipant, resolveCountedSessions, resolveFinalA1c, resolveParticipantSessions } from './resolve-program-sessions';

// Everything the recognition standard says about one participant, with the
// evidence for each part, plus what every standard the configuration holds
// the participant to makes of them.  `asOf` is the date the records are read on.
export function evaluateParticipant(
  standard: RecognitionStandardDefinition,
  configuration: PlatformConfiguration,
  data: PlatformData,
  subject: ProgramParticipant,
  asOf: PlainDate,
): ParticipantEvaluation {
  const { participant, cohort, cohortStart: start } = subject;
  const facts = resolveEntityFacts(configuration, data, participant, asOf);
  const sessions = resolveParticipantSessions(standard, data, subject);
  const counted = resolveCountedSessions(sessions);
  const weightChange = calculateWeightChange(counted);
  const activity = calculateActivity(counted);
  const a1c = calculateA1cReduction(standard, participant.values, resolveFinalA1c(data, participant), start, counted);
  const outcomes = evaluateOutcomes(standard, { weightChange, activity, sessionsAttended: counted.length, a1cReductionPoints: a1c.points, a1cDetail: a1c.detail });
  const retainedAtProgramMonth = Object.fromEntries(
    standard.retentionCheckpoints.map(({ programMonth }) => {
      const checkpoint = resolveProgramMonthStart(start, programMonth);
      return [programMonth, counted.some((session) => isOnOrAfter(session.sessionDate, checkpoint))];
    }),
  );
  return {
    participantId: participant.entityId,
    participantCode: readText(participant.values, PARTICIPANT_FIELD.CODE) ?? participant.entityId,
    cohortId: cohort.entityId,
    cohortCode: readText(cohort.values, COHORT_FIELD.CODE) ?? cohort.entityId,
    sessions,
    sessionsAttended: counted.length,
    standards: evaluateEntity(configuration, data, participant, asOf),
    eligibility: evaluateEligibility(standard.eligibility, facts, resolveFieldLabels(configuration), resolveFieldDefinitions(configuration)),
    completer: evaluateCompleter(standard, start, counted),
    weightChange,
    activity,
    outcomes,
    riskReduced: outcomes.some((outcome) => outcome.met),
    retainedAtProgramMonth,
  };
}
