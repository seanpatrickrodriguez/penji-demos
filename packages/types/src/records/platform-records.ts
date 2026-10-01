import { ACCESS_SCOPE_KIND } from '@penji-demos/constants';
import { ActorId, AssignmentId, DefinitionId, EntityId, EntryId, TenantId } from '../primitives/branded-ids';
import { PlainDate } from '../primitives/plain-date';
import { Answers } from '../definitions/form-definition';
import { TransitionRecord } from '../definitions/workflow-definition';

// M0: every record the platform keeps, whatever the product.  A record holds
// its values as plain answers to its definition's form; what they mean is
// up to the definitions.

export interface TenantRecord {
  readonly tenantId: TenantId;
  readonly kind: DefinitionId;
  readonly parentId: TenantId | null;
  readonly name: string;
  readonly values: Answers;
}

export interface ActorRecord {
  readonly actorId: ActorId;
  // The tenant the person works for.
  readonly tenantId: TenantId;
  readonly name: string;
  readonly values: Answers;
}

export type AccessScope =
  | { readonly kind: typeof ACCESS_SCOPE_KIND.TENANT; readonly tenantId: TenantId }
  | { readonly kind: typeof ACCESS_SCOPE_KIND.ENTITY; readonly entityId: EntityId };

// One role held by one person over one scope.  An inactive assignment is kept
// and grants nothing: crew on their rotation off, a coach between cohorts.
export interface RoleAssignment {
  readonly assignmentId: AssignmentId;
  readonly actorId: ActorId;
  readonly roleId: string;
  readonly scope: AccessScope;
  readonly active: boolean;
}

export interface EntityRecord {
  readonly entityId: EntityId;
  readonly kind: DefinitionId;
  readonly tenantId: TenantId;
  readonly parentId: EntityId | null;
  readonly values: Answers;
}

export interface StreamEntry {
  readonly entryId: EntryId;
  readonly streamId: string;
  readonly entityId: EntityId;
  readonly date: PlainDate;
  readonly authorId: ActorId;
  readonly values: Answers;
  // The workflow state, or null for a stream with no workflow.
  readonly status: string | null;
  readonly history: readonly TransitionRecord[];
}

export interface PlatformData {
  readonly tenants: readonly TenantRecord[];
  readonly actors: readonly ActorRecord[];
  readonly assignments: readonly RoleAssignment[];
  readonly entities: readonly EntityRecord[];
  readonly entries: readonly StreamEntry[];
}
