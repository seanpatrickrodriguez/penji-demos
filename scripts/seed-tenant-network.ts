// Writes the synthetic network into the live demo project and resets it: the
// tenants and their cohorts as stored records, a demo account for each staff
// member with the claims their staff record and assignments give them, and
// nothing else.  Runs with Application Default Credentials against
// penji-demos-tenants only; `npm run seed:tenants` sets the quota project.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { STORAGE_COLLECTION } from '@penji-demos/constants';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { NETWORK_SIGN_INS, SYNTHETIC_NETWORK } from '@penji-demos/dprp-seed';
import { resolveStoredEntity, resolveStoredTenant, resolveTokenClaims } from '@penji-demos/security-rules-engine';

const PROJECT_ID = 'penji-demos-tenants';
if (process.env['GOOGLE_CLOUD_QUOTA_PROJECT'] !== PROJECT_ID) throw new Error(`Set GOOGLE_CLOUD_QUOTA_PROJECT=${PROJECT_ID}, so no other project is billed for these calls.`);

const app = initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore(app);
const auth = getAuth(app);

async function seedRecords(): Promise<void> {
  const tenantIds = new Set<string>(SYNTHETIC_NETWORK.tenants.map((tenant) => tenant.tenantId));
  const entityPaths = new Set(SYNTHETIC_NETWORK.entities.map((entity) => `${STORAGE_COLLECTION.TENANTS}/${entity.tenantId}/${STORAGE_COLLECTION.ENTITIES}/${entity.entityId}`));
  const batch = db.batch();
  for (const tenant of SYNTHETIC_NETWORK.tenants) batch.set(db.collection(STORAGE_COLLECTION.TENANTS).doc(tenant.tenantId), resolveStoredTenant(SYNTHETIC_NETWORK, tenant));
  for (const entity of SYNTHETIC_NETWORK.entities) {
    batch.set(db.collection(STORAGE_COLLECTION.TENANTS).doc(entity.tenantId).collection(STORAGE_COLLECTION.ENTITIES).doc(entity.entityId), resolveStoredEntity(SYNTHETIC_NETWORK, entity));
  }
  // Anything the seed does not hold goes.
  let removed = 0;
  for (const tenant of await db.collection(STORAGE_COLLECTION.TENANTS).listDocuments()) {
    for (const entity of await tenant.collection(STORAGE_COLLECTION.ENTITIES).listDocuments()) {
      if (!entityPaths.has(entity.path)) {
        batch.delete(entity);
        removed += 1;
      }
    }
    if (!tenantIds.has(tenant.id)) {
      batch.delete(tenant);
      removed += 1;
    }
  }
  await batch.commit();
  console.log(`Records: ${SYNTHETIC_NETWORK.tenants.length} tenants and ${SYNTHETIC_NETWORK.entities.length} cohorts written, ${removed} others removed.`);
}

async function seedAccounts(): Promise<void> {
  for (const signIn of NETWORK_SIGN_INS) {
    const actor = SYNTHETIC_NETWORK.actors.find((candidate) => candidate.actorId === signIn.actorId);
    const profile = { email: signIn.email, password: signIn.password, displayName: actor?.name ?? signIn.email, emailVerified: true, disabled: false };
    const exists = await auth.getUser(signIn.actorId).then(
      () => true,
      () => false,
    );
    if (exists) await auth.updateUser(signIn.actorId, profile);
    else await auth.createUser({ uid: signIn.actorId, ...profile });
    const claims = resolveTokenClaims(PROGRAM_CONFIGURATION.accessPolicy, SYNTHETIC_NETWORK, signIn.actorId);
    await auth.setCustomUserClaims(signIn.actorId, { roles: [...claims.roles], tenantScopes: [...claims.tenantScopes], entityScopes: [...claims.entityScopes] });
  }
  // Visitors' anonymous accounts and anything else the seed does not hold go.
  const keep = new Set<string>(NETWORK_SIGN_INS.map((signIn) => signIn.actorId));
  const others: string[] = [];
  for (let page = await auth.listUsers(1000); ; ) {
    others.push(...page.users.filter((user) => !keep.has(user.uid)).map((user) => user.uid));
    if (!page.pageToken) break;
    page = await auth.listUsers(1000, page.pageToken);
  }
  if (others.length > 0) await auth.deleteUsers(others);
  console.log(`Accounts: ${NETWORK_SIGN_INS.length} demo accounts set with their claims, ${others.length} others removed.`);
}

seedRecords()
  .then(seedAccounts)
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
