import { FACTOR_KIND, FACTOR_STATUS, VERIFICATION_OUTCOME, VERIFICATION_PURPOSE } from '@penji-demos/constants';
import {
  AttemptRecord,
  FactorAccount,
  FactorEnrollment,
  FactorPolicyDefinition,
  RecoveryCodeVerification,
  StepCheck,
  TotpVerification,
  UnixSeconds,
  VerificationOutcome,
  VerificationPurpose,
  VerificationResult,
  toUnixSeconds,
} from '@penji-demos/types';
import { decodeBase32, encodeBase32 } from './base32';
import { calculateTimeStep, calculateTotpForStep, isSameCode } from './one-time-password';
import { resolveOtpauthUri } from './otpauth-uri';
import { calculateRecoveryByteCount, calculateRecoveryCodeHash, isRecoveryCodeKey, resolveRecoveryCodeKey, resolveRecoveryCodes } from './recovery-codes';

// Setting up a factor and checking codes against it.  Every function takes the
// account as it stands and returns the account as it stands after, so the
// caller decides where it is kept.

const NO_ATTEMPTS: AttemptRecord = { failedAttempts: 0, lockedUntil: null };

export const isLockedOut = (account: FactorAccount, at: UnixSeconds): boolean => account.attempts.lockedUntil !== null && at < account.attempts.lockedUntil;

export const calculateAttemptsRemaining = (policy: FactorPolicyDefinition, attempts: AttemptRecord): number =>
  Math.max(0, policy.attempts.maxFailedAttempts - attempts.failedAttempts);

export const calculateCodesRemaining = (account: FactorAccount): number => account.recoveryCodes.filter((code) => code.usedAt === null).length;

// A lockout that has run out is cleared before the next check counts.
const resolveCurrentAttempts = (account: FactorAccount, at: UnixSeconds): AttemptRecord =>
  account.attempts.lockedUntil !== null && at >= account.attempts.lockedUntil ? NO_ATTEMPTS : account.attempts;

function resolveFailedAttempts(policy: FactorPolicyDefinition, attempts: AttemptRecord, at: UnixSeconds): AttemptRecord {
  const failedAttempts = attempts.failedAttempts + 1;
  const lockedUntil = failedAttempts >= policy.attempts.maxFailedAttempts ? toUnixSeconds(at + policy.attempts.lockoutSeconds) : null;
  return { failedAttempts, lockedUntil };
}

// The attempts after an outcome: an accepted code clears them, a wrong or
// replayed code counts against them, and a malformed one is a typo and does not count.
function resolveAttemptsAfter(policy: FactorPolicyDefinition, attempts: AttemptRecord, outcome: VerificationOutcome, at: UnixSeconds): AttemptRecord {
  if (outcome === VERIFICATION_OUTCOME.ACCEPTED) return NO_ATTEMPTS;
  if (outcome === VERIFICATION_OUTCOME.WRONG_CODE || outcome === VERIFICATION_OUTCOME.REPLAYED) return resolveFailedAttempts(policy, attempts, at);
  return attempts;
}

const attemptFields = (policy: FactorPolicyDefinition, attempts: AttemptRecord) => ({
  failedAttempts: attempts.failedAttempts,
  attemptsRemaining: calculateAttemptsRemaining(policy, attempts),
  lockedUntil: attempts.lockedUntil,
});

// Starts a TOTP factor and a set of recovery codes for an account.  The random
// bytes come from the caller: crypto.getRandomValues on a server or in a browser.
export async function resolveEnrollment(
  policy: FactorPolicyDefinition,
  accountName: string,
  secretBytes: Uint8Array,
  recoveryBytes: Uint8Array,
  at: UnixSeconds,
): Promise<FactorEnrollment> {
  if (secretBytes.length !== policy.totp.secretBytes) throw new Error(`The policy's secret is ${policy.totp.secretBytes} bytes.`);
  if (recoveryBytes.length !== calculateRecoveryByteCount(policy.recoveryCode)) throw new Error(`Recovery codes need ${calculateRecoveryByteCount(policy.recoveryCode)} random bytes.`);
  const secret = encodeBase32(secretBytes);
  const recoveryCodes = policy.factors.includes(FACTOR_KIND.RECOVERY_CODE) ? resolveRecoveryCodes(policy.recoveryCode, recoveryBytes) : [];
  const hashes = await Promise.all(recoveryCodes.map((code) => calculateRecoveryCodeHash(resolveRecoveryCodeKey(code))));
  return {
    account: {
      accountName,
      totp: { secret, status: FACTOR_STATUS.PENDING, enrolledAt: at, confirmedAt: null, lastAcceptedStep: null },
      recoveryCodes: hashes.map((hash) => ({ hash, usedAt: null })),
      attempts: NO_ATTEMPTS,
    },
    secret,
    otpauthUri: resolveOtpauthUri(policy.totp, accountName, secret),
    recoveryCodes,
  };
}

