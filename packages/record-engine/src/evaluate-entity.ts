import { describeAnswer } from '@penji-demos/form-engine';
import { evaluateStandard, resolveGuidanceItem } from '@penji-demos/compliance-engine';
import { EntityRecord, GuidanceItem, GuidanceResolution, PlainDate, PlatformConfiguration, PlatformData, StandardEvaluation } from '@penji-demos/types';
import { resolveEntityDefinition, resolveEntityStandards, resolveFieldDefinitions, resolveFieldLabels } from './resolve-configuration';
import { resolveSubject } from './resolve-subject';

// Every standard the entity's definition names, evaluated on its records as of a date.
export function evaluateEntity(configuration: PlatformConfiguration, data: PlatformData, entity: EntityRecord, asOf: PlainDate): readonly StandardEvaluation[] {
  const definition = resolveEntityDefinition(configuration, entity.kind);
  if (!definition) return [];
  const subject = resolveSubject(configuration, data, entity, asOf);
  const labels = resolveFieldLabels(configuration);
  const fields = resolveFieldDefinitions(configuration);
  return resolveEntityStandards(configuration, definition).map((standard) => evaluateStandard(standard, subject, labels, fields));
}

// Every finding as a guidance item, with any resolution recorded for it.
export function resolveGuidance(configuration: PlatformConfiguration, evaluations: readonly StandardEvaluation[], entity: EntityRecord, resolutions: ReadonlyMap<string, GuidanceResolution>): readonly GuidanceItem[] {
  return evaluations.flatMap((evaluation) => {
    const standard = configuration.standards.find((candidate) => candidate.shortName === evaluation.standardShortName);
    return evaluation.findings.flatMap((finding) => {
      const rule = standard?.rules.find((candidate) => candidate.id === finding.ruleId);
      return rule ? [resolveGuidanceItem(entity.entityId, rule, finding, resolutions)] : [];
    });
  });
}

// A record's value shown the way its form presents it.
export function describeRecordValue(configuration: PlatformConfiguration, key: string, value: Parameters<typeof describeAnswer>[1]): string {
  return describeAnswer(resolveFieldDefinitions(configuration).find((field) => field.key === key), value);
}
