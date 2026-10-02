import { COMPARATOR, RECOGNITION_STATUS, REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { MetricValue, RequirementDefinition, RequirementOutcome } from '@penji-demos/types';
import { RecognitionStatus } from '@penji-demos/dprp-standard';

export const STATUS_LABEL: Readonly<Record<RecognitionStatus, string>> = {
  [RECOGNITION_STATUS.PENDING]: 'Pending',
  [RECOGNITION_STATUS.PRELIMINARY]: 'Preliminary',
  [RECOGNITION_STATUS.FULL]: 'Full',
  [RECOGNITION_STATUS.FULL_PLUS]: 'Full Plus',
};

export const OUTCOME_LABEL: Readonly<Record<RequirementOutcome, string>> = {
  [REQUIREMENT_OUTCOME.MET]: 'Met',
  [REQUIREMENT_OUTCOME.NOT_MET]: 'Not met',
  [REQUIREMENT_OUTCOME.UNMEASURED]: 'No data',
  [REQUIREMENT_OUTCOME.NOT_EVALUATED]: 'Not calculated',
};

export const formatPercent = (share: number): string => `${Math.round(share * 100)}%`;

export function formatMeasured(requirement: RequirementDefinition, measured: MetricValue): string {
  if (measured.value === null) return measured.denominator === 0 ? 'None to count' : 'No data';
  if (requirement.unit === 'count') return String(measured.value);
  return measured.numerator !== null && measured.denominator !== null ? `${formatPercent(measured.value)} (${measured.numerator} of ${measured.denominator})` : formatPercent(measured.value);
}

export const formatThreshold = (requirement: RequirementDefinition): string =>
  `${requirement.comparator === COMPARATOR.AT_LEAST ? 'At least' : 'At most'} ${requirement.unit === 'share' ? formatPercent(requirement.threshold) : requirement.threshold}`;