// Checks a code from an authenticator app.  The code is compared with the
// current time step and the policy's drift either side; a match from a step at
// or before the last accepted one is a replay.  Setup is confirmed by the first
// accepted code, and sign-in takes only a confirmed factor.
export async function evaluateTotpCode(
  policy: FactorPolicyDefinition,
  account: FactorAccount,
  code: string,
  at: UnixSeconds,
  purpose: VerificationPurpose,
): Promise<VerificationResult<TotpVerification>> {
  const attempts = resolveCurrentAttempts(account, at);
  const currentStep = calculateTimeStep(policy.totp, at);
  const conclude = (outcome: VerificationOutcome, checks: readonly StepCheck[], matchedStep: number | null, after: FactorAccount): VerificationResult<TotpVerification> => {
    const attemptsAfter = isLockedOut(account, at) ? attempts : resolveAttemptsAfter(policy, attempts, outcome, at);
    const accountAfter = { ...after, attempts: attemptsAfter };
    return {
      verification: { factor: FACTOR_KIND.TOTP, purpose, outcome, at, currentStep, checks, matchedStep, ...attemptFields(policy, attemptsAfter) },
      account: accountAfter,
    };
  };

  if (isLockedOut(account, at)) return conclude(VERIFICATION_OUTCOME.LOCKED_OUT, [], null, account);
  const factor = account.totp;
  const expectedStatus = purpose === VERIFICATION_PURPOSE.ENROLLMENT ? FACTOR_STATUS.PENDING : FACTOR_STATUS.ACTIVE;
  if (!factor || factor.status !== expectedStatus) return conclude(VERIFICATION_OUTCOME.NOT_ENROLLED, [], null, account);

  const given = code.replace(/\s/g, '');
  if (given.length !== policy.totp.digits || !/^\d+$/.test(given)) return conclude(VERIFICATION_OUTCOME.MALFORMED, [], null, account);

  const secret = decodeBase32(factor.secret);
  if (!secret) throw new Error('The stored secret is not base 32.');
  const steps = Array.from({ length: policy.totp.driftSteps * 2 + 1 }, (_, index) => currentStep - policy.totp.driftSteps + index).filter((step) => step >= 0);
  const expected = await Promise.all(steps.map((step) => calculateTotpForStep(policy.totp, secret, step)));
  const checks: readonly StepCheck[] = steps.map((step, index) => ({
    step,
    offset: step - currentStep,
    matched: isSameCode(expected[index] ?? '', given),
    spent: factor.lastAcceptedStep !== null && step <= factor.lastAcceptedStep,
  }));

  const fresh = checks.find((check) => check.matched && !check.spent);
  if (fresh) {
    const confirmed = purpose === VERIFICATION_PURPOSE.ENROLLMENT ? { status: FACTOR_STATUS.ACTIVE, confirmedAt: at } : {};
    return conclude(VERIFICATION_OUTCOME.ACCEPTED, checks, fresh.step, { ...account, totp: { ...factor, ...confirmed, lastAcceptedStep: fresh.step } });
  }
  const replayed = checks.find((check) => check.matched);
  if (replayed) return conclude(VERIFICATION_OUTCOME.REPLAYED, checks, replayed.step, account);
  return conclude(VERIFICATION_OUTCOME.WRONG_CODE, checks, null, account);
}

// Checks a recovery code.  Each code signs in once; a spent code is a replay.
// Recovery codes share the account's attempt count with the authenticator.
export async function evaluateRecoveryCode(
  policy: FactorPolicyDefinition,
  account: FactorAccount,
  code: string,
  at: UnixSeconds,
): Promise<VerificationResult<RecoveryCodeVerification>> {
  const attempts = resolveCurrentAttempts(account, at);
  const conclude = (outcome: VerificationOutcome, after: FactorAccount): VerificationResult<RecoveryCodeVerification> => {
    const attemptsAfter = isLockedOut(account, at) ? attempts : resolveAttemptsAfter(policy, attempts, outcome, at);
    const accountAfter = { ...after, attempts: attemptsAfter };
    return {
      verification: {
        factor: FACTOR_KIND.RECOVERY_CODE,
        purpose: VERIFICATION_PURPOSE.SIGN_IN,
        outcome,
        at,
        codesRemaining: calculateCodesRemaining(accountAfter),
        ...attemptFields(policy, attemptsAfter),
      },
      account: accountAfter,
    };
  };

  if (isLockedOut(account, at)) return conclude(VERIFICATION_OUTCOME.LOCKED_OUT, account);
  if (!policy.factors.includes(FACTOR_KIND.RECOVERY_CODE) || account.totp?.status !== FACTOR_STATUS.ACTIVE) return conclude(VERIFICATION_OUTCOME.NOT_ENROLLED, account);
  const key = resolveRecoveryCodeKey(code);
  if (!isRecoveryCodeKey(policy.recoveryCode, key)) return conclude(VERIFICATION_OUTCOME.MALFORMED, account);

  const hash = await calculateRecoveryCodeHash(key);
  const index = account.recoveryCodes.findIndex((stored) => isSameCode(stored.hash, hash));
  const stored = account.recoveryCodes[index];
  if (!stored) return conclude(VERIFICATION_OUTCOME.WRONG_CODE, account);
  if (stored.usedAt !== null) return conclude(VERIFICATION_OUTCOME.REPLAYED, account);
  const recoveryCodes = account.recoveryCodes.map((record, position) => (position === index ? { ...record, usedAt: at } : record));
  return conclude(VERIFICATION_OUTCOME.ACCEPTED, { ...account, recoveryCodes });
}
