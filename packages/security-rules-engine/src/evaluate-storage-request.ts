import { RULE_CLAUSE, STORAGE_OPERATION, STORED_FIELD } from '@penji-demos/constants';
import { resolveEntityDefinition, resolveForm, resolvePermissionLabel, resolveTenantLine } from '@penji-demos/record-engine';
import { PlatformConfiguration, PlatformData, RuleClause, StorageDecision, StorageRequest, StoredEntity, TokenClaims } from '@penji-demos/types';
import { resolvePermissionRoles } from './resolve-permission-roles';
import { resolveStoredEntity } from './resolve-stored-records';
import { validateStoredValues } from './validate-stored-values';

// What the generated security rules decide for a request, worked out from
// the same configuration and the claims on the person's token.  The clauses
// are checked in the order the rules list them, and the first that fails
// decides; the emulator tests hold this reading to the rules themselves.

const allow = (clause: RuleClause, reason: string): StorageDecision => ({ allowed: true, clause, reason });
const deny = (clause: RuleClause, reason: string): StorageDecision => ({ allowed: false, clause, reason });

function readStoredField(stored: StoredEntity, field: string): unknown {
  switch (field) {
    case STORED_FIELD.KIND:
      return stored.kind;
    case STORED_FIELD.PARENT_ID:
      return stored.parentId;
    case STORED_FIELD.LINE:
      return stored.line;
    case STORED_FIELD.VALUES:
      return stored.values;
    default:
      return undefined;
  }
}

export function evaluateStorageRequest(configuration: PlatformConfiguration, data: PlatformData, claims: TokenClaims | null, request: StorageRequest): StorageDecision {
  if (claims === null) return deny(RULE_CLAUSE.SIGNED_IN, 'Nobody is signed in, and every rule starts by requiring a signed-in person.');
  if (claims.roles.length === 0) return deny(RULE_CLAUSE.SCOPE, 'The sign-in token carries no role: this person has no staff record or no active assignment.');

  const tenantCovered = claims.tenantScopes.some((tenantId) => resolveTenantLine(data, request.tenantId).includes(tenantId));
  const tenantName = data.tenants.find((tenant) => tenant.tenantId === request.tenantId)?.name ?? 'this tenant';

  if (request.operation === STORAGE_OPERATION.LIST) {
    return tenantCovered
      ? allow(RULE_CLAUSE.LIST_SCOPE, `An assignment at ${tenantName} or a tenant above it covers every record there.`)
      : deny(RULE_CLAUSE.LIST_SCOPE, `Listing the records of ${tenantName} takes an assignment there or at a tenant above it.`);
  }

  const entity = data.entities.find((candidate) => candidate.entityId === request.entityId && candidate.tenantId === request.tenantId);
  if (!entity) return deny(RULE_CLAUSE.RECORD_EXISTS, 'There is no such record under this tenant, so no rule can read its line.');
  const stored = resolveStoredEntity(data, entity);
  const entityCovered = tenantCovered || claims.entityScopes.some((entityId) => stored.line.includes(entityId));
  if (!entityCovered) return deny(RULE_CLAUSE.SCOPE, `No assignment of this person's covers ${tenantName} or this record.`);
  if (request.operation === STORAGE_OPERATION.GET) {
    return allow(RULE_CLAUSE.SCOPE, tenantCovered ? `An assignment at ${tenantName} or above covers the record.` : 'An assignment to this record itself covers it.');
  }

  // A field written with the value it already holds is no change, and the rules see none.
  const changed = Object.entries(request.otherFields)
    .filter(([field, value]) => JSON.stringify(readStoredField(stored, field)) !== JSON.stringify(value))
    .map(([field]) => field);
  if (changed.length > 0) return deny(RULE_CLAUSE.PROTECTED_FIELD, `Only the record's values may change; ${changed.join(', ')} is kept by the server.`);
  const definition = resolveEntityDefinition(configuration, entity.kind);
  const roles = definition ? resolvePermissionRoles(configuration.accessPolicy, definition.editPermission) : [];
  if (!definition || !claims.roles.some((role) => roles.includes(role))) {
    const label = definition ? resolvePermissionLabel(configuration, definition.editPermission).toLowerCase() : 'edit this record';
    return deny(RULE_CLAUSE.PERMISSION, `None of this person's roles holds the permission to ${label}.`);
  }
  const form = resolveForm(configuration, definition.formId);
  const problems = form ? validateStoredValues(form, { ...stored.values, ...request.values }) : ['The record has no form.'];
  return problems.length === 0
    ? allow(RULE_CLAUSE.VALUES, `The person's role may ${resolvePermissionLabel(configuration, definition.editPermission).toLowerCase()}, and the values fit the form.`)
    : deny(RULE_CLAUSE.VALUES, problems.join(' '));
}
