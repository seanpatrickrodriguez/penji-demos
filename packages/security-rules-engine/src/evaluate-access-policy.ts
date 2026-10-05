import { ACCESS_SCOPE_KIND, STORAGE_OPERATION } from '@penji-demos/constants';
import { isPermittedOnRecord, resolveActorRoles, resolveEntityDefinition, resolveForm, resolveRuleRoles, resolveTenantLine } from '@penji-demos/record-engine';
import { ActorId, PlatformConfiguration, PlatformData, StorageRequest } from '@penji-demos/types';
import { validateStoredValues } from './validate-stored-values';

// What the access policy alone says about a request, read by the record
// engine from the staff record and assignments: reading takes a role over the
// record, listing a tenant takes a role over the tenant, saving takes the
// record's edit permission.  The security rules must give the same answer to
// every request that asks only about access.

export interface PolicyAnswer {
  readonly permitted: boolean;
  // False when the request also changes server-kept fields or values the form does not accept, which the policy does not speak to.
  readonly asksOnlyAboutAccess: boolean;
}

export function evaluateAccessPolicy(configuration: PlatformConfiguration, data: PlatformData, actorId: ActorId | null, request: StorageRequest): PolicyAnswer {
  const actor = actorId === null ? undefined : data.actors.find((candidate) => candidate.actorId === actorId);
  if (request.operation === STORAGE_OPERATION.LIST) {
    const line = resolveTenantLine(data, request.tenantId);
    const covered =
      actor !== undefined &&
      data.assignments.some((assignment) => assignment.actorId === actor.actorId && assignment.active && assignment.scope.kind === ACCESS_SCOPE_KIND.TENANT && line.includes(assignment.scope.tenantId));
    return { permitted: covered && actor !== undefined && resolveRuleRoles(configuration.accessPolicy, actor).length > 0, asksOnlyAboutAccess: true };
  }
  const entity = data.entities.find((candidate) => candidate.entityId === request.entityId && candidate.tenantId === request.tenantId);
  if (!entity || !actor) return { permitted: false, asksOnlyAboutAccess: true };
  if (request.operation === STORAGE_OPERATION.GET) return { permitted: resolveActorRoles(configuration.accessPolicy, data, actor.actorId, entity).length > 0, asksOnlyAboutAccess: true };
  const definition = resolveEntityDefinition(configuration, entity.kind);
  const form = definition ? resolveForm(configuration, definition.formId) : null;
  return {
    permitted: definition !== null && isPermittedOnRecord(configuration, data, actor.actorId, definition.editPermission, entity),
    asksOnlyAboutAccess: form !== null && Object.keys(request.otherFields).length === 0 && validateStoredValues(form, { ...entity.values, ...request.values }).length === 0,
  };
}
