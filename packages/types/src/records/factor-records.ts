import { FACTOR_KIND, FACTOR_STATUS, VERIFICATION_OUTCOME, VERIFICATION_PURPOSE } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { UnixSeconds } from '../primitives/unix-seconds';

// M0: what is kept for one account's second factors, and what each check of a
// code found.  A server keeps these; the secret never leaves it after setup, and
// recovery codes are kept only as hashes.

export type FactorStatus = ValueOf<typeof FACTOR_STATUS>;
export type VerificationPurpose = ValueOf<typeof VERIFICATION_PURPOSE>;
export type VerificationOutcome = ValueOf<typeof VERIFICATION_OUTCOME>;

export interface TotpFactorRecord {
  // The shared secret, in base 32.
  readonly secret: string;
  readonly status: FactorStatus;
  readonly enrolledAt: UnixSeconds;
  readonly confirmedAt: UnixSeconds | null;
  // The last time step a code was accepted from.  No code from it or an earlier step is accepted again.
  readonly lastAcceptedStep: number | null;
}

export interface RecoveryCodeRecord {
  // SHA-256 of the code, in hex.
  readonly hash: string;
  readonly usedAt: UnixSeconds | null;
}

export interface AttemptRecord {
  readonly failedAttempts: number;
  readonly lockedUntil: UnixSeconds | null;
}

export interface FactorAccount {
  readonly accountName: string;
  readonly totp: TotpFactorRecord | null;
  readonly recoveryCodes: readonly RecoveryCodeRecord[];
  readonly attempts: AttemptRecord;
}

// One time step the check compared the code against.
export interface StepCheck {
  readonly step: number;
  // The step's distance from the current one: -1 is the step before.
  readonly offset: number;
  readonly matched: boolean;
  // Whether the step is at or before the last accepted one, so its code is spent.
  readonly spent: boolean;
}

interface VerificationBase {
  readonly purpose: VerificationPurpose;
  readonly outcome: VerificationOutcome;
  readonly at: UnixSeconds;
  readonly failedAttempts: number;
  readonly attemptsRemaining: number;
  readonly lockedUntil: UnixSeconds | null;
}

export interface TotpVerification extends VerificationBase {
  readonly factor: typeof FACTOR_KIND.TOTP;
  readonly currentStep: number;
  readonly checks: readonly StepCheck[];
  readonly matchedStep: number | null;
}

export interface RecoveryCodeVerification extends VerificationBase {
  readonly factor: typeof FACTOR_KIND.RECOVERY_CODE;
  readonly codesRemaining: number;
}

export type FactorVerification = TotpVerification | RecoveryCodeVerification;

// What a check returns: what it found, and the account as it stands after.
export interface VerificationResult<Verification extends FactorVerification> {
  readonly verification: Verification;
  readonly account: FactorAccount;
}

// What setting up a factor hands the person once: the secret for their app, and
// their recovery codes in the clear.  Only the account is kept.
export interface FactorEnrollment {
  readonly account: FactorAccount;
  readonly secret: string;
  readonly otpauthUri: string;
  readonly recoveryCodes: readonly string[];
}
