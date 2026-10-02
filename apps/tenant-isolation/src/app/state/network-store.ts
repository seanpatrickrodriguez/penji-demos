import { Injectable, signal } from '@angular/core';
import { COHORT_FIELD } from '@penji-demos/constants';
import { NETWORK_REQUESTS, NETWORK_SIGN_INS } from '@penji-demos/dprp-seed';
import { ActorId, DemoSignIn, TokenClaims } from '@penji-demos/types';
import { initializeApp } from 'firebase/app';
import { User, inMemoryPersistence, initializeAuth, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Observable, Subject, catchError, concat, defer, from, map, of, switchMap, tap } from 'rxjs';
import { FIREBASE_OPTIONS, SentRequest, resolveTokenClaims, sendStorageRequest } from './firebase-boundary';

// Who the visitor signs in as: one of the network's staff, a person signed
// in with no staff record, or nobody.
export type Visitor =
  | { readonly kind: 'staff'; readonly key: string; readonly actorId: ActorId; readonly signIn: DemoSignIn }
  | { readonly kind: 'anonymous'; readonly key: string }
  | { readonly kind: 'signedOut'; readonly key: string };

export const VISITORS: readonly Visitor[] = [
  ...NETWORK_SIGN_INS.map((signIn): Visitor => ({ kind: 'staff', key: signIn.actorId, actorId: signIn.actorId, signIn })),
  { kind: 'anonymous', key: 'anonymous' },
  { kind: 'signedOut', key: 'signed-out' },
];

export interface NetworkRun {
  readonly visitorKey: string;
  // The claims the live sign-in token carried, or null when nobody signed in.
  readonly claims: TokenClaims | null;
  readonly signedIn: boolean;
  readonly outcomes: ReadonlyMap<string, SentRequest>;
  readonly finished: boolean;
  readonly signInError: string | null;
}

type RunEvent =
  | { readonly kind: 'signedIn'; readonly claims: TokenClaims | null }
  | { readonly kind: 'answered'; readonly id: string; readonly sent: SentRequest }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'finished' };

// The page's state: who is chosen, and what the live project answered when
// the page signed in as them and sent every request.  Every Firebase call is
// an observable from the boundary; the views read the signals.
@Injectable({ providedIn: 'root' })
export class NetworkStore {
  private readonly app = initializeApp(FIREBASE_OPTIONS);
  // Kept in memory only: nothing about the sign-in is stored in the browser.
  private readonly auth = initializeAuth(this.app, { persistence: inMemoryPersistence });
  private readonly db = getFirestore(this.app);
  private readonly runs = new Subject<Visitor>();

  readonly visitorKey = signal(VISITORS[0]?.key ?? '');
  readonly run = signal<NetworkRun | null>(null);
  readonly busy = signal(false);

  constructor() {
    this.runs.pipe(switchMap((visitor) => this.runFor(visitor))).subscribe((event) => this.record(event));
  }

  choose(key: string): void {
    this.visitorKey.set(key);
  }

  send(): void {
    const visitor = VISITORS.find((candidate) => candidate.key === this.visitorKey());
    if (!visitor || this.busy()) return;
    this.busy.set(true);
    this.run.set({ visitorKey: visitor.key, claims: null, signedIn: false, outcomes: new Map(), finished: false, signInError: null });
    this.runs.next(visitor);
  }

  private signIn(visitor: Visitor): Observable<User | null> {
    switch (visitor.kind) {
      case 'staff':
        return from(signInWithEmailAndPassword(this.auth, visitor.signIn.email, visitor.signIn.password)).pipe(map((credential) => credential.user));
      case 'anonymous':
        return from(signInAnonymously(this.auth)).pipe(map((credential) => credential.user));
      case 'signedOut':
        return of(null);
    }
  }

  private runFor(visitor: Visitor): Observable<RunEvent> {
    const requests = NETWORK_REQUESTS.map(({ id, request }) =>
      defer(() => sendStorageRequest(this.db, request, COHORT_FIELD.CODE)).pipe(map((sent): RunEvent => ({ kind: 'answered', id, sent }))),
    );
    return from(signOut(this.auth)).pipe(
      switchMap(() => this.signIn(visitor)),
      switchMap((user) => (user ? from(user.getIdTokenResult(true)).pipe(map((token) => resolveTokenClaims(token.claims))) : of(null))),
      switchMap((claims) => concat(of<RunEvent>({ kind: 'signedIn', claims }), ...requests, of<RunEvent>({ kind: 'finished' }))),
      catchError(() => of<RunEvent>({ kind: 'failed', message: 'The sign-in did not go through.  Check the connection and send again.' })),
      tap({ finalize: () => this.busy.set(false) }),
    );
  }

  private record(event: RunEvent): void {
    this.run.update((run) => {
      if (!run) return run;
      switch (event.kind) {
        case 'signedIn':
          return { ...run, claims: event.claims, signedIn: true };
        case 'answered':
          return { ...run, outcomes: new Map([...run.outcomes, [event.id, event.sent]]) };
        case 'failed':
          return { ...run, finished: true, signInError: event.message };
        case 'finished':
          return { ...run, finished: true };
      }
    });
  }
}
