import { HMAC_ALGORITHM } from '@penji-demos/constants';
import { HmacAlgorithm, TotpPolicy, UnixSeconds } from '@penji-demos/types';

// RFC 4226 (HOTP) and RFC 6238 (TOTP) over the browser's and Node's Web Crypto.
// Web Crypto answers with Promises, so these do too.

const WEB_CRYPTO_HASH: Readonly<Record<HmacAlgorithm, string>> = {
  [HMAC_ALGORITHM.SHA1]: 'SHA-1',
  [HMAC_ALGORITHM.SHA256]: 'SHA-256',
  [HMAC_ALGORITHM.SHA512]: 'SHA-512',
};

const COUNTER_BYTES = 8;
const OFFSET_MASK = 0x0f;
const SIGN_BIT_MASK = 0x7f;
const BYTE_MASK = 0xff;
const DECIMAL = 10;

const byteAt = (bytes: Uint8Array, index: number): number => bytes[index] ?? 0;

// RFC 4226 section 5.3: HMAC the counter, take four bytes at the offset the last
// byte names (dynamic truncation), drop the sign bit, keep the low digits.
export async function calculateHotp(secret: Uint8Array<ArrayBuffer>, counter: number, digits: number, algorithm: HmacAlgorithm): Promise<string> {
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: WEB_CRYPTO_HASH[algorithm] }, false, ['sign']);
  const message = new Uint8Array(COUNTER_BYTES);
  new DataView(message.buffer).setBigUint64(0, BigInt(counter));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = byteAt(mac, mac.length - 1) & OFFSET_MASK;
  const truncated =
    ((byteAt(mac, offset) & SIGN_BIT_MASK) << 24) |
    ((byteAt(mac, offset + 1) & BYTE_MASK) << 16) |
    ((byteAt(mac, offset + 2) & BYTE_MASK) << 8) |
    (byteAt(mac, offset + 3) & BYTE_MASK);
  return String(truncated % DECIMAL ** digits).padStart(digits, '0');
}

// RFC 6238 section 4: the counter is the number of whole periods since the Unix epoch.
export const calculateTimeStep = (policy: TotpPolicy, at: UnixSeconds): number => Math.floor(at / policy.periodSeconds);

export const calculateSecondsRemaining = (policy: TotpPolicy, at: UnixSeconds): number => policy.periodSeconds - (at % policy.periodSeconds);

export const calculateTotpForStep = (policy: TotpPolicy, secret: Uint8Array<ArrayBuffer>, step: number): Promise<string> =>
  calculateHotp(secret, step, policy.digits, policy.algorithm);

export const calculateTotp = (policy: TotpPolicy, secret: Uint8Array<ArrayBuffer>, at: UnixSeconds): Promise<string> =>
  calculateTotpForStep(policy, secret, calculateTimeStep(policy, at));

// Compares every character whatever the first difference, so the time a check
// takes says nothing about how much of a guess was right.
export function isSameCode(expected: string, given: string): boolean {
  let difference = expected.length ^ given.length;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ (given.charCodeAt(index) || 0);
  }
  return difference === 0;
}
