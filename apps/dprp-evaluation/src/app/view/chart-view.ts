import { PROGRAM_PHASE } from '@penji-demos/constants';
import { calculateDaysBetween, resolveProgramMonthStart } from '@penji-demos/time';
import { ParticipantEvaluation, PlainDate, RecognitionStandardDefinition } from '@penji-demos/types';

// Geometry for a participant's weight over the program year, in SVG units.

export const CHART = { width: 720, height: 240, left: 48, right: 16, top: 28, bottom: 36 } as const;

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly makeUp: boolean;
  readonly counted: boolean;
  readonly label: string;
}

export interface ChartMarker {
  readonly x: number;
  readonly label: string;
}

export interface WeightChart {
  readonly points: readonly ChartPoint[];
  readonly path: string;
  readonly coreEndX: number;
  readonly yearEndX: number;
  readonly markers: readonly ChartMarker[];
  readonly yTicks: readonly { readonly y: number; readonly label: string }[];
  readonly xTicks: readonly ChartMarker[];
  readonly summary: string;
}

export function resolveWeightChart(standard: RecognitionStandardDefinition, evaluation: ParticipantEvaluation, cohortStart: PlainDate): WeightChart {
  const lastDay = Math.max(standard.program.durationDays + 30, ...evaluation.sessions.map((session) => calculateDaysBetween(cohortStart, session.sessionDate)));
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const x = (day: number) => CHART.left + (Math.max(day, 0) / lastDay) * plotWidth;

  const weighed = evaluation.sessions.filter((session) => session.weightPounds !== null);
  const weights = weighed.map((session) => session.weightPounds ?? 0);
  const plausible = weights.filter((weight) => weight < 700);
  // Axis bounds on a whole number of steps, so every tick is a round number of pounds.
  const spread = Math.max(...plausible, 0) - Math.min(...plausible, 999);
  const tickStep = spread > 40 ? 10 : 5;
  const low = Math.floor((Math.min(...plausible, 999) - 3) / tickStep) * tickStep;
  const high = Math.max(Math.ceil((Math.max(...plausible, 0) + 3) / tickStep) * tickStep, low + tickStep * 2);
  const y = (weight: number) => CHART.top + (1 - (Math.min(weight, high) - low) / Math.max(high - low, 1)) * plotHeight;

  const points = weighed.map((session) => ({
    x: x(calculateDaysBetween(cohortStart, session.sessionDate)),
    y: y(session.weightPounds ?? low),
    makeUp: session.isMakeUp,
    counted: session.phase !== PROGRAM_PHASE.AFTER_PROGRAM_YEAR,
    label: `${session.sessionDate}: ${session.weightPounds} lb`,
  }));
  const dayOf = (month: number) => calculateDaysBetween(cohortStart, resolveProgramMonthStart(cohortStart, month));

  return {
    points,
    path: points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
    coreEndX: x(dayOf(standard.program.corePhaseMonths + 1)),
    yearEndX: x(standard.program.durationDays),
    markers: [
      ...standard.retentionCheckpoints.map((checkpoint) => ({ x: x(dayOf(checkpoint.programMonth)), label: `Month ${checkpoint.programMonth}` })),
    ],
    yTicks: Array.from({ length: (high - low) / tickStep + 1 }, (_, index) => low + index * tickStep).map((weight) => ({ y: y(weight), label: String(weight) })),
    xTicks: [1, 4, 7, 10, 13].map((month) => ({ x: x(dayOf(month)), label: month === 13 ? 'Year end' : `Month ${month}` })),
    summary: evaluation.weightChange
      ? `Weight went from ${evaluation.weightChange.firstPounds} lb to ${evaluation.weightChange.lastPounds} lb over ${weighed.length} weighed sessions, a ${evaluation.weightChange.lossPercent.toFixed(1)}% change.`
      : `${weighed.length} weighed session${weighed.length === 1 ? '' : 's'}; not enough to measure a change.`,
  };
}
