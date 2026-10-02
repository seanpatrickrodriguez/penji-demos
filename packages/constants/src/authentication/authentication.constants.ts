// Sign-in second factors: the values any factor policy and any verification use.
// The platform's rule is one second factor for everyone, an authenticator app,
// with single-use recovery codes for a lost phone.  There is no text-message or
// email factor to configure.

export const FACTOR_KIND = {
  TOTP: 'totp',
  RECOVERY_CODE: 'recoveryCode',
} as const;

// The HMAC hash a TOTP factor uses, by the names otpauth URIs carry (RFC 6238 section 1.2).
export const HMAC_ALGORITHM = {
  SHA1: 'SHA1',
  SHA256: 'SHA256',
  SHA512: 'SHA512',
} as const;

export const FACTOR_STATUS = {
  // Enrolled, waiting for the first code to prove the authenticator holds the secret.
  PENDING: 'pending',
  ACTIVE: 'active',
} as const;

// Why a code is being checked: to finish setting a factor up, or to sign in.
export const VERIFICATION_PURPOSE = {
  ENROLLMENT: 'enrollment',
  SIGN_IN: 'signIn',
} as const;

export const VERIFICATION_OUTCOME = {
  ACCEPTED: 'accepted',
  WRONG_CODE: 'wrongCode',
  // A code from a time step already used, or a recovery code already spent.
  REPLAYED: 'replayed',
  LOCKED_OUT: 'lockedOut',
  // Not the right number of characters, or characters the code cannot contain.
  MALFORMED: 'malformed',
  NOT_ENROLLED: 'notEnrolled',
} as const;

// RFC 4648 section 6: the alphabet secrets are written in for people to type.
export const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Recovery codes use Crockford's base 32 alphabet, which leaves out I, L, O and U
// so a code read aloud or copied by hand is not mistaken.  Its 32 symbols map one
// random byte to one character without bias (256 is a multiple of 32).
export const RECOVERY_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const RECOVERY_CODE_SEPARATOR = '-';

export const OTPAUTH = {
  SCHEME: 'otpauth://totp/',
} as const;

// The bounds RFC 4226 and RFC 6238 set on a policy.
export const FACTOR_LIMIT = {
  // RFC 4226 section 4, R4: at least six digits.  Eight is the most authenticator apps show.
  MIN_DIGITS: 6,
  MAX_DIGITS: 8,
  // RFC 4226 section 4, R6: a shared secret of at least 128 bits.
  MIN_SECRET_BYTES: 16,
  // RFC 6238 section 5.2: accept at most one time step of drift, either side.
  MAX_DRIFT_STEPS: 1,
} as const;
