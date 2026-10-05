import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RulesTestContext, RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { STORAGE_COLLECTION, STORAGE_OPERATION } from '@penji-demos/constants';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { NETWORK_REQUESTS, NETWORK_SIGN_INS, SYNTHETIC_NETWORK } from '@penji-demos/dprp-seed';
import { evaluateAccessPolicy, evaluateStorageRequest, resolveStoredEntity, resolveStoredTenant, resolveTokenClaims } from '@penji-demos/security-rules-engine';
import { ActorId, StorageRequest, TokenClaims } from '@penji-demos/types';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The generated rules, run in the Firestore emulator against the synthetic
// network: every request the page sends, for every demo account, a person
// signed in with no staff record, and nobody signed in.  Each answer must be
// the one the security rules engine predicts, and where a request asks only
// about scope and permission, the one the access policy gives.

const RULES = readFileSync(fileURLToPath(new URL('./firestore.rules', import.meta.url)), 'utf8');
const [host = '127.0.0.1', port = '8187'] = (process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8187').split(':');

type Firestore = ReturnType<RulesTestContext['firestore']>;

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-penji-tenants', firestore: { rules: RULES, host, port: Number(port) } });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const tenant of SYNTHETIC_NETWORK.tenants) await setDoc(doc(db, STORAGE_COLLECTION.TENANTS, tenant.tenantId), resolveStoredTenant(SYNTHETIC_NETWORK, tenant));
    for (const entity of SYNTHETIC_NETWORK.entities) {
      await setDoc(doc(db, STORAGE_COLLECTION.TENANTS, entity.tenantId, STORAGE_COLLECTION.ENTITIES, entity.entityId), resolveStoredEntity(SYNTHETIC_NETWORK, entity));
    }
  });
});

afterAll(async () => {
  await environment.cleanup();
});

async function send(db: Firestore, request: StorageRequest): Promise<boolean> {
  try {
    switch (request.operation) {
      case STORAGE_OPERATION.LIST:
        await getDocs(collection(db, STORAGE_COLLECTION.TENANTS, request.tenantId, STORAGE_COLLECTION.ENTITIES));
        return true;
      case STORAGE_OPERATION.GET:
        await getDoc(doc(db, STORAGE_COLLECTION.TENANTS, request.tenantId, STORAGE_COLLECTION.ENTITIES, request.entityId));
        return true;
      case STORAGE_OPERATION.UPDATE: {
        const changes: Record<string, unknown> = Object.fromEntries([
          ...Object.entries(request.values).map(([key, value]) => [`values.${key}`, value]),
          ...Object.entries(request.otherFields),
        ]);
        await updateDoc(doc(db, STORAGE_COLLECTION.TENANTS, request.tenantId, STORAGE_COLLECTION.ENTITIES, request.entityId), changes);
        return true;
      }
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'permission-denied') return false;
    throw error;
  }
}

const tokenOf = (claims: TokenClaims) => ({ roles: [...claims.roles], tenantScopes: [...claims.tenantScopes], entityScopes: [...claims.entityScopes] });

interface Visitor {
  readonly label: string;
  readonly actorId: ActorId | null;
  readonly claims: TokenClaims | null;
  readonly db: () => Firestore;
}

const NO_CLAIMS: TokenClaims = { roles: [], tenantScopes: [], entityScopes: [] };

const visitors = (): readonly Visitor[] => [
  ...NETWORK_SIGN_INS.map((signIn) => {
    const claims = resolveTokenClaims(PROGRAM_CONFIGURATION.accessPolicy, SYNTHETIC_NETWORK, signIn.actorId);
    return { label: signIn.email, actorId: signIn.actorId, claims, db: () => environment.authenticatedContext(signIn.actorId, tokenOf(claims)).firestore() };
  }),
  { label: 'signed in with no staff record', actorId: null, claims: NO_CLAIMS, db: () => environment.authenticatedContext('anonymous-visitor').firestore() },
  { label: 'signed out', actorId: null, claims: null, db: () => environment.unauthenticatedContext().firestore() },
];

describe('the generated rules in the Firestore emulator', () => {
  for (const visitor of visitors()) {
    describe(visitor.label, () => {
      for (const { id, request } of NETWORK_REQUESTS) {
        it(`answers ${id} as the rules engine predicts`, async () => {
          const predicted = evaluateStorageRequest(PROGRAM_CONFIGURATION, SYNTHETIC_NETWORK, visitor.claims, request);
          expect(await send(visitor.db(), request)).toBe(predicted.allowed);
          const policy = evaluateAccessPolicy(PROGRAM_CONFIGURATION, SYNTHETIC_NETWORK, visitor.actorId, request);
          if (policy.asksOnlyAboutAccess) expect(predicted.allowed, `${id} against the access policy`).toBe(policy.permitted);
        });
      }
    });
  }
});
