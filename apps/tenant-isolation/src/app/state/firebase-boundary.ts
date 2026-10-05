import { STORAGE_COLLECTION, STORAGE_OPERATION, STORED_FIELD, TOKEN_CLAIM } from '@penji-demos/constants';
import { StorageRequest, TokenClaims, toEntityId, toTenantId } from '@penji-demos/types';
import { FirebaseError, FirebaseOptions } from 'firebase/app';
import { Firestore, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { Observable, catchError, from, map, of } from 'rxjs';

// The page's one boundary with Firebase: the project it talks to, the claims
// read off a sign-in token, and each request sent the way a staff member's
// browser would send it.  Firebase's promises become observables here.

// The demo project.  A web API key is public by design; this one only works
// from seanrodriguez.dev and localhost, and only for sign-in and Firestore.
export const FIREBASE_OPTIONS: FirebaseOptions = {
  apiKey: 'AIzaSyDFW2HV6vJZTU54WEfLUHsS4Hhppd4DXAk',
  authDomain: 'penji-demos-tenants.firebaseapp.com',
  projectId: 'penji-demos-tenants',
  appId: '1:829543972977:web:009e38d360e5fd71ba9bd0',
};

const readIds = (value: unknown): readonly string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

export const resolveTokenClaims = (claims: Readonly<Record<string, unknown>>): TokenClaims => ({
  roles: readIds(claims[TOKEN_CLAIM.ROLES]),
  tenantScopes: readIds(claims[TOKEN_CLAIM.TENANT_SCOPES]).map(toTenantId),
  entityScopes: readIds(claims[TOKEN_CLAIM.ENTITY_SCOPES]).map(toEntityId),
});

export interface SentRequest {
  readonly allowed: boolean;
  // What came back: the records read, or the error code.
  readonly returned: readonly string[];
  readonly errorCode: string | null;
}

const PERMISSION_DENIED = 'permission-denied';

// A record's code, read by its field path inside the record's values.
const readCode = (snapshot: { get: (path: string) => unknown }, field: string): readonly string[] => {
  const code = snapshot.get(`${STORED_FIELD.VALUES}.${field}`);
  return typeof code === 'string' ? [code] : [];
};

export function sendStorageRequest(db: Firestore, request: StorageRequest, codeField: string): Observable<SentRequest> {
  const entities = collection(db, STORAGE_COLLECTION.TENANTS, request.tenantId, STORAGE_COLLECTION.ENTITIES);
  const sent: Observable<readonly string[]> = (() => {
    switch (request.operation) {
      case STORAGE_OPERATION.LIST:
        return from(getDocs(entities)).pipe(map((snapshot) => snapshot.docs.flatMap((entry) => readCode(entry, codeField))));
      case STORAGE_OPERATION.GET:
        return from(getDoc(doc(entities, request.entityId))).pipe(map((snapshot) => readCode(snapshot, codeField)));
      case STORAGE_OPERATION.UPDATE: {
        const changes = Object.fromEntries([...Object.entries(request.values).map(([key, value]) => [`${STORED_FIELD.VALUES}.${key}`, value]), ...Object.entries(request.otherFields)]);
        return from(updateDoc(doc(entities, request.entityId), changes)).pipe(map((): readonly string[] => []));
      }
    }
  })();
  return sent.pipe(
    map((returned): SentRequest => ({ allowed: true, returned, errorCode: null })),
    catchError((error: unknown) => of<SentRequest>({ allowed: false, returned: [], errorCode: error instanceof FirebaseError ? error.code : 'unknown' })),
  );
}

export const isPermissionDenied = (sent: SentRequest): boolean => sent.errorCode === PERMISSION_DENIED;
