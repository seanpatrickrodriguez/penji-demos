import { ComplianceSubject } from '@penji-demos/compliance-engine';
import { FACT_DERIVATION_KIND, PLATFORM_FACT } from '@penji-demos/constants';
import { calculateField, evaluateCondition } from '@penji-demos/form-engine';
import { isOnOrAfter } from '@penji-demos/time';
import { isPermitted } from '@penji-demos/workflow-engine';
import { Answers, EntityRecord, FactDefinition, FormDefinition, PlainDate, PlatformConfiguration, PlatformData, StreamEntry } from '@penji-demos/types';
import { readDate } from './read-values';
import { resolveEntityDefinition, resolveForm, resolveStreamDefinition } from './resolve-configuration';
import { resolveActorRoles } from './resolve-scope';

// A record as the engines read it: its own values, the fields its form
// calculates, the platform's facts, and the facts its definition works out.
// One function serves every entity kind; the definitions decide what is read.

const withCalculatedFields = (form: FormDefinition | null, values: Answers): Answers => {
  if (!form) return values;
  const calculated = form.fields.flatMap((field) => (field.kind === 'calculated' ? [[field.key, calculateField(field.calculation, values)] as const] : []));
  return { ...values, ...Object.fromEntries(calculated) };
};

// Entries of one stream on one entity, in date order; entries on the same date keep the order they were recorded in.
export const resolveStreamEntries = (data: PlatformData, entity: EntityRecord, streamId: string): readonly StreamEntry[] =>
  data.entries.filter((entry) => entry.entityId === entity.entityId && entry.streamId === streamId).sort((first, second) => first.date.localeCompare(second.date));

// An entity's own values with the fields its form calculates: what a grant or a form reads.
export function resolveRecordAnswers(configuration: PlatformConfiguration, entity: EntityRecord): Answers {
  const definition = resolveEntityDefinition(configuration, entity.kind);
  return withCalculatedFields(definition ? resolveForm(configuration, definition.formId) : null, entity.values);
}

// One entry's values, its calculated fields, the platform's entry facts and the facts its stream works out.
export function resolveEntryAnswers(configuration: PlatformConfiguration, entry: StreamEntry): Answers {
  const stream = resolveStreamDefinition(configuration, entry.streamId);
  const answers: Answers = {
    ...withCalculatedFields(stream ? resolveForm(configuration, stream.formId) : null, entry.values),
    [PLATFORM_FACT.ENTRY_DATE]: entry.date,
    [PLATFORM_FACT.ENTRY_STATUS]: entry.status,
    [PLATFORM_FACT.ENTRY_AUTHOR]: entry.authorId,
  };
  return (stream?.facts ?? []).reduce<Answers>((facts, fact) => {
    if (fact.derivation.kind === FACT_DERIVATION_KIND.STATE_REACHED) {
      const states = fact.derivation.states;
      const reached = (entry.status !== null && states.includes(entry.status)) || entry.history.some((step) => states.includes(step.to));
      return { ...facts, [fact.key]: reached };
    }
    if (fact.derivation.kind === FACT_DERIVATION_KIND.CALCULATED) return { ...facts, [fact.key]: calculateField(fact.derivation.calculation, facts) };
    return facts;
  }, answers);
}

function deriveEntityFact(configuration: PlatformConfiguration, data: PlatformData, entity: EntityRecord, fact: FactDefinition, facts: Answers): Answers[string] {
  const { derivation } = fact;
  switch (derivation.kind) {
    case FACT_DERIVATION_KIND.PARENT_VALUE: {
      const parent = data.entities.find((candidate) => candidate.entityId === entity.parentId);
      return parent ? (resolveRecordAnswers(configuration, parent)[derivation.field] ?? null) : null;
    }
    case FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE: {
      const from = derivation.onOrAfter === null ? null : readDate(facts, derivation.onOrAfter);
      if (derivation.onOrAfter !== null && from === null) return null;
      const first = resolveStreamEntries(data, entity, derivation.stream)
        .filter((entry) => from === null || isOnOrAfter(entry.date, from))
        .map((entry) => resolveEntryAnswers(configuration, entry))
        .find((answers) => derivation.where === null || evaluateCondition(derivation.where, { ...facts, ...answers }));
      return first?.[derivation.field] ?? null;
    }
    case FACT_DERIVATION_KIND.ANY_ENTRY:
      return resolveStreamEntries(data, entity, derivation.stream).some(
        (entry) => derivation.where === null || evaluateCondition(derivation.where, { ...facts, ...resolveEntryAnswers(configuration, entry) }),
      );
    case FACT_DERIVATION_KIND.CALCULATED:
      return calculateField(derivation.calculation, facts);
    case FACT_DERIVATION_KIND.PERMISSION_HELD:
      return data.actors.some((actor) =>
        isPermitted(configuration.accessPolicy, resolveActorRoles(data, actor.actorId, entity, derivation.assignedTo), derivation.permission, { ...facts, [PLATFORM_FACT.ACTOR_ID]: actor.actorId }),
      );
    case FACT_DERIVATION_KIND.STATE_REACHED:
      return null;
  }
}

// An entity's facts on a date: its values, its calculated fields, the date, and every fact its definition works out, in order.
export function resolveEntityFacts(configuration: PlatformConfiguration, data: PlatformData, entity: EntityRecord, asOf: PlainDate): Answers {
  const definition = resolveEntityDefinition(configuration, entity.kind);
  const base: Answers = { ...resolveRecordAnswers(configuration, entity), [PLATFORM_FACT.AS_OF_DATE]: asOf };
  return (definition?.facts ?? []).reduce<Answers>((facts, fact) => ({ ...facts, [fact.key]: deriveEntityFact(configuration, data, entity, fact, facts) }), base);
}

// An entity as the compliance engine sees it: its facts, and every entry of every stream as an event, in date order.
export function resolveSubject(configuration: PlatformConfiguration, data: PlatformData, entity: EntityRecord, asOf: PlainDate): ComplianceSubject {
  return {
    facts: resolveEntityFacts(configuration, data, entity, asOf),
    events: data.entries
      .filter((entry) => entry.entityId === entity.entityId)
      .sort((first, second) => first.date.localeCompare(second.date))
      .map((entry) => ({ streamId: entry.streamId, eventId: entry.entryId, eventDate: entry.date, values: resolveEntryAnswers(configuration, entry) })),
  };
}
