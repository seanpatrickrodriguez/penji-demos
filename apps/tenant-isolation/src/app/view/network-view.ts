import { ACCESS_SCOPE_KIND, COHORT_FIELD, PROGRAM_ENTITY, RULE_CLAUSE, RULES_ORIGIN, STAFF_FIELD, STORAGE_OPERATION } from '@penji-demos/constants';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { NETWORK_REQUESTS, SYNTHETIC_NETWORK } from '@penji-demos/dprp-seed';
import { describeAnswer } from '@penji-demos/form-engine';
import { readDate, readText, resolveForm } from '@penji-demos/record-engine';
import { evaluateAccessPolicy, evaluateStorageRequest, resolveRulesSections } from '@penji-demos/security-rules-engine';
import { AccessScope, Answers, EntityId, RuleClause, StorageRequest, TenantId, TenantRecord, TokenClaims } from '@penji-demos/types';
import { formatDate } from '@penji-demos/ui';
import { SentRequest, isPermissionDenied } from '../state/firebase-boundary';
import { NetworkRun, VISITORS, Visitor } from '../state/network-store';

// Everything the page shows, worked out from the seed, the configuration and
// the live run.  The templates read these view models and nothing else.

const CONFIGURATION = PROGRAM_CONFIGURATION;
const DATA = SYNTHETIC_NETWORK;
const staffForm = resolveForm(CONFIGURATION, CONFIGURATION.actorFormId);
const cohortDefinition = CONFIGURATION.entities.find((entity) => entity.id === PROGRAM_ENTITY.COHORT);
const cohortForm = cohortDefinition ? resolveForm(CONFIGURATION, cohortDefinition.formId) : null;

export const CLAUSE_LABEL: Readonly<Record<RuleClause, string>> = {
  [RULE_CLAUSE.SIGNED_IN]: 'Signed in',
  [RULE_CLAUSE.SCOPE]: 'Scope over the record',
  [RULE_CLAUSE.LIST_SCOPE]: 'Scope over the tenant',
  [RULE_CLAUSE.RECORD_EXISTS]: 'Record under this tenant',
  [RULE_CLAUSE.PROTECTED_FIELD]: 'Fields the server keeps',
  [RULE_CLAUSE.PERMISSION]: 'Permission',
  [RULE_CLAUSE.VALUES]: 'Values fit the form',
};

const tenantName = (tenantId: TenantId): string => DATA.tenants.find((tenant) => tenant.tenantId === tenantId)?.name ?? tenantId;
const cohortCode = (entityId: EntityId): string => {
  const entity = DATA.entities.find((candidate) => candidate.entityId === entityId);
  return (entity && readText(entity.values, COHORT_FIELD.CODE)) ?? entityId;
};
const positionLabel = (values: Answers): string =>
  describeAnswer(
    staffForm?.fields.find((field) => field.key === STAFF_FIELD.POSITION),
    readText(values, STAFF_FIELD.POSITION),
  );

// Where an assignment applies, written to follow "Assigned to".
const describeScope = (scope: AccessScope): string =>
  scope.kind === ACCESS_SCOPE_KIND.TENANT ? `${tenantName(scope.tenantId)} and every organization under it` : `cohort ${cohortCode(scope.entityId)} only`;
const capitalize = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// The network as a tree, each tenant with its cohorts.
export interface TreeNode {
  readonly tenantId: TenantId;
  readonly name: string;
  readonly kind: string;
  readonly cohorts: readonly { readonly code: string; readonly detail: string }[];
  readonly children: readonly TreeNode[];
}

const tenantKindLabel = (tenant: TenantRecord): string => CONFIGURATION.tenantKinds.find((kind) => kind.id === tenant.kind)?.label ?? tenant.kind;

function resolveNode(tenant: TenantRecord): TreeNode {
  const kindField = cohortForm?.fields.find((field) => field.key === COHORT_FIELD.KIND);
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    kind: tenantKindLabel(tenant),
    cohorts: DATA.entities
      .filter((entity) => entity.tenantId === tenant.tenantId)
      .map((entity) => {
        const start = readDate(entity.values, COHORT_FIELD.START_DATE);
        return {
          code: cohortCode(entity.entityId),
          detail: `${describeAnswer(kindField, entity.values[COHORT_FIELD.KIND])}, from ${start ? formatDate(start) : 'no date'}`,
        };
      }),
    children: DATA.tenants.filter((child) => child.parentId === tenant.tenantId).map(resolveNode),
  };
}

export const NETWORK_TREE: readonly TreeNode[] = DATA.tenants.filter((tenant) => tenant.parentId === null).map(resolveNode);

// The demo accounts, with what each one's staff record and assignment give it.
export interface StaffRow {
  readonly key: string;
  readonly name: string;
  readonly position: string;
  readonly worksFor: string;
  readonly scope: string;
  readonly assignedTo: string;
  readonly email: string;
  readonly password: string;
}

export const STAFF_ROWS: readonly StaffRow[] = VISITORS.flatMap((visitor): StaffRow[] => {
  if (visitor.kind !== 'staff') return [];
  const actor = DATA.actors.find((candidate) => candidate.actorId === visitor.actorId);
  const assignment = DATA.assignments.find((candidate) => candidate.actorId === visitor.actorId && candidate.active);
  return actor
    ? [
        {
          key: visitor.key,
          name: actor.name,
          position: positionLabel(actor.values),
          worksFor: tenantName(actor.tenantId),
          scope: assignment ? capitalize(describeScope(assignment.scope)) : 'No active assignment',
          assignedTo: assignment ? `Assigned to ${describeScope(assignment.scope)}` : 'No active assignment',
          email: visitor.signIn.email,
          password: visitor.signIn.password,
        },
      ]
    : [];
});

