import { RULE_CHECK_KIND, RULE_SCOPE } from '@penji-demos/constants';
import { evaluateCondition } from '@penji-demos/form-engine';
import {
  Answers,
  CanonicalFormId,
  ComplianceStandardDefinition,
  CrossFieldRule,
  FieldDefinition,
  FormDefinition,
  ResolvedFieldConstraint,
  RuleDefinition,
} from '@penji-demos/types';
import { isStandardApplicable } from './evaluate-rules';

const SCOPE_BY_FORM: Readonly<Record<CanonicalFormId, RuleDefinition['scope']>> = {
  enrollment: RULE_SCOPE.ENROLLMENT,
  session: RULE_SCOPE.SESSION,
};

// Every field constraint the active standards put on one canonical form.
// Ranges merge to the most restrictive; a field is required if any standard
// requires it.  Each constraint keeps the standard, rule and citation behind it.
export function resolveFieldConstraints(
  form: FormDefinition & { readonly id: string },
  formId: CanonicalFormId,
  standards: readonly ComplianceStandardDefinition[],
  facts: Answers,
): readonly ResolvedFieldConstraint[] {
  const constraints = new Map<string, ResolvedFieldConstraint>();
  const fieldKeys = new Set(form.fields.map((field) => field.key));

  for (const standard of standards) {
    if (!isStandardApplicable(standard, facts)) continue;
    for (const rule of standard.rules) {
      if (rule.scope !== SCOPE_BY_FORM[formId] || (rule.appliesWhen && !evaluateCondition(rule.appliesWhen, facts))) continue;
      const { check } = rule;
      if (check.kind !== RULE_CHECK_KIND.RANGE && check.kind !== RULE_CHECK_KIND.REQUIRED && check.kind !== RULE_CHECK_KIND.REQUIRED_WHEN) continue;
      if (!fieldKeys.has(check.field)) continue;

      const current = constraints.get(check.field) ?? { form: formId, field: check.field, required: false, requiredWhen: [], min: null, max: null, sources: [] };
      const source = {
        standardShortName: standard.shortName,
        ruleId: rule.id,
        citation: rule.citation,
        text:
          check.kind === RULE_CHECK_KIND.RANGE ? `${check.min}-${check.max} ${check.unit}`
          : check.kind === RULE_CHECK_KIND.REQUIRED ? 'Required'
          : 'Required with its related answer',
      };
      constraints.set(check.field, {
        ...current,
        required: current.required || check.kind === RULE_CHECK_KIND.REQUIRED,
        requiredWhen: check.kind === RULE_CHECK_KIND.REQUIRED_WHEN ? [...current.requiredWhen, check.when] : current.requiredWhen,
        min: check.kind === RULE_CHECK_KIND.RANGE ? Math.max(current.min ?? check.min, check.min) : current.min,
        max: check.kind === RULE_CHECK_KIND.RANGE ? Math.min(current.max ?? check.max, check.max) : current.max,
        sources: [...current.sources, source],
      });
    }
  }
  return form.fields.flatMap((field) => {
    const constraint = constraints.get(field.key);
    return constraint ? [constraint] : [];
  });
}

// The canonical form with the merged constraints applied: limits on number
// fields, required flags, and a rule for each conditional requirement.
export function resolveConstrainedForm(form: FormDefinition, constraints: readonly ResolvedFieldConstraint[]): FormDefinition {
  const byField = new Map(constraints.map((constraint) => [constraint.field, constraint]));
  const fields = form.fields.map((field): FieldDefinition => {
    const constraint = byField.get(field.key);
    if (!constraint || field.kind === 'calculated') return field;
    const required = field.required === true || constraint.required;
    if (field.kind === 'number') {
      return { ...field, required, ...(constraint.min !== null ? { min: constraint.min } : {}), ...(constraint.max !== null ? { max: constraint.max } : {}) };
    }
    return { ...field, required };
  });
  const rules: CrossFieldRule[] = constraints.flatMap((constraint) =>
    constraint.requiredWhen.map((when, index) => ({
      id: `${constraint.field}-required-when-${index}`,
      check: { kind: 'requiredWhen' as const, field: constraint.field, when },
      reportOn: constraint.field,
      message: 'Please answer this question.',
    })),
  );
  return { ...form, fields, rules: [...form.rules, ...rules] };
}
