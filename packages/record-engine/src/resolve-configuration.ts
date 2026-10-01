import { PLATFORM_FACT } from '@penji-demos/constants';
import {
  DefinitionId,
  EntityDefinition,
  FieldDefinition,
  FormDefinition,
  PlatformConfiguration,
  StreamDefinition,
  ValueOf,
  WorkflowDefinition,
} from '@penji-demos/types';

// Lookups into a configuration bundle.  A reference that does not resolve is
// a configuration error, which validateConfiguration reports before anything runs.

export const PLATFORM_FACT_LABELS: Readonly<Record<ValueOf<typeof PLATFORM_FACT>, string>> = {
  [PLATFORM_FACT.AS_OF_DATE]: 'As of',
  [PLATFORM_FACT.ACTOR_ID]: 'You',
  [PLATFORM_FACT.ENTRY_DATE]: 'Date',
  [PLATFORM_FACT.ENTRY_STATUS]: 'Status',
  [PLATFORM_FACT.ENTRY_AUTHOR]: 'Added by',
};

export const resolveForm = (configuration: PlatformConfiguration, formId: DefinitionId): FormDefinition | null =>
  configuration.forms.find((form) => form.id === formId) ?? null;

export const resolveWorkflow = (configuration: PlatformConfiguration, workflowId: DefinitionId | null): WorkflowDefinition | null =>
  workflowId === null ? null : (configuration.workflows.find((workflow) => workflow.id === workflowId) ?? null);

export const resolveEntityDefinition = (configuration: PlatformConfiguration, kind: DefinitionId): EntityDefinition | null =>
  configuration.entities.find((entity) => entity.id === kind) ?? null;

export const resolveStreamDefinition = (configuration: PlatformConfiguration, streamId: string): StreamDefinition | null =>
  configuration.entities.flatMap((entity) => entity.streams).find((stream) => stream.id === streamId) ?? null;

export const resolveEntityStandards = (configuration: PlatformConfiguration, entity: EntityDefinition) =>
  configuration.standards.filter((standard) => entity.standardIds.includes(standard.id));

// Every field of every form in the bundle, so a value can be shown the way its form presents it.
export const resolveFieldDefinitions = (configuration: PlatformConfiguration): readonly FieldDefinition[] => configuration.forms.flatMap((form) => form.fields);

// A label for every key a condition or rule can read: form fields, worked-out facts and the platform's own facts.
export function resolveFieldLabels(configuration: PlatformConfiguration): Readonly<Record<string, string>> {
  const facts = configuration.entities.flatMap((entity) => [...entity.facts, ...entity.streams.flatMap((stream) => stream.facts)]);
  return {
    ...PLATFORM_FACT_LABELS,
    ...Object.fromEntries(facts.map((fact) => [fact.key, fact.label])),
    ...Object.fromEntries(resolveFieldDefinitions(configuration).map((field) => [field.key, field.label])),
  };
}
