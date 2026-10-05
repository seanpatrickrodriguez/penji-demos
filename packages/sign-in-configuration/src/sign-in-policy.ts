import { DEFINITION_KIND, FACTOR_KIND, HMAC_ALGORITHM } from '@penji-demos/constants';
import { FactorPolicyDefinition, toDefinitionId } from '@penji-demos/types';

// M1: the platform's sign-in policy.  Everyone signs in with a password and a
// code from an authenticator app; recovery codes stand in for a lost phone.
// There is no text-message or email factor.
export const SIGN_IN_POLICY: FactorPolicyDefinition = {
  kind: DEFINITION_KIND.FACTOR_POLICY,
  id: toDefinitionId('sign-in-policy'),
  version: '2026.1',
  title: 'Sign-in policy',
  source: { title: 'RFC 6238: TOTP, Time-Based One-Time Password Algorithm', url: 'https://www.rfc-editor.org/rfc/rfc6238' },
  factors: [FACTOR_KIND.TOTP, FACTOR_KIND.RECOVERY_CODE],
  totp: {
    algorithm: HMAC_ALGORITHM.SHA1,
    digits: 6,
    periodSeconds: 30,
    driftSteps: 1,
    secretBytes: 20,
    issuer: 'seanrodriguez.dev demo',
  },
  recoveryCode: { count: 10, groupCount: 2, groupLength: 5 },
  attempts: { maxFailedAttempts: 5, lockoutSeconds: 60 },
  interpretations: [
    'SHA-1, six digits and a 30-second step are the values RFC 6238 uses as defaults and every common authenticator app reads.  HMAC-SHA-1 is not weakened by the collision attacks on SHA-1.',
    'A code from one step before or after the current one is accepted, the drift RFC 6238 section 5.2 recommends for clocks that disagree and codes typed near a step’s end.',
    'A 20-byte secret is the 160 bits RFC 4226 section 4 recommends.',
    'Once a code is accepted, no code from its step or an earlier one is accepted again, so a code seen over a shoulder cannot be used a second time.',
    'Five wrong or replayed codes in a row lock sign-in for a minute here, short enough to watch it open again.  A typo of the wrong length does not count.',
    'Ten recovery codes, each ten characters in two groups.  Each signs in once, and the server keeps only a hash of each.',
  ],
};
