import { DEFINITION_KIND, FACTOR_KIND, FACTOR_STATUS, HMAC_ALGORITHM, VERIFICATION_OUTCOME, VERIFICATION_PURPOSE } from '@penji-demos/constants';
import { FactorAccount, FactorPolicyDefinition, HmacAlgorithm, UnixSeconds, toDefinitionId, toUnixSeconds } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { decodeBase32, encodeBase32 } from './base32';
import { calculateRecoveryByteCount, resolveRecoveryCodeKey } from './recovery-codes';
import { evaluateRecoveryCode, evaluateTotpCode, isLockedOut, resolveEnrollment } from './evaluate-factors';
import { calculateHotp, calculateSecondsRemaining, calculateTimeStep, calculateTotp, isSameCode } from './one-time-password';
import { resolveOtpauthUri } from './otpauth-uri';
import { validateFactorPolicy } from './validate-factor-policy';

const ascii = (text: string): Uint8Array<ArrayBuffer> => new Uint8Array(new TextEncoder().encode(text));
const at = (seconds: number): UnixSeconds => toUnixSeconds(seconds);

// A made-up policy for a made-up product; the engine reads only what it says.
const POLICY: FactorPolicyDefinition = {
  kind: DEFINITION_KIND.FACTOR_POLICY,
  id: toDefinitionId('test-policy'),
  version: '1',
  title: 'Test policy',
  source: { title: 'RFC 6238', url: 'https://www.rfc-editor.org/rfc/rfc6238' },
  factors: [FACTOR_KIND.TOTP, FACTOR_KIND.RECOVERY_CODE],
  totp: { algorithm: HMAC_ALGORITHM.SHA1, digits: 6, periodSeconds: 30, driftSteps: 1, secretBytes: 20, issuer: 'Lighthouse Library' },
  recoveryCode: { count: 4, groupCount: 2, groupLength: 5 },
  attempts: { maxFailedAttempts: 3, lockoutSeconds: 60 },
  interpretations: [],
};

describe('base 32 (RFC 4648 section 10)', () => {
  const vectors: readonly (readonly [string, string])[] = [
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ];
  it.each(vectors)('encodes %j as %s and reads it back', (text, encoded) => {
    expect(encodeBase32(ascii(text))).toBe(encoded);
    expect(new TextDecoder().decode(decodeBase32(`${encoded.toLowerCase()}======`) ?? new Uint8Array())).toBe(text);
  });

  it('refuses characters base 32 does not use', () => {
    expect(decodeBase32('MZXW1')).toBeNull();
  });
});

describe('HOTP (RFC 4226 appendix D)', () => {
  const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
  it.each(expected.map((code, counter) => [counter, code] as const))('counter %i gives %s', async (counter, code) => {
    expect(await calculateHotp(ascii('12345678901234567890'), counter, 6, HMAC_ALGORITHM.SHA1)).toBe(code);
  });
});

describe('TOTP (RFC 6238 appendix B)', () => {
  const SEEDS: Readonly<Record<HmacAlgorithm, string>> = {
    [HMAC_ALGORITHM.SHA1]: '12345678901234567890',
    [HMAC_ALGORITHM.SHA256]: '12345678901234567890123456789012',
    [HMAC_ALGORITHM.SHA512]: '1234567890123456789012345678901234567890123456789012345678901234',
  };
  const vectors: readonly (readonly [number, HmacAlgorithm, string])[] = [
    [59, HMAC_ALGORITHM.SHA1, '94287082'],
    [59, HMAC_ALGORITHM.SHA256, '46119246'],
    [59, HMAC_ALGORITHM.SHA512, '90693936'],
    [1111111109, HMAC_ALGORITHM.SHA1, '07081804'],
    [1111111109, HMAC_ALGORITHM.SHA256, '68084774'],
    [1111111109, HMAC_ALGORITHM.SHA512, '25091201'],
    [1111111111, HMAC_ALGORITHM.SHA1, '14050471'],
    [1111111111, HMAC_ALGORITHM.SHA256, '67062674'],
    [1111111111, HMAC_ALGORITHM.SHA512, '99943326'],
    [1234567890, HMAC_ALGORITHM.SHA1, '89005924'],
    [1234567890, HMAC_ALGORITHM.SHA256, '91819424'],
    [1234567890, HMAC_ALGORITHM.SHA512, '93441116'],
    [2000000000, HMAC_ALGORITHM.SHA1, '69279037'],
    [2000000000, HMAC_ALGORITHM.SHA256, '90698825'],
    [2000000000, HMAC_ALGORITHM.SHA512, '38618901'],
    [20000000000, HMAC_ALGORITHM.SHA1, '65353130'],
    [20000000000, HMAC_ALGORITHM.SHA256, '77737706'],
    [20000000000, HMAC_ALGORITHM.SHA512, '47863826'],
  ];
  it.each(vectors)('at %i with %s gives %s', async (seconds, algorithm, code) => {
    const policy = { ...POLICY.totp, algorithm, digits: 8 };
    expect(await calculateTotp(policy, ascii(SEEDS[algorithm]), at(seconds))).toBe(code);
  });

  it('counts time steps and the seconds left in one', () => {
    expect(calculateTimeStep(POLICY.totp, at(59))).toBe(1);
    expect(calculateSecondsRemaining(POLICY.totp, at(59))).toBe(1);
    expect(calculateSecondsRemaining(POLICY.totp, at(60))).toBe(30);
  });

  it('compares codes whole', () => {
    expect(isSameCode('123456', '123456')).toBe(true);
    expect(isSameCode('123456', '123457')).toBe(false);
    expect(isSameCode('123456', '12345')).toBe(false);
    expect(isSameCode('123456', '')).toBe(false);
  });
});

