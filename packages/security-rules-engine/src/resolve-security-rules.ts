import { RULES_ORIGIN, STORAGE_COLLECTION, STORED_FIELD, TOKEN_CLAIM } from '@penji-demos/constants';
import { resolveForm } from '@penji-demos/record-engine';
import { FormDefinition, PlatformConfiguration, ValueOf } from '@penji-demos/types';
import { resolveConditionalGrants, resolvePermissionRoles } from './resolve-permission-roles';
import { DATE_PATTERN, StoredField, isAlwaysRequired, resolveStoredFields, resolveTextLimit } from './validate-stored-values';

// Firestore security rules generated from a product's configuration.  The
// platform's part is written once, here: who is signed in, what their token
// carries, how a tenant's line is read and how a scope covers a record.  The
// product's part is generated: for each kind of entity, the roles that may
// edit it under the access policy, and the shape its values must keep under
// its form.

export type RulesOrigin = ValueOf<typeof RULES_ORIGIN>;

export interface RulesSection {
  readonly title: string;
  readonly origin: RulesOrigin;
  readonly text: string;
}

const quote = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const list = (values: readonly string[]): string => `[${values.map(quote).join(', ')}]`;
const pascal = (id: string): string => id.replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, letter: string) => letter.toUpperCase());
const indent = (text: string, spaces: number): string => text.split('\n').map((line) => (line === '' ? line : `${' '.repeat(spaces)}${line}`)).join('\n');

export const resolveValuesFunctionName = (form: FormDefinition): string => `is${pascal(form.id)}Values`;

function fieldCheck(field: StoredField): string {
  const value = `v.${field.key}`;
  switch (field.kind) {
    case 'text':
      return `${value} is string && ${value}.size() <= ${resolveTextLimit(field)}`;
    case 'number':
      return [
        `${value} is ${field.wholeNumber === true ? 'int' : 'number'}`,
        ...(field.min === undefined ? [] : [`${value} >= ${field.min}`]),
        ...(field.max === undefined ? [] : [`${value} <= ${field.max}`]),
      ].join(' && ');
    case 'date':
      return `${value} is string && ${value}.matches(${quote(DATE_PATTERN)})`;
    case 'choice':
      return `${value} in ${list(field.options.map((option) => option.value))}`;
    case 'yesNo':
      return `${value} is bool`;
  }
}

function valuesFunction(form: FormDefinition): string {
  const fields = resolveStoredFields(form);
  const checks = fields.map((field) =>
    isAlwaysRequired(field) ? `(${quote(field.key)} in v && ${fieldCheck(field)})` : `(!(${quote(field.key)} in v) || v.${field.key} == null || ${fieldCheck(field)})`,
  );
  return [
    `// The ${form.title.toLowerCase()} form: its own fields only, each its type and within its limits.`,
    `function ${resolveValuesFunctionName(form)}(v) {`,
    `  return v.keys().hasOnly(${list(fields.map((field) => field.key))})`,
    ...checks.map((check) => `    && ${check}`),
    '    ;',
    '}',
  ].join('\n');
}

const PLATFORM_FUNCTIONS = `// Who is signed in, and what the server put on their token.
function isSignedIn() { return request.auth != null; }
function claim(name) { return request.auth.token.get(name, []); }
function holdsRole() { return claim(${quote(TOKEN_CLAIM.ROLES)}).size() > 0; }
function holdsAny(roleIds) { return claim(${quote(TOKEN_CLAIM.ROLES)}).hasAny(roleIds); }

// A scope covers a tenant when it is the tenant or any tenant above it, and a
// record when it covers the record's tenant, or is the record or any record above it.
function tenantLine(tenantId) { return get(/databases/$(database)/documents/${STORAGE_COLLECTION.TENANTS}/$(tenantId)).data.${STORED_FIELD.LINE}; }
function coversTenant(tenantId) { return claim(${quote(TOKEN_CLAIM.TENANT_SCOPES)}).hasAny(tenantLine(tenantId)); }
function coversEntity(tenantId, entity) { return coversTenant(tenantId) || claim(${quote(TOKEN_CLAIM.ENTITY_SCOPES)}).hasAny(entity.${STORED_FIELD.LINE}); }

// Only a record's values change from the browser; its kind, parent and line are the server's.
function changesOnlyValues() { return request.resource.data.diff(resource.data).affectedKeys().hasOnly([${quote(STORED_FIELD.VALUES)}]); }`;

