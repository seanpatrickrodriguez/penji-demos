import { FACTOR_KIND, FACTOR_STATUS, VERIFICATION_OUTCOME, VERIFICATION_PURPOSE } from '@penji-demos/constants';
import { FactorAccount, FactorKind, FactorPolicyDefinition, FactorVerification, UnixSeconds, VerificationOutcome, VerificationPurpose } from '@penji-demos/types';

// Everything the page says about the factor engine's results, in words.

const MILLISECONDS_PER_SECOND = 1000;
const SECRET_GROUP = 4;
const SHOWN_HASH_CHARACTERS = 16;

export const OUTCOME_LABEL: Readonly<Record<VerificationOutcome, string>> = {
  [VERIFICATION_OUTCOME.ACCEPTED]: 'Accepted',
  [VERIFICATION_OUTCOME.WRONG_CODE]: 'Wrong code',
  [VERIFICATION_OUTCOME.REPLAYED]: 'Already used',
  [VERIFICATION_OUTCOME.LOCKED_OUT]: 'Locked',
  [VERIFICATION_OUTCOME.MALFORMED]: 'Not a code',
  [VERIFICATION_OUTCOME.NOT_ENROLLED]: 'Not set up',
};

// The badge class each outcome takes from the site's styles.
export const OUTCOME_TONE: Readonly<Record<VerificationOutcome, string>> = {
  [VERIFICATION_OUTCOME.ACCEPTED]: 'met',
  [VERIFICATION_OUTCOME.WRONG_CODE]: 'error',
  [VERIFICATION_OUTCOME.REPLAYED]: 'error',
  [VERIFICATION_OUTCOME.LOCKED_OUT]: 'error',
  [VERIFICATION_OUTCOME.MALFORMED]: 'warning',
  [VERIFICATION_OUTCOME.NOT_ENROLLED]: 'warning',
};

export const FACTOR_LABEL: Readonly<Record<FactorKind, string>> = {
  [FACTOR_KIND.TOTP]: 'Authenticator code',
  [FACTOR_KIND.RECOVERY_CODE]: 'Recovery code',
};

export const PURPOSE_LABEL: Readonly<Record<VerificationPurpose, string>> = {
  [VERIFICATION_PURPOSE.ENROLLMENT]: 'Setup',
  [VERIFICATION_PURPOSE.SIGN_IN]: 'Sign-in',
};

const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export const formatTime = (at: UnixSeconds): string => TIME_FORMAT.format(at * MILLISECONDS_PER_SECOND);

export const formatOffset = (offset: number): string => (offset === 0 ? 'current' : offset < 0 ? `${Math.abs(offset)} before` : `${offset} after`);

export const formatSeconds = (seconds: number): string => `${seconds} second${seconds === 1 ? '' : 's'}`;

// A secret in groups of four, the way authenticator apps ask for it to be typed.
export const formatSecret = (secret: string): string => (secret.match(new RegExp(`.{1,${SECRET_GROUP}}`, 'g')) ?? []).join(' ');

export const formatHash = (hash: string): string => `${hash.slice(0, SHOWN_HASH_CHARACTERS)}…`;

// What the person signing in is told after a check.  It says no more than a
// real sign-in page would: never which step matched or how close a guess was.
export function describeVerification(policy: FactorPolicyDefinition, verification: FactorVerification): string {
  const lockout = `Sign-in is locked for ${formatSeconds(policy.attempts.lockoutSeconds)}.`;
  const left = (remaining: number) => (remaining === 0 ? lockout : `${remaining} ${remaining === 1 ? 'try' : 'tries'} left before sign-in locks.`);
  const isRecovery = verification.factor === FACTOR_KIND.RECOVERY_CODE;
  switch (verification.outcome) {
    case VERIFICATION_OUTCOME.ACCEPTED:
      if (verification.purpose === VERIFICATION_PURPOSE.ENROLLMENT) return 'Setup is confirmed.  Your authenticator and the account now share the secret.';
      return verification.factor === FACTOR_KIND.RECOVERY_CODE
        ? `Signed in with a recovery code.  That code is spent; ${verification.codesRemaining} left.`
        : 'Signed in.';
    case VERIFICATION_OUTCOME.WRONG_CODE:
      return `That code does not match.  ${left(verification.attemptsRemaining)}`;
    case VERIFICATION_OUTCOME.REPLAYED:
      return isRecovery
        ? `That recovery code has already been used.  ${left(verification.attemptsRemaining)}`
        : `That code has already been used.  Wait for the next one.  ${left(verification.attemptsRemaining)}`;
    case VERIFICATION_OUTCOME.LOCKED_OUT: {
      const until = verification.lockedUntil;
      return until === null ? lockout : `Sign-in is locked until ${formatTime(until)}.`;
    }
    case VERIFICATION_OUTCOME.MALFORMED:
      return isRecovery
        ? `A recovery code is ${policy.recoveryCode.groupCount} groups of ${policy.recoveryCode.groupLength} letters and numbers.`
        : `Enter the ${policy.totp.digits}-digit code from your authenticator app.`;
    case VERIFICATION_OUTCOME.NOT_ENROLLED:
      return 'Finish setting up the authenticator first.';
  }
}