describe('the otpauth URI', () => {
  it('carries the secret and the policy, with spaces escaped', () => {
    expect(resolveOtpauthUri(POLICY.totp, 'ana@example.org', 'JBSWY3DPEHPK3PXP')).toBe(
      'otpauth://totp/Lighthouse%20Library:ana%40example.org?secret=JBSWY3DPEHPK3PXP&issuer=Lighthouse%20Library&algorithm=SHA1&digits=6&period=30',
    );
  });
});

// Setup with fixed bytes, so every test knows the secret and the codes.
const SECRET_BYTES = ascii('12345678901234567890');
const RECOVERY_BYTES = Uint8Array.from({ length: calculateRecoveryByteCount(POLICY.recoveryCode) }, (_, index) => index * 7);
const START = at(1_000_000_020);

async function enroll() {
  return resolveEnrollment(POLICY, 'ana@example.org', SECRET_BYTES, RECOVERY_BYTES, START);
}

async function enrolledAndConfirmed(): Promise<FactorAccount> {
  const enrollment = await enroll();
  const code = await calculateTotp(POLICY.totp, SECRET_BYTES, START);
  return (await evaluateTotpCode(POLICY, enrollment.account, code, START, VERIFICATION_PURPOSE.ENROLLMENT)).account;
}

describe('setting up a factor', () => {
  it('hands over the secret and recovery codes once and keeps only hashes', async () => {
    const enrollment = await enroll();
    expect(enrollment.secret).toBe(encodeBase32(SECRET_BYTES));
    expect(enrollment.recoveryCodes).toHaveLength(POLICY.recoveryCode.count);
    expect(enrollment.recoveryCodes[0]).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(enrollment.account.recoveryCodes.map((code) => code.hash)).not.toContain(enrollment.recoveryCodes[0]);
    expect(enrollment.account.recoveryCodes.every((code) => /^[0-9a-f]{64}$/.test(code.hash))).toBe(true);
    expect(enrollment.account.totp?.status).toBe(FACTOR_STATUS.PENDING);
  });

  it('refuses the wrong number of random bytes', async () => {
    await expect(resolveEnrollment(POLICY, 'ana', SECRET_BYTES.subarray(1), RECOVERY_BYTES, START)).rejects.toThrow();
  });

  it('is confirmed by the first good code, and sign-in waits for that', async () => {
    const enrollment = await enroll();
    const code = await calculateTotp(POLICY.totp, SECRET_BYTES, START);
    const early = await evaluateTotpCode(POLICY, enrollment.account, code, START, VERIFICATION_PURPOSE.SIGN_IN);
    expect(early.verification.outcome).toBe(VERIFICATION_OUTCOME.NOT_ENROLLED);
    const confirmed = await evaluateTotpCode(POLICY, enrollment.account, code, START, VERIFICATION_PURPOSE.ENROLLMENT);
    expect(confirmed.verification.outcome).toBe(VERIFICATION_OUTCOME.ACCEPTED);
    expect(confirmed.account.totp?.status).toBe(FACTOR_STATUS.ACTIVE);
    expect(confirmed.account.totp?.confirmedAt).toBe(START);
  });
});

