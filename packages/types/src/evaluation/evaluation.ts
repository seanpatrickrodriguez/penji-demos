import { REQUIREMENT_OUTCOME } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { RequirementDefinition } from '../definitions/requirement-definition';
import { RuleFinding } from '../definitions/compliance-definition';

export type RequirementOutcome = ValueOf<typeof REQUIREMENT_OUTCOME>;

// One criterion checked, whether it held, and what it was checked against.
export interface Finding {
  readonly criterion: string;
  readonly met: boolean;
  readonly detail: string;
}

// A determination always carries its evidence, so a reviewer sees why.
export interface Determination {
  readonly met: boolean;
  readonly findings: readonly Finding[];
}

// Eligibility under one standard: the criteria checked and the bases that held.
export interface EligibilityDetermination extends Determination {
  readonly basesMet: readonly string[];
}

// What one standard makes of one subject.
export interface StandardEvaluation {
  readonly standardShortName: string;
  readonly applies: boolean;
  // Null when the standard only checks records.
  readonly eligibility: EligibilityDetermination | null;
  readonly findings: readonly RuleFinding[];
}

// A metric's value, with the counts behind a share so the page can show them.
export interface MetricValue {
  readonly value: number | null;
  readonly numerator: number | null;
  readonly denominator: number | null;
}

export interface RequirementResult {
  readonly requirement: RequirementDefinition;
  readonly measured: MetricValue;
  readonly outcome: RequirementOutcome;
}
