import { DEFINITION_KIND } from '@penji-demos/constants';
import { Definition } from './definition';

// M2: a form is data.  A definition lists its fields, when each one shows,
// what makes an answer valid and which answers must agree with each other.
// The form engine reads a FormDefinition; nothing about a particular form lives in code.

export type FieldKey = string;

export type AnswerValue = string | number | boolean | null;

export type Answers = Readonly<Record<FieldKey, AnswerValue>>;

export type Condition =
  | { readonly kind: 'equals'; readonly field: FieldKey; readonly value: AnswerValue }
  | { readonly kind: 'oneOf'; readonly field: FieldKey; readonly values: readonly AnswerValue[] }
  | { readonly kind: 'answered'; readonly field: FieldKey }
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
