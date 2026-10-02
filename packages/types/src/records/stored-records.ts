import { RULE_CLAUSE, STORAGE_OPERATION } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { ActorId, DefinitionId, EntityId, TenantId } from '../primitives/branded-ids';
import { Answers } from '../definitions/form-definition';

// M0 as the database holds it.  A stored record carries its line of
// ancestors so the security rules can tell whose scope covers it without
// walking the tree, and the claims on a person's token carry what their
// staff record and assignments give them.

export interface StoredTenant {
  readonly kind: DefinitionId;
  readonly name: string;
  readonly parentId: TenantId | null;
  // The tenant's own ID, then its parent's, up to the root.
  readonly line: readonly TenantId[];
}

export interface StoredEntity {
  readonly kind: DefinitionId;
  readonly parentId: EntityId | null;
  // The entity's own ID, then its parent's, up to the entity at the top.
  readonly line: readonly EntityId[];
  readonly values: Answers;
}

// A demo account for one staff member: public values, shown on the page, for
// synthetic people only.
export interface DemoSignIn {
  readonly actorId: ActorId;
  readonly email: string;
  readonly password: string;
}

export interface TokenClaims {
  readonly roles: readonly string[];
  readonly tenantScopes: readonly TenantId[];
  readonly entityScopes: readonly EntityId[];
}

// One request to the database, as the security rules see it.
export type StorageRequest =
  | { readonly operation: typeof STORAGE_OPERATION.GET; readonly tenantId: TenantId; readonly entityId: EntityId }
  | { readonly operation: typeof STORAGE_OPERATION.LIST; readonly tenantId: TenantId }
  | {
      readonly operation: typeof STORAGE_OPERATION.UPDATE;
      readonly tenantId: TenantId;
      readonly entityId: EntityId;
      // Answers merged into the record's values.
      readonly values: Answers;
      // Any other stored fields the request writes, with the IDs it writes to
      // them, which the rules protect: a line rewritten to sit under another record.
      readonly otherFields: Readonly<Record<string, readonly string[]>>;
    };

export type RuleClause = ValueOf<typeof RULE_CLAUSE>;

// What the security rules decide for a request, and the clause that decided
// it: the first that failed, or the last that held.
export interface StorageDecision {
  readonly allowed: boolean;
  readonly clause: RuleClause;
  readonly reason: string;
}

// A request the demo makes, named for the page.
export interface NamedStorageRequest {
  readonly id: string;
  readonly label: string;
  readonly request: StorageRequest;
}
