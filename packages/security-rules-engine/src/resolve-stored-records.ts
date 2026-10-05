import { ACCESS_SCOPE_KIND } from '@penji-demos/constants';
import { resolveEntityLine, resolveRuleRoles, resolveTenantLine } from '@penji-demos/record-engine';
import { AccessPolicyDefinition, ActorId, EntityId, EntityRecord, PlatformData, StoredEntity, StoredTenant, TenantId, TenantRecord, TokenClaims } from '@penji-demos/types';

// The platform's records as the database stores them, and the claims the
// server puts on a person's sign-in token.  The lines and the claims are
// worked out by the record engine's own tree and role rules, so the security
// rules read the same answers the access policy gives.

export const resolveStoredTenant = (data: PlatformData, tenant: TenantRecord): StoredTenant => ({
  kind: tenant.kind,
  name: tenant.name,
  parentId: tenant.parentId,
  line: resolveTenantLine(data, tenant.tenantId),
});

export const resolveStoredEntity = (data: PlatformData, entity: EntityRecord): StoredEntity => ({
  kind: entity.kind,
  parentId: entity.parentId,
  line: resolveEntityLine(data, entity),
  values: entity.values,
});

export function resolveTokenClaims(policy: AccessPolicyDefinition, data: PlatformData, actorId: ActorId): TokenClaims {
  const actor = data.actors.find((candidate) => candidate.actorId === actorId);
  const active = data.assignments.filter((assignment) => assignment.actorId === actorId && assignment.active);
  const tenantScopes: TenantId[] = [];
  const entityScopes: EntityId[] = [];
  for (const { scope } of active) {
    if (scope.kind === ACCESS_SCOPE_KIND.TENANT) tenantScopes.push(scope.tenantId);
    else entityScopes.push(scope.entityId);
  }
  return { roles: actor && active.length > 0 ? resolveRuleRoles(policy, actor) : [], tenantScopes, entityScopes };
}
