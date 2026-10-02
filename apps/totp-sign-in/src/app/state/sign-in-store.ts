import { Injectable, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FACTOR_STATUS, VERIFICATION_OUTCOME, VERIFICATION_PURPOSE } from '@penji-demos/constants';
import {
  calculateRecoveryByteCount,
  calculateSecondsRemaining,
  calculateTimeStep,
  calculateTotpForStep,
  decodeBase32,
  evaluateRecoveryCode,
  evaluateTotpCode,
  isLockedOut,
  resolveEnrollment,
} from '@penji-demos/factor-engine';
import { SIGN_IN_POLICY } from '@penji-demos/sign-in-configuration';
import { FactorAccount, FactorVerification, UnixSeconds, VerificationResult, toUnixSeconds } from '@penji-demos/types';
import { distinctUntilChanged, from, interval, map, of, switchMap } from 'rxjs';

// The policy this page runs, and the made-up account it signs in.
export const POLICY = SIGN_IN_POLICY;
export const ACCOUNT_NAME = 'demo.coordinator@example.org';

const TICK_MILLISECONDS = 1000;
const MILLISECONDS_PER_SECOND = 1000;

// The clock is the page's one read of the outside world.
const readNow = (): UnixSeconds => toUnixSeconds(Date.now() / MILLISECONDS_PER_SECOND);

const randomBytes = (length: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(length));

export const PAGE_STEP = {
  SET_UP: 'setUp',
  CONFIRM: 'confirm',
  SAVE_CODES: 'saveCodes',
  SIGN_IN: 'signIn',
  SIGNED_IN: 'signedIn',
} as const;
export type PageStep = (typeof PAGE_STEP)[keyof typeof PAGE_STEP];

// The page plays both sides: the server, which keeps the account and checks
// codes, and the visitor's authenticator app, which holds the same secret.  All
// state lives here as signals; the factor engine does every check.
@Injectable({ providedIn: 'root' })
export class SignInStore {
  readonly now = toSignal(interval(TICK_MILLISECONDS).pipe(map(readNow)), { initialValue: readNow() });

  // What the server keeps.
  readonly account = signal<FactorAccount | null>(null);
  readonly verifications = signal<readonly FactorVerification[]>([]);
  readonly signedIn = signal(false);

  // What setup hands the visitor once: the secret and link for the app, and the recovery codes.
  readonly setupSecret = signal<string | null>(null);
  readonly otpauthUri = signal<string | null>(null);
  readonly recoveryCodes = signal<readonly string[] | null>(null);

  // The built-in authenticator: the secret it was given, and how far its clock is off.
  readonly authenticatorSecret = signal<string | null>(null);
  readonly clockOffsetSeconds = signal(0);

  // What the visitor has typed.
  readonly codeEntry = signal('');
  readonly recoveryEntry = signal('');
  readonly busy = signal(false);

  readonly step = computed<PageStep>(() => {
    const account = this.account();
    if (!account?.totp) return PAGE_STEP.SET_UP;
    if (account.totp.status === FACTOR_STATUS.PENDING) return PAGE_STEP.CONFIRM;
    if (this.recoveryCodes() !== null) return PAGE_STEP.SAVE_CODES;
    return this.signedIn() ? PAGE_STEP.SIGNED_IN : PAGE_STEP.SIGN_IN;
  });

  readonly latest = computed(() => this.verifications()[0] ?? null);
  readonly lockedOut = computed(() => {
    const account = this.account();
    return account !== null && isLockedOut(account, this.now());
  });

  readonly authenticatorTime = computed(() => toUnixSeconds(this.now() + this.clockOffsetSeconds()));
  readonly authenticatorStep = computed(() => calculateTimeStep(POLICY.totp, this.authenticatorTime()));
  readonly authenticatorSecondsLeft = computed(() => calculateSecondsRemaining(POLICY.totp, this.authenticatorTime()));
  // Whether the account has already accepted a code from the authenticator's current step, so its code is spent.
  readonly authenticatorCodeSpent = computed(() => {
    const lastAccepted = this.account()?.totp?.lastAcceptedStep ?? null;
    return lastAccepted !== null && this.authenticatorStep() <= lastAccepted;
  });

  // The app's current code, worked out again only when the secret or the time step changes.
  readonly authenticatorCode = toSignal(
    toObservable(computed(() => ({ secret: this.authenticatorSecret(), step: this.authenticatorStep() }))).pipe(
      distinctUntilChanged((before, after) => before.secret === after.secret && before.step === after.step),
      switchMap(({ secret, step }) => {
        const bytes = secret === null ? null : decodeBase32(secret);
        return bytes === null ? of(null) : from(calculateTotpForStep(POLICY.totp, bytes, step));
      }),
    ),
    { initialValue: null },
  );

  startSetup(): void {
    this.busy.set(true);
    from(resolveEnrollment(POLICY, ACCOUNT_NAME, randomBytes(POLICY.totp.secretBytes), randomBytes(calculateRecoveryByteCount(POLICY.recoveryCode)), this.now())).subscribe((enrollment) => {
      this.account.set(enrollment.account);
      this.setupSecret.set(enrollment.secret);
      this.otpauthUri.set(enrollment.otpauthUri);
      this.recoveryCodes.set(enrollment.recoveryCodes);
      this.authenticatorSecret.set(enrollment.secret);
      this.verifications.set([]);
      this.codeEntry.set('');
      this.busy.set(false);
    });
  }

  confirmSetup(): void {
    this.checkCode((account) => evaluateTotpCode(POLICY, account, this.codeEntry(), this.now(), VERIFICATION_PURPOSE.ENROLLMENT));
  }

  signInWithCode(): void {
    this.checkCode((account) => evaluateTotpCode(POLICY, account, this.codeEntry(), this.now(), VERIFICATION_PURPOSE.SIGN_IN));
  }

  signInWithRecoveryCode(): void {
    this.checkCode((account) => evaluateRecoveryCode(POLICY, account, this.recoveryEntry(), this.now()));
  }

  // Once the visitor has saved them, the codes are gone from the page for good.
  finishSavingCodes(): void {
    this.recoveryCodes.set(null);
    this.setupSecret.set(null);
    this.otpauthUri.set(null);
    this.codeEntry.set('');
  }

  useAuthenticatorCode(): void {
    this.codeEntry.set(this.authenticatorCode() ?? '');
  }

  signOut(): void {
    this.signedIn.set(false);
    this.codeEntry.set('');
    this.recoveryEntry.set('');
  }

  reset(): void {
    this.account.set(null);
    this.verifications.set([]);
    this.signedIn.set(false);
    this.finishSavingCodes();
    this.authenticatorSecret.set(null);
    this.clockOffsetSeconds.set(0);
    this.recoveryEntry.set('');
  }

  private checkCode(check: (account: FactorAccount) => Promise<VerificationResult<FactorVerification>>): void {
    const account = this.account();
    if (!account || this.busy()) return;
    this.busy.set(true);
    from(check(account)).subscribe(({ verification, account: after }) => {
      this.account.set(after);
      this.verifications.update((list) => [verification, ...list]);
      if (verification.outcome === VERIFICATION_OUTCOME.ACCEPTED) {
        this.codeEntry.set('');
        this.recoveryEntry.set('');
        if (verification.purpose === VERIFICATION_PURPOSE.SIGN_IN) this.signedIn.set(true);
      }
      this.busy.set(false);
    });
  }
}
