import { PROGRAM_PHASE } from '@penji-demos/constants';
import { calculateFullMonthsBetween } from '@penji-demos/time';
import { Determination, PlainDate } from '@penji-demos/types';
import { RecognitionStandardDefinition } from '@penji-demos/dprp-standard';
import { ProgramSession } from '../recognition-evaluation';

// A completer attended enough Core-phase sessions and stayed long enough.
export function evaluateCompleter(
  standard: RecognitionStandardDefinition,
  cohortStart: PlainDate,
  counted: readonly ProgramSession[],
): Determination & { readonly corePhaseSessions: number; readonly fullMonthsFirstToLast: number } {
  const { minimumCorePhaseSessions, minimumFullMonthsFirstSessionToLast } = standard.completer;
  const corePhaseSessions = counted.filter((session) => session.phase === PROGRAM_PHASE.CORE).length;
  const last = counted[counted.length - 1];
  const fullMonthsFirstToLast = last ? calculateFullMonthsBetween(cohortStart, last.sessionDate) : 0;
  const findings = [
    {
      criterion: `At least ${minimumCorePhaseSessions} sessions in months 1-${standard.program.corePhaseMonths}`,
      met: corePhaseSessions >= minimumCorePhaseSessions,
      detail: `${corePhaseSessions} attended`,
    },
    {
      criterion: `At least ${minimumFullMonthsFirstSessionToLast} full months from the cohort's first session to the last session attended`,
      met: fullMonthsFirstToLast >= minimumFullMonthsFirstSessionToLast,
      detail: last ? `${fullMonthsFirstToLast} full months, ${cohortStart} to ${last.sessionDate}` : 'No sessions attended',
    },
  ];
  return { met: findings.every((finding) => finding.met), findings, corePhaseSessions, fullMonthsFirstToLast };
}
