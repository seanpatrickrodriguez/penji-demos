import { DEFINITION_KIND, GUIDANCE_ACTION_TYPE, RULE_CHECK_KIND, RULE_SCOPE, VALIDATION_SEVERITY } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { PlainDate } from '../primitives/plain-date';
import { Definition, SourceReference } from './definition';
import { Condition, FieldKey } from './form-definition';

export type ValidationSeverity = ValueOf<typeof VALIDATION_SEVERITY>;
export type GuidanceActionType = ValueOf<typeof GUIDANCE_ACTION_TYPE>;
export type RuleScope = ValueOf<typeof RULE_SCOPE>;

// M2: what a rule checks.  Each kind carries its own parameters; a rule never holds code.
export type RuleCheck =
  | { readonly kind: typeof RULE_CHECK_KIND.RANGE; readonly field: FieldKey; readonly min: number; readonly max: number; readonly unit: string }
  | { readonly kind: typeof RULE_CHECK_KIND.REQUIRED; readonly field: FieldKey }
  | { readonly kind: typeof RULE_CHECK_KIND.REQUIRED_WHEN; readonly field: FieldKey; readonly when: Condition }
  | { readonly kind: typeof RULE_CHECK_KIND.CONDITION; readonly condition: Condition; readonly describes: readonly FieldKey[] }
  | { readonly kind: typeof RULE_CHECK_KIND.SAME_DATE_VALUES_MATCH; readonly field: FieldKey }
  | { readonly kind: typeof RULE_CHECK_KIND.AT_MOST_PER_WINDOW; readonly counts: Condition; readonly max: number; readonly windowDays: number }
  // A participant date no more than `days` after an anchor date, both read from the participant's facts.
  | { readonly kind: typeof RULE_CHECK_KIND.WITHIN_DAYS_OF_ANCHOR; readonly field: FieldKey; readonly anchor: FieldKey; readonly days: number }
  // Each session dated on or after an anchor date from the participant's facts.
  | { readonly kind: typeof RULE_CHECK_KIND.NOT_BEFORE_ANCHOR; readonly anchor: FieldKey }
  | { readonly kind: typeof RULE_CHECK_KIND.CHANGE_AT_MOST; readonly field: FieldKey; readonly percent: number };

// Where "Fix this" takes a person: a field on a form, named by the form definition's ID.
export interface FixTarget {
  readonly form: string;
  readonly field: FieldKey;
}

// M2: one rule of a standard.  It says what is checked and on what, how
// serious a failure is, what the issue says, how to fix it and where.
export interface RuleDefinition {
  readonly id: string;
  readonly title: string;
  readonly citation: SourceReference;
  readonly scope: RuleScope;
  readonly check: RuleCheck;
  // The rule applies only when this holds for the subject; null means always.
  readonly appliesWhen: Condition | null;
  readonly severity: ValidationSeverity;
  // True when an open finding blocks the record from being submitted.
  readonly blocks: boolean;
  // True when a person may accept the record as it is, with a reason.
  readonly bypassable: boolean;
  // Placeholders in braces are filled from the finding: {value}, {min}, {max}, {unit}, {expected}.
  readonly issue: string;
  readonly guidance: string;
  readonly fixTarget: FixTarget | null;
}

// M2: one condition a subject must meet, with the facts shown as evidence.
export interface CriterionDefinition {
  readonly id: string;
  readonly label: string;
  readonly citation: SourceReference;
  readonly condition: Condition;
  readonly describes: readonly FieldKey[];
}

// M2: who a standard accepts.  Every criterion must hold, and at least one basis.
export interface EligibilityRulesDefinition {
  readonly criteria: readonly CriterionDefinition[];
  readonly basesLabel: string;
  readonly bases: readonly CriterionDefinition[];
}

// An ambiguous clause of the source text and how this definition reads it.
export interface Interpretation {
  readonly clause: string;
  readonly reading: string;
}

// M2: a compliance standard.  It applies to the subjects its condition
// selects, judges their eligibility where it admits subjects, and checks their
// records.  It reaches the forms only through its rules.
export interface ComplianceStandardDefinition extends Definition<typeof DEFINITION_KIND.STANDARD> {
  readonly shortName: string;
  readonly appliesWhen: Condition | null;
  // Who the standard accepts; null for a standard that only checks records.
  readonly eligibility: EligibilityRulesDefinition | null;
  readonly rules: readonly RuleDefinition[];
  readonly interpretations: readonly Interpretation[];
}

// What a rule found on one record.
export interface RuleFinding {
  readonly ruleId: string;
  readonly standardShortName: string;
  // The event the finding is about, or null for the subject's own record or its history.
  readonly eventId: string | null;
  readonly eventDate: PlainDate | null;
  readonly message: string;
  readonly expected: string | null;
  readonly actual: string | null;
}

export interface GuidanceAction {
  readonly actionType: GuidanceActionType;
  readonly label: string;
  readonly primary: boolean;
}

// What a person did about a guidance item, kept as an audit record.
export interface GuidanceResolution {
  readonly guidanceId: string;
  readonly action: GuidanceActionType;
  readonly resolvedBy: string;
  readonly resolvedAt: string;
  readonly note: string;
}

// M2: a finding as a person sees it: what is wrong, why it matters, how to
// fix it, where, what they can do now, and what they did.
export interface GuidanceItem {
  readonly id: string;
  readonly rule: RuleDefinition;
  readonly finding: RuleFinding;
  readonly target: (FixTarget & { readonly eventId: string | null; readonly eventDate: PlainDate | null }) | null;
  readonly requiresAction: boolean;
  readonly availableActions: readonly GuidanceAction[];
  readonly resolution: GuidanceResolution | null;
}

// The constraints every active standard puts on one canonical form field,
// merged, with the standard and citation behind each.
export interface FieldConstraintSource {
  readonly standardShortName: string;
  readonly ruleId: string;
  readonly citation: SourceReference;
  readonly text: string;
}

export interface ResolvedFieldConstraint {
  readonly form: string;
  readonly field: FieldKey;
  readonly required: boolean;
  readonly requiredWhen: readonly Condition[];
  readonly min: number | null;
  readonly max: number | null;
  readonly sources: readonly FieldConstraintSource[];
}
