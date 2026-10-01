import { PROGRAM_PHASE } from '@penji-demos/constants';
import { calculateDaysBetween, resolveProgramMonth } from '@penji-demos/time';
import { PlainDate, ProgramSession, SessionRecord, RecognitionStandardDefinition } from '@penji-demos/types';

// Places each session on its cohort's program calendar: its program month and
// phase.  Sessions are returned in date order.
export function resolveProgramSessions(standard: RecognitionStandardDefinition, cohortStart: PlainDate, sessions: readonly SessionRecord[]): readonly ProgramSession[] {
  return [...sessions]
    .sort((a, b) => (a.sessionDate < b.sessionDate ? -1 : a.sessionDate > b.sessionDate ? 1 : Number(a.isMakeUp) - Number(b.isMakeUp)))
    .map((session) => {
      const programMonth = resolveProgramMonth(cohortStart, session.sessionDate);
      const day = calculateDaysBetween(cohortStart, session.sessionDate);
      const phase =
        day >= standard.program.durationDays ? PROGRAM_PHASE.AFTER_PROGRAM_YEAR
        : programMonth <= standard.program.corePhaseMonths ? PROGRAM_PHASE.CORE
        : PROGRAM_PHASE.CORE_MAINTENANCE;
      return { ...session, programMonth, phase };
    });
}

// The sessions every calculation uses: on or after the cohort's first session and within the program year.
export function resolveCountedSessions(sessions: readonly ProgramSession[]): readonly ProgramSession[] {
  return sessions.filter((session) => session.programMonth >= 1 && session.phase !== PROGRAM_PHASE.AFTER_PROGRAM_YEAR);
}
