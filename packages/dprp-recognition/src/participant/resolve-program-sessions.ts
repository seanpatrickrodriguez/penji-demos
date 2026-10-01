import { A1C_RESULT_FIELD, COHORT_FIELD, DELIVERY_MODE, PROGRAM_ENTITY, PROGRAM_PHASE, PROGRAM_STREAM, SESSION_FIELD } from '@penji-demos/constants';
import { readBoolean, readDate, readMember, readNumber, resolveStreamEntries } from '@penji-demos/record-engine';
import { calculateDaysBetween, resolveProgramMonth } from '@penji-demos/time';
import { A1cResult, EntityRecord, PlainDate, PlatformData, ProgramSession, RecognitionStandardDefinition, StreamEntry } from '@penji-demos/types';

// The program's records read the way the recognition standard counts them.
// Each reads a stream entry or an entity by the canonical field names; none
// of it holds a record of its own.

// A participant, their cohort, and the date the cohort began.
export interface ProgramParticipant {
  readonly participant: EntityRecord;
  readonly cohort: EntityRecord;
  readonly cohortStart: PlainDate;
}

// Every participant whose cohort is on record with a start date, in the order the records hold them.
export function resolveProgramParticipants(data: PlatformData): readonly ProgramParticipant[] {
  return data.entities.flatMap((participant) => {
    if (participant.kind !== PROGRAM_ENTITY.PARTICIPANT) return [];
    const cohort = data.entities.find((candidate) => candidate.entityId === participant.parentId);
    const cohortStart = cohort ? readDate(cohort.values, COHORT_FIELD.START_DATE) : null;
    return cohort && cohortStart ? [{ participant, cohort, cohortStart }] : [];
  });
}

// Places each session on its cohort's program calendar: its program month and
// phase.  Sessions are returned in date order, a regular session before a make-up on the same date.
export function resolveProgramSessions(standard: RecognitionStandardDefinition, cohortStart: PlainDate, entries: readonly StreamEntry[]): readonly ProgramSession[] {
  return entries
    .map((entry) => ({
      entryId: entry.entryId,
      sessionDate: entry.date,
      isMakeUp: readBoolean(entry.values, SESSION_FIELD.IS_MAKE_UP) ?? false,
      deliveryMode: readMember(entry.values, SESSION_FIELD.DELIVERY_MODE, DELIVERY_MODE),
      weightPounds: readBoolean(entry.values, SESSION_FIELD.WEIGHT_REPORTED) === false ? null : readNumber(entry.values, SESSION_FIELD.WEIGHT_POUNDS),
      activityMinutes: readNumber(entry.values, SESSION_FIELD.ACTIVITY_MINUTES) ?? 0,
    }))
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

// A participant's sessions, on their cohort's calendar.
export const resolveParticipantSessions = (standard: RecognitionStandardDefinition, data: PlatformData, subject: ProgramParticipant): readonly ProgramSession[] =>
  resolveProgramSessions(standard, subject.cohortStart, resolveStreamEntries(data, subject.participant, PROGRAM_STREAM.SESSION));

// The sessions every calculation uses: on or after the cohort's first session and within the program year.
export function resolveCountedSessions(sessions: readonly ProgramSession[]): readonly ProgramSession[] {
  return sessions.filter((session) => session.programMonth >= 1 && session.phase !== PROGRAM_PHASE.AFTER_PROGRAM_YEAR);
}

// The latest A1C result reported after enrollment, if any.
export function resolveFinalA1c(data: PlatformData, participant: EntityRecord): A1cResult | null {
  const latest = resolveStreamEntries(data, participant, PROGRAM_STREAM.A1C_RESULT).at(-1);
  if (!latest) return null;
  const percent = readNumber(latest.values, A1C_RESULT_FIELD.PERCENT);
  const testDate = readDate(latest.values, A1C_RESULT_FIELD.TEST_DATE);
  return percent !== null && testDate !== null ? { percent, testDate, reportedDate: latest.date } : null;
}