describe('signing in with an authenticator code', () => {
  it('accepts a code from one step either side and shows which step matched', async () => {
    const account = await enrolledAndConfirmed();
    const later = at(START + 60);
    const previous = await calculateTotp(POLICY.totp, SECRET_BYTES, at(later - 30));
    const result = await evaluateTotpCode(POLICY, account, previous, later, VERIFICATION_PURPOSE.SIGN_IN);
    expect(result.verification.outcome).toBe(VERIFICATION_OUTCOME.ACCEPTED);
    expect(result.verification.checks.map((check) => check.offset)).toEqual([-1, 0, 1]);
    expect(result.verification.matchedStep).toBe(calculateTimeStep(POLICY.totp, later) - 1);
  });

  it('refuses a code from two steps away', async () => {
    const account = await enrolledAndConfirmed();
    const later = at(START + 120);
    const old = await calculateTotp(POLICY.totp, SECRET_BYTES, at(later - 60));
    expect((await evaluateTotpCode(POLICY, account, old, later, VERIFICATION_PURPOSE.SIGN_IN)).verification.outcome).toBe(VERIFICATION_OUTCOME.WRONG_CODE);
  });

  it('refuses the same code twice, and any code from an earlier step', async () => {
    const account = await enrolledAndConfirmed();
    const later = at(START + 60);
    const code = await calculateTotp(POLICY.totp, SECRET_BYTES, later);
    const first = await evaluateTotpCode(POLICY, account, code, later, VERIFICATION_PURPOSE.SIGN_IN);
    expect(first.verification.outcome).toBe(VERIFICATION_OUTCOME.ACCEPTED);
    const again = await evaluateTotpCode(POLICY, first.account, code, at(later + 5), VERIFICATION_PURPOSE.SIGN_IN);
    expect(again.verification.outcome).toBe(VERIFICATION_OUTCOME.REPLAYED);
    expect(again.verification.checks.find((check) => check.matched)?.spent).toBe(true);
    expect(again.verification.failedAttempts).toBe(1);
  });

  it('does not count a malformed code', async () => {
    const account = await enrolledAndConfirmed();
    const result = await evaluateTotpCode(POLICY, account, '12a456', START, VERIFICATION_PURPOSE.SIGN_IN);
    expect(result.verification.outcome).toBe(VERIFICATION_OUTCOME.MALFORMED);
    expect(result.verification.failedAttempts).toBe(0);
  });

  it('locks after the policy’s failed attempts, refuses even a good code, and opens again', async () => {
    let account = await enrolledAndConfirmed();
    const later = at(START + 90);
    for (let attempt = 0; attempt < POLICY.attempts.maxFailedAttempts; attempt += 1) {
      account = (await evaluateTotpCode(POLICY, account, '000000', later, VERIFICATION_PURPOSE.SIGN_IN)).account;
    }
    expect(isLockedOut(account, later)).toBe(true);
    const good = await calculateTotp(POLICY.totp, SECRET_BYTES, later);
    const locked = await evaluateTotpCode(POLICY, account, good, later, VERIFICATION_PURPOSE.SIGN_IN);
    expect(locked.verification.outcome).toBe(VERIFICATION_OUTCOME.LOCKED_OUT);
    expect(locked.verification.checks).toEqual([]);
    const after = at(later + POLICY.attempts.lockoutSeconds);
    const reopened = await evaluateTotpCode(POLICY, account, await calculateTotp(POLICY.totp, SECRET_BYTES, after), after, VERIFICATION_PURPOSE.SIGN_IN);
    expect(reopened.verification.outcome).toBe(VERIFICATION_OUTCOME.ACCEPTED);
    expect(reopened.verification.failedAttempts).toBe(0);
  });
});

describe('signing in with a recovery code', () => {
  it('accepts each code once, however it is typed', async () => {
    const enrollment = await enroll();
    const account = await enrolledAndConfirmed();
    const code = enrollment.recoveryCodes[1] ?? '';
    const typed = code.toLowerCase().replace('-', ' ');
    const first = await evaluateRecoveryCode(POLICY, account, typed, START);
    expect(first.verification.outcome).toBe(VERIFICATION_OUTCOME.ACCEPTED);
    expect(first.verification.codesRemaining).toBe(POLICY.recoveryCode.count - 1);
    const again = await evaluateRecoveryCode(POLICY, first.account, code, START);
    expect(again.verification.outcome).toBe(VERIFICATION_OUTCOME.REPLAYED);
  });

  it('reads I, L and O as Crockford does', () => {
    expect(resolveRecoveryCodeKey('ab1o0-lI2zz')).toBe('AB100112ZZ');
  });

  it('refuses a code it never issued, and one of the wrong shape without counting it', async () => {
    const account = await enrolledAndConfirmed();
    expect((await evaluateRecoveryCode(POLICY, account, 'ZZZZZ-ZZZZZ', START)).verification.outcome).toBe(VERIFICATION_OUTCOME.WRONG_CODE);
    const short = await evaluateRecoveryCode(POLICY, account, 'ZZZZ', START);
    expect(short.verification.outcome).toBe(VERIFICATION_OUTCOME.MALFORMED);
    expect(short.verification.failedAttempts).toBe(0);
  });

  it('is not a way in before setup is confirmed', async () => {
    const enrollment = await enroll();
    expect((await evaluateRecoveryCode(POLICY, enrollment.account, enrollment.recoveryCodes[0] ?? '', START)).verification.outcome).toBe(VERIFICATION_OUTCOME.NOT_ENROLLED);
  });
});

describe('a factor policy', () => {
  it('passes when it is inside the RFCs’ bounds', () => {
    expect(validateFactorPolicy(POLICY)).toEqual([]);
  });

  it('names each problem', () => {
    const problems = validateFactorPolicy({
      ...POLICY,
      factors: [FACTOR_KIND.RECOVERY_CODE],
      totp: { ...POLICY.totp, digits: 4, driftSteps: 3, secretBytes: 10 },
    });
    expect(problems).toHaveLength(4);
  });
});
