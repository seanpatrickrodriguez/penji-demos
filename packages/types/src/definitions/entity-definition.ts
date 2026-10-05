import { ACCESS_SCOPE_KIND, DEFINITION_KIND, FACT_DERIVATION_KIND } from '@penji-demos/constants';
import { DefinitionId } from '../primitives/branded-ids';
import { ValueOf } from '../primitives/brand';
import { Definition } from './definition';
import { Calculation, Condition, FieldKey } from './form-definition';

// M2: what the platform keeps records of.  A tenant kind is a level in the
// tree of organizations; an entity kind is a thing a tenant keeps on file,
// with a form for its own fields, a parent kind it sits under, and streams of
// dated entries recorded against it over time.  A cohort with its session log
// and a vessel with its want list are both entities with a stream.

export type FactDerivationKind = ValueOf<typeof FACT_DERIVATION_KIND>;
export type AccessScopeKind = ValueOf<typeof ACCESS_SCOPE_KIND>;

// How a fact is worked out from records.  Facts are worked out in the order
// they are listed, so a later fact can read an earlier one.
export type FactDerivation =
  | { readonly kind: typeof FACT_DERIVATION_KIND.PARENT_VALUE; readonly field: FieldKey }
  | {
      readonly kind: typeof FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE;
      readonly stream: string;
      readonly field: FieldKey;
      // Only entries that match; null for every entry.
      readonly where: Condition | null;
      // Only entries dated on or after the date in this fact; null for every date.
      readonly onOrAfter: FieldKey | null;
    }
  | { readonly kind: typeof FACT_DERIVATION_KIND.ANY_ENTRY; readonly stream: string; readonly where: Condition | null }
  | { readonly kind: typeof FACT_DERIVATION_KIND.CALCULATED; readonly calculation: Calculation }
  | {
      readonly kind: typeof FACT_DERIVATION_KIND.PERMISSION_HELD;
      readonly permission: string;
      // Only assignments of this kind count: ENTITY for the people assigned to the entity itself; null for anyone whose scope covers it.
      readonly assignedTo: AccessScopeKind | null;
    }
  | { readonly kind: typeof FACT_DERIVATION_KIND.STATE_REACHED; readonly states: readonly string[] };

export interface FactDefinition {
  readonly key: FieldKey;
  readonly label: string;
  readonly derivation: FactDerivation;
}

// A stream of dated entries recorded against an entity: a session log, a want list.
export interface StreamDefinition {
  readonly id: string;
  readonly label: string;
  // What one entry is called: a session, an item.
  readonly entryLabel: string;
  readonly formId: DefinitionId;
  // The form field that holds the entry's date, or null when the platform dates the entry when it is added.
  readonly dateField: FieldKey | null;
  // The workflow each entry moves through, or null for entries with no states.
  readonly workflowId: DefinitionId | null;
  readonly addPermission: string;
  readonly editPermission: string;
  readonly removePermission: string;
  // Facts worked out for each entry from its own record.
  readonly facts: readonly FactDefinition[];
}

export interface TenantKindDefinition extends Definition<typeof DEFINITION_KIND.TENANT_KIND> {
  readonly label: string;
  // The kinds a tenant of this kind may sit under; empty for a root.
  readonly parentKinds: readonly DefinitionId[];
  readonly formId: DefinitionId;
}

export interface EntityDefinition extends Definition<typeof DEFINITION_KIND.ENTITY> {
  readonly label: string;
  readonly pluralLabel: string;
  readonly formId: DefinitionId;
  readonly editPermission: string;
  // The kind of entity this one sits under, or null when it sits directly under its tenant.
  readonly parentKind: DefinitionId | null;
  // The form field holding the date the entity begins, or null when it exists from the start.
  readonly startField: FieldKey | null;
  readonly streams: readonly StreamDefinition[];
  readonly facts: readonly FactDefinition[];
  // The compliance standards that evaluate entities of this kind.
  readonly standardIds: readonly DefinitionId[];
}
