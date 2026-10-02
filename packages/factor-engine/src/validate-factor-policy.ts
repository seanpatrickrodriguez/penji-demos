import { FACTOR_KIND, FACTOR_LIMIT, HMAC_ALGORITHM } from '@penji-demos/constants';
import { FactorPolicyDefinition } from '@penji-demos/types';

const isWhole = (value: number, least: number): boolean => Number.isInteger(value) && value >= least;
const KNOWN_FACTORS: readonly string[] = Object.values(FACTOR_KIND);
const KNOWN_ALGORITHMS: readonly string[] = Object.values(HMAC_ALGORITHM);

// Checks a policy against the bounds the RFCs set, before any account uses it.
// Returns each problem in words; an empty list means the policy can be used.
export function validateFactorPolicy(policy: FactorPolicyDefinition): readonly string[] {
  const { totp, recoveryCode, attempts } = policy;
  const problems: string[] = [];
  if (!policy.factors.includes(FACTOR_KIND.TOTP)) problems.push('The policy has no authenticator-app factor.');
  for (const factor of policy.factors) if (!KNOWN_FACTORS.includes(factor)) problems.push(`The factor "${factor}" is not one the engine knows.`);
  if (!KNOWN_ALGORITHMS.includes(totp.algorithm)) problems.push(`The algorithm "${totp.algorithm}" is not one RFC 6238 names.`);
  if (!Number.isInteger(totp.digits) || totp.digits < FACTOR_LIMIT.MIN_DIGITS || totp.digits > FACTOR_LIMIT.MAX_DIGITS) {
    problems.push(`Codes are ${totp.digits} digits; RFC 4226 asks for at least ${FACTOR_LIMIT.MIN_DIGITS}, and apps show at most ${FACTOR_LIMIT.MAX_DIGITS}.`);
  }
  if (!isWhole(totp.periodSeconds, 1)) problems.push('The time step must be a whole number of seconds.');
  if (!isWhole(totp.driftSteps, 0) || totp.driftSteps > FACTOR_LIMIT.MAX_DRIFT_STEPS) {
    problems.push(`The drift window is ${totp.driftSteps} steps; RFC 6238 recommends at most ${FACTOR_LIMIT.MAX_DRIFT_STEPS}.`);
  }
  if (!isWhole(totp.secretBytes, FACTOR_LIMIT.MIN_SECRET_BYTES)) problems.push(`The secret is ${totp.secretBytes} bytes; RFC 4226 asks for at least ${FACTOR_LIMIT.MIN_SECRET_BYTES}.`);
  if (totp.issuer.trim() === '') problems.push('The policy names no issuer for authenticator apps to show.');
  if (policy.factors.includes(FACTOR_KIND.RECOVERY_CODE) && (!isWhole(recoveryCode.count, 1) || !isWhole(recoveryCode.groupCount, 1) || !isWhole(recoveryCode.groupLength, 1))) {
    problems.push('Recovery codes need a count, a number of groups and a group length of at least one.');
  }
  if (!isWhole(attempts.maxFailedAttempts, 1) || !isWhole(attempts.lockoutSeconds, 1)) problems.push('The lockout needs at least one attempt and one second.');
  return problems;
}