export interface EvidenceRow {
  readonly key: string;
  readonly time: string;
  readonly purpose: string;
  readonly factor: string;
  readonly outcome: string;
  readonly tone: string;
  readonly currentStep: string;
  readonly window: readonly { readonly label: string; readonly result: string }[];
  readonly matched: string;
  readonly attempts: string;
}

// One row per check, with what the server compared: the time step it was on,
// each step in the drift window and whether the code matched it, and the attempt count.
export function resolveEvidenceRows(policy: FactorPolicyDefinition, verifications: readonly FactorVerification[]): readonly EvidenceRow[] {
  return verifications.map((verification, index) => {
    const isTotp = verification.factor === FACTOR_KIND.TOTP;
    const attempts =
      verification.lockedUntil !== null
        ? `${verification.failedAttempts} of ${policy.attempts.maxFailedAttempts}, locked until ${formatTime(verification.lockedUntil)}`
        : `${verification.failedAttempts} of ${policy.attempts.maxFailedAttempts}`;
    return {
      key: `${verifications.length - index}`,
      time: formatTime(verification.at),
      purpose: PURPOSE_LABEL[verification.purpose],
      factor: FACTOR_LABEL[verification.factor],
      outcome: OUTCOME_LABEL[verification.outcome],
      tone: OUTCOME_TONE[verification.outcome],
      currentStep: isTotp ? String(verification.currentStep) : '—',
      window: isTotp
        ? verification.checks.map((check) => ({
            label: `${check.step} (${formatOffset(check.offset)})`,
            result: check.matched ? (check.spent ? 'matched, already used' : 'matched') : 'no match',
          }))
        : [],
      matched: isTotp ? (verification.matchedStep === null ? 'none' : String(verification.matchedStep)) : `${verification.codesRemaining} codes left`,
      attempts,
    };
  });
}

export interface StoredRecordView {
  readonly status: string;
  readonly enrolled: string;
  readonly confirmed: string;
  readonly lastAcceptedStep: string;
  readonly attempts: string;
  readonly codes: readonly { readonly hash: string; readonly used: string }[];
}

export function resolveStoredRecord(policy: FactorPolicyDefinition, account: FactorAccount, now: UnixSeconds): StoredRecordView {
  const factor = account.totp;
  const { failedAttempts, lockedUntil } = account.attempts;
  return {
    status: factor === null ? 'None' : factor.status === FACTOR_STATUS.ACTIVE ? 'Active' : 'Waiting for the first code',
    enrolled: factor === null ? '—' : formatTime(factor.enrolledAt),
    confirmed: factor?.confirmedAt ? formatTime(factor.confirmedAt) : '—',
    lastAcceptedStep: factor === null || factor.lastAcceptedStep === null ? 'none yet' : String(factor.lastAcceptedStep),
    attempts:
      lockedUntil !== null && now < lockedUntil
        ? `Locked until ${formatTime(lockedUntil)}`
        : `${failedAttempts} failed in a row, of ${policy.attempts.maxFailedAttempts} allowed`,
    codes: account.recoveryCodes.map((code) => ({ hash: formatHash(code.hash), used: code.usedAt === null ? 'unused' : `used at ${formatTime(code.usedAt)}` })),
  };
}
