import { RECOVERY_CODE_ALPHABET, RECOVERY_CODE_SEPARATOR } from '@penji-demos/constants';
import { RecoveryCodePolicy } from '@penji-demos/types';

const ALPHABET_MASK = RECOVERY_CODE_ALPHABET.length - 1;
const HEX = 16;
const HEX_DIGITS_PER_BYTE = 2;

// Crockford's base 32 reads I and L as 1 and O as 0, so a code copied by hand still matches.
const LOOKALIKES: Readonly<Record<string, string>> = { I: '1', L: '1', O: '0' };

export const calculateRecoveryCodeLength = (policy: RecoveryCodePolicy): number => policy.groupCount * policy.groupLength;

// The random bytes a full set of codes takes: one per character.
export const calculateRecoveryByteCount = (policy: RecoveryCodePolicy): number => policy.count * calculateRecoveryCodeLength(policy);

// Turns random bytes into the policy's codes, one byte per character.  The bytes
// come from the caller, so this stays pure; a 32-symbol alphabet takes a byte's
// low five bits without bias.
export function resolveRecoveryCodes(policy: RecoveryCodePolicy, randomBytes: Uint8Array): readonly string[] {
  const length = calculateRecoveryCodeLength(policy);
  if (randomBytes.length !== calculateRecoveryByteCount(policy)) throw new Error(`Recovery codes need ${calculateRecoveryByteCount(policy)} random bytes.`);
  return Array.from({ length: policy.count }, (_, code) => {
    const characters = Array.from(randomBytes.subarray(code * length, (code + 1) * length), (byte) => RECOVERY_CODE_ALPHABET.charAt(byte & ALPHABET_MASK)).join('');
    return Array.from({ length: policy.groupCount }, (_, group) => characters.slice(group * policy.groupLength, (group + 1) * policy.groupLength)).join(RECOVERY_CODE_SEPARATOR);
  });
}

// A code as it is hashed: upper case, separators and spaces dropped, lookalikes read as Crockford reads them.
export const resolveRecoveryCodeKey = (code: string): string =>
  [...code.toUpperCase().replace(new RegExp(`[\\s${RECOVERY_CODE_SEPARATOR}]`, 'g'), '')].map((character) => LOOKALIKES[character] ?? character).join('');

export const isRecoveryCodeKey = (policy: RecoveryCodePolicy, key: string): boolean =>
  key.length === calculateRecoveryCodeLength(policy) && [...key].every((character) => RECOVERY_CODE_ALPHABET.includes(character));

// SHA-256 of the code's key, in hex.  A server keeps only this.  Each character
// carries five random bits; a production server would still use a slow, salted
// hash (scrypt, Argon2) so a stolen table is costly to search.
export async function calculateRecoveryCodeHash(key: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  return Array.from(digest, (byte) => byte.toString(HEX).padStart(HEX_DIGITS_PER_BYTE, '0')).join('');
}
