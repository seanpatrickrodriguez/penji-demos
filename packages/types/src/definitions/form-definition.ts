import { DEFINITION_KIND } from '@penji-demos/constants';
import { Definition } from './definition';

// M2: a form is data.  A definition lists its fields, when each one shows,
// what makes an answer valid and which answers must agree with each other.
// The form engine reads a FormDefinition; nothing about a particular form lives in code.

export type FieldKey = string;

export type AnswerValue = string | number | boolean | null;

export type Answers = Readonly<Record<FieldKey, AnswerValue>>;

// One condition language for the whole platform: it decides when a form
// question shows, when a rule applies, and whether an eligibility criterion holds.
export type Condition =
  | { readonly kind: 'equals'; readonly field: FieldKey; readonly value: AnswerValue }
  | { readonly kind: 'oneOf'; readonly field: FieldKey; readonly values: readonly AnswerValue[] }
  | { readonly kind: 'answered'; readonly field: FieldKey }
  // Two fields hold the same value, such as the actor and the person who created a record.
  | { readonly kind: 'sameAs'; readonly field: FieldKey; readonly other: FieldKey }
  | { readonly kind: 'atLeast'; readonly field: FieldKey; readonly value: number }
  | { readonly kind: 'between'; readonly field: FieldKey; readonly min: number; readonly max: number }
  // A date no more than `days` before another date, and not after it.
  | { readonly kind: 'withinDaysBefore'; readonly field: FieldKey; readonly anchor: FieldKey; readonly days: number }
  // A date on or after another date, and no more than `days` after it.
  | { readonly kind: 'withinDaysAfter'; readonly field: FieldKey; readonly anchor: FieldKey; readonly days: number }
  | { readonly kind: 'not'; readonly condition: Condition }
  | { readonly kind: 'all'; readonly conditions: readonly Condition[] }
  | { readonly kind: 'any'; readonly conditions: readonly Condition[] };

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
}

interface FieldBase {
  readonly key: FieldKey;
  // Labels may pipe in earlier answers: "When does {{firstName}} arrive?"
  readonly label: string;
  readonly help?: string;
  readonly required?: boolean;
  readonly showWhen?: Condition;
}

export interface TextField extends FieldBase {
  readonly kind: 'text';
  readonly inputType?: 'text' | 'email';
  readonly maxLength?: number;
}

export interface NumberField extends FieldBase {
  readonly kind: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly wholeNumber?: boolean;
}

export interface DateField extends FieldBase {
  readonly kind: 'date';
}

export interface ChoiceField extends FieldBase {
  readonly kind: 'choice';
  readonly options: readonly ChoiceOption[];
}

export interface YesNoField extends FieldBase {
  readonly kind: 'yesNo';
}

// A calculated field is never typed in; the engine works it out from other answers.
export type Calculation =
  | { readonly kind: 'product'; readonly fields: readonly FieldKey[]; readonly factor?: number }
  | { readonly kind: 'daysBetween'; readonly from: FieldKey; readonly to: FieldKey };

export interface CalculatedField extends Omit<FieldBase, 'required'> {
  readonly kind: 'calculated';
  readonly calculation: Calculation;
  readonly format: 'number' | 'currency';
}

export type FieldDefinition =
  | TextField
  | NumberField
  | DateField
  | ChoiceField
  | YesNoField
  | CalculatedField;

// Rules that compare answers across fields.  The message is shown on the field named in `reportOn`.
export type CrossFieldCheck =
  | { readonly kind: 'dateOnOrAfter'; readonly earlier: FieldKey; readonly later: FieldKey }
  | { readonly kind: 'atMost'; readonly field: FieldKey; readonly limit: FieldKey }
  | { readonly kind: 'requiredWhen'; readonly field: FieldKey; readonly when: Condition };

export interface CrossFieldRule {
  readonly id: string;
  readonly check: CrossFieldCheck;
  readonly reportOn: FieldKey;
  readonly message: string;
}

export interface FormDefinition extends Definition<typeof DEFINITION_KIND.FORM> {
  readonly description: string;
  readonly fields: readonly FieldDefinition[];
  readonly rules: readonly CrossFieldRule[];
}

export type FieldErrors = Readonly<Record<FieldKey, readonly string[]>>;