export interface VisitorOption {
  readonly key: string;
  // Who the token belongs to, in a sentence.
  readonly holder: string;
  readonly label: string;
  readonly detail: string;
}

export function resolveVisitorLabel(visitor: Visitor): VisitorOption {
  switch (visitor.kind) {
    case 'staff': {
      const row = STAFF_ROWS.find((candidate) => candidate.key === visitor.key);
      return { key: visitor.key, holder: row?.name ?? visitor.signIn.email, label: row ? `${row.name}, ${row.position.toLowerCase()}` : visitor.signIn.email, detail: row?.assignedTo ?? '' };
    }
    case 'anonymous':
      return { key: visitor.key, holder: 'this person', label: 'Someone signed in with no staff record', detail: 'An anonymous sign-in: a real token with no roles on it' };
    case 'signedOut':
      return { key: visitor.key, holder: 'nobody', label: 'Nobody signed in', detail: 'No token at all' };
  }
}

export const VISITOR_OPTIONS: readonly VisitorOption[] = VISITORS.map(resolveVisitorLabel);

// What the live token carried.
export interface ClaimsView {
  readonly roles: string;
  readonly tenantScopes: string;
  readonly entityScopes: string;
}

const roleLabel = (roleId: string): string => CONFIGURATION.accessPolicy.roles.find((role) => role.id === roleId)?.label ?? roleId;
const listOrNone = (items: readonly string[]): string => (items.length === 0 ? 'none' : items.join(', '));

export const resolveClaimsView = (claims: TokenClaims): ClaimsView => ({
  roles: listOrNone(claims.roles.map(roleLabel)),
  tenantScopes: listOrNone(claims.tenantScopes.map(tenantName)),
  entityScopes: listOrNone(claims.entityScopes.map((entityId) => `Cohort ${cohortCode(entityId)}`)),
});

export type Tone = 'met' | 'notMet' | 'unmeasured' | 'error';

export interface ResultRow {
  readonly id: string;
  readonly label: string;
  readonly operation: string;
  readonly policy: string;
  readonly predicted: string;
  readonly predictedTone: Tone;
  readonly live: string;
  readonly liveTone: Tone;
  readonly agrees: string;
  readonly agreed: boolean | null;
  readonly clause: string;
  readonly reason: string;
  readonly returned: string;
}

const OPERATION_LABEL: Readonly<Record<StorageRequest['operation'], string>> = {
  [STORAGE_OPERATION.LIST]: 'List',
  [STORAGE_OPERATION.GET]: 'Read',
  [STORAGE_OPERATION.UPDATE]: 'Save',
};

const NOT_SENT: { readonly text: string; readonly tone: Tone } = { text: 'Not sent yet', tone: 'unmeasured' };

function describeLive(sent: SentRequest | undefined, finished: boolean): { readonly text: string; readonly tone: Tone } {
  if (!sent) return { text: finished ? 'Not sent' : 'Sending…', tone: 'unmeasured' };
  if (sent.allowed) return { text: 'Allowed', tone: 'met' };
  return isPermissionDenied(sent) ? { text: 'Refused: permission-denied', tone: 'notMet' } : { text: `Failed: ${sent.errorCode ?? 'unknown'}`, tone: 'error' };
}

function describeReturned(sent: SentRequest | undefined, operation: string): string {
  if (!sent?.allowed) return '—';
  if (operation === STORAGE_OPERATION.UPDATE) return 'Saved';
  return sent.returned.length === 0 ? 'Nothing' : [...sent.returned].sort().join(', ');
}

export function resolveResultRows(visitor: Visitor, run: NetworkRun | null): readonly ResultRow[] {
  const current = run && run.visitorKey === visitor.key ? run : null;
  // Before a run, the prediction reads the claims the server sets for this person; after, the claims the live token carried.
  const claims = current?.signedIn ? current.claims : null;
  const actorId = visitor.kind === 'staff' ? visitor.actorId : null;
  return NETWORK_REQUESTS.map(({ id, label, request }) => {
    const predicted = current?.signedIn ? evaluateStorageRequest(CONFIGURATION, DATA, claims, request) : null;
    const policy = evaluateAccessPolicy(CONFIGURATION, DATA, actorId, request);
    const sent = current?.outcomes.get(id);
    const live = current ? describeLive(sent, current.finished) : NOT_SENT;
    return {
      id,
      label,
      operation: OPERATION_LABEL[request.operation],
      policy: `${policy.permitted ? 'Permits' : 'Does not permit'}${policy.asksOnlyAboutAccess ? '' : '; the rules check more'}`,
      predicted: predicted ? (predicted.allowed ? 'Allow' : 'Refuse') : '—',
      predictedTone: predicted ? (predicted.allowed ? 'met' : 'notMet') : 'unmeasured',
      live: live.text,
      liveTone: live.tone,
      agrees: predicted && sent ? (predicted.allowed === sent.allowed ? 'As predicted' : 'Not as predicted') : '',
      agreed: predicted && sent ? predicted.allowed === sent.allowed : null,
      clause: predicted ? CLAUSE_LABEL[predicted.clause] : '',
      reason: predicted?.reason ?? '',
      returned: describeReturned(sent, request.operation),
    };
  });
}

export interface RulesSectionView {
  readonly title: string;
  readonly origin: string;
  readonly generated: boolean;
  readonly text: string;
}

export const RULES_SECTIONS: readonly RulesSectionView[] = resolveRulesSections(CONFIGURATION).map((section) => ({
  title: section.title,
  origin: section.origin === RULES_ORIGIN.PLATFORM ? 'Written once in the engine, the same for every product' : 'Generated from the configuration',
  generated: section.origin === RULES_ORIGIN.CONFIGURATION,
  text: section.text,
}));