function editClauses(configuration: PlatformConfiguration): string {
  const clauses = configuration.entities.map((entity) => {
    const roles = resolvePermissionRoles(configuration.accessPolicy, entity.editPermission);
    const form = resolveForm(configuration, entity.formId);
    const permitted = roles.length > 0 && form ? `holdsAny(${list(roles)}) && ${resolveValuesFunctionName(form)}(request.resource.data.${STORED_FIELD.VALUES})` : 'false';
    return `// ${entity.label}: the ${entity.editPermission} permission, held by ${roles.length > 0 ? roles.join(', ') : 'no role outright'}.\nfunction mayEdit${pascal(entity.id)}() {\n  return resource.data.${STORED_FIELD.KIND} == ${quote(entity.id)} && ${permitted};\n}`;
  });
  const conditional = resolveConditionalGrants(configuration.accessPolicy);
  const note = conditional.length === 0 ? '' : `\n// Left to the server: ${conditional.map((grant) => `${grant.roleId} may ${grant.permission} only under a condition`).join('; ')}.`;
  return `${clauses.join('\n\n')}${note}`;
}

const mayEditAny = (configuration: PlatformConfiguration): string =>
  configuration.entities.length === 0 ? 'false' : configuration.entities.map((entity) => `mayEdit${pascal(entity.id)}()`).join(' || ');

export function resolveRulesSections(configuration: PlatformConfiguration): readonly RulesSection[] {
  const forms = configuration.entities.flatMap((entity) => {
    const form = resolveForm(configuration, entity.formId);
    return form ? [form] : [];
  });
  const matches = `match /${STORAGE_COLLECTION.TENANTS}/{tenantId} {
  allow get: if isSignedIn() && holdsRole() && coversTenant(tenantId);
  allow list, create, update, delete: if false;

  match /${STORAGE_COLLECTION.ENTITIES}/{entityId} {
    allow list: if isSignedIn() && holdsRole() && coversTenant(tenantId);
    allow get: if isSignedIn() && holdsRole() && coversEntity(tenantId, resource.data);
    allow update: if isSignedIn() && holdsRole() && coversEntity(tenantId, resource.data)
      && changesOnlyValues()
      && mayEditRecord();
    // Records are added and removed by the server.
    allow create, delete: if false;
  }
}`;
  return [
    { title: 'Who is signed in and what covers what', origin: RULES_ORIGIN.PLATFORM, text: PLATFORM_FUNCTIONS },
    { title: 'Tenants and their records', origin: RULES_ORIGIN.PLATFORM, text: matches },
    {
      title: 'Who may edit each kind of record',
      origin: RULES_ORIGIN.CONFIGURATION,
      text: `${editClauses(configuration)}\n\nfunction mayEditRecord() { return ${mayEditAny(configuration)}; }`,
    },
    { title: 'What each record may hold', origin: RULES_ORIGIN.CONFIGURATION, text: forms.map(valuesFunction).join('\n\n') },
  ];
}

export function resolveSecurityRules(configuration: PlatformConfiguration): string {
  const body = resolveRulesSections(configuration)
    .map((section) => `// ${section.title} (${section.origin === RULES_ORIGIN.PLATFORM ? 'the platform' : 'generated from the configuration'}).\n${section.text}`)
    .join('\n\n');
  return `rules_version = '2';

// Generated by @penji-demos/security-rules-engine from "${configuration.title}", version ${configuration.version}.
// Change the configuration and generate again; this file is not edited by hand.
service cloud.firestore {
  match /databases/{database}/documents {
${indent(body, 4)}
  }
}
`;
}
