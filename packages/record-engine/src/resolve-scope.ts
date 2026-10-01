import { ACCESS_SCOPE_KIND } from '@penji-demos/constants';
import { AccessScope, AccessScopeKind, ActorId, EntityId, EntityRecord, PlatformData, TenantId, TenantRecord } from '@penji-demos/types';

// The tenant tree and the entity tree, and which scopes cover which records.
// A scope covers everything beneath it: a hub's data specialist and a fleet's
// supply manager are both assignments at a tenant above the records they work.

export function resolveTenantLine(data: PlatformData, tenantId: TenantId): readonly TenantId[] {
  const line: TenantId[] = [];
  for (let current: TenantRecord | undefined = data.tenants.find((tenant) => tenant.tenantId === tenantId); current && !line.includes(current.tenantId); ) {
    line.push(current.tenantId);
    const parentId: TenantId | null = current.parentId;
    current = parentId === null ? undefined : data.tenants.find((tenant) => tenant.tenantId === parentId);
  }
  return line;
}

export function resolveEntityLine(data: PlatformData, entity: EntityRecord): readonly EntityId[] {
  const line: EntityId[] = [];
  for (let current: EntityRecord | undefined = entity; current && !line.includes(current.entityId); ) {
    line.push(current.entityId);
    const parentId: EntityId | null = current.parentId;
    current = parentId === null ? undefined : data.entities.find((candidate) => candidate.entityId === parentId);
  }
  return line;
}

export function isInScope(data: PlatformData, scope: AccessScope, entity: EntityRecord): boolean {
  switch (scope.kind) {
    case ACCESS_SCOPE_KIND.TENANT:
      return resolveTenantLine(data, entity.tenantId).includes(scope.tenantId);
    case ACCESS_SCOPE_KIND.ENTITY:
      return resolveEntityLine(data, entity).includes(scope.entityId);
  }
}

// The roles a person holds over an entity: every active assignment whose scope
// covers it, or only the assignments of one scope kind when `assignedTo` names one.
export function resolveActorRoles(data: PlatformData, actorId: ActorId, entity: EntityRecord, assignedTo: AccessScopeKind | null = null): readonly string[] {
  const roles = data.assignments
    .filter((assignment) => assignment.actorId === actorId && assignment.active && (assignedTo === null || assignment.scope.kind === assignedTo) && isInScope(data, assignment.scope, entity))
    .map((assignment) => assignment.roleId);
  return [...new Set(roles)];
}
