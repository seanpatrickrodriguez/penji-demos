import { resolveConditionFields } from './evaluate-condition';
import { FieldKey, FormDefinition } from './types';

// The definition is checked too.  A typo in a field key would otherwise fail
// silently: a question that never shows, or a rule that never runs.
export function validateDefinition(definition: FormDefinition): readonly string[] {
  const problems: string[] = [];
  const position = new Map<FieldKey, number>();

  definition.fields.forEach((field, index) => {
    if (position.has(field.key)) problems.push(`Field "${field.key}" is defined twice.`);
    position.set(field.key, index);
  });

  const requireField = (key: FieldKey, where: string) => {
    if (!position.has(key)) problems.push(`${where} refers to "${key}", which is not a field.`);
  };

  definition.fields.forEach((field, index) => {
    if (field.showWhen) {
      for (const key of resolveConditionFields(field.showWhen)) {
        requireField(key, `The condition on "${field.key}"`);
        const source = position.get(key);
        if (source !== undefined && source >= index) problems.push(`"${field.key}" depends on "${key}", which comes after it.`);
      }
    }
    for (const [, key] of field.label.matchAll(/\{\{(\w+)/g)) if (key) requireField(key, `The label of "${field.key}"`);
    if (field.kind === 'choice' && field.options.length === 0) problems.push(`"${field.key}" has no options.`);
    if (field.kind === 'calculated') {
      const inputs = field.calculation.kind === 'product' ? field.calculation.fields : [field.calculation.from, field.calculation.to];
      for (const key of inputs) requireField(key, `The calculation for "${field.key}"`);
    }
  });

  for (const rule of definition.rules) {
    requireField(rule.reportOn, `Rule "${rule.id}"`);
    const { check } = rule;
    const keys =
      check.kind === 'dateOnOrAfter' ? [check.earlier, check.later]
      : check.kind === 'atMost' ? [check.field, check.limit]
      : [check.field, ...resolveConditionFields(check.when)];
    for (const key of keys) requireField(key, `Rule "${rule.id}"`);
  }
  return problems;
}
