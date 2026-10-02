import { BASE32_ALPHABET } from '@penji-demos/constants';

// RFC 4648 section 6.  Secrets are written in base 32 so a person can type one
// into an authenticator app; otpauth URIs leave the padding off.

const BITS_PER_CHARACTER = 5;
const BITS_PER_BYTE = 8;
const LOW_FIVE_BITS = 0b11111;
const BYTE_MASK = 0xff;

export function encodeBase32(bytes: Uint8Array): string {
  let text = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << BITS_PER_BYTE) | byte;
    bits += BITS_PER_BYTE;
    while (bits >= BITS_PER_CHARACTER) {
      bits -= BITS_PER_CHARACTER;
      text += BASE32_ALPHABET.charAt((buffer >> bits) & LOW_FIVE_BITS);
    }
  }
  if (bits > 0) text += BASE32_ALPHABET.charAt((buffer << (BITS_PER_CHARACTER - bits)) & LOW_FIVE_BITS);
  return text;
}

// Reads base 32 in either case, with or without padding and spaces.  Null when
// the text holds a character base 32 does not use.
export function decodeBase32(text: string): Uint8Array<ArrayBuffer> | null {
  const cleaned = text.replace(/[\s=]/g, '').toUpperCase();
  const bytes = new Uint8Array(Math.floor((cleaned.length * BITS_PER_CHARACTER) / BITS_PER_BYTE));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const character of cleaned) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value < 0) return null;
    buffer = ((buffer << BITS_PER_CHARACTER) | value) & 0xffff;
    bits += BITS_PER_CHARACTER;
    if (bits >= BITS_PER_BYTE) {
      bits -= BITS_PER_BYTE;
      bytes[index] = (buffer >> bits) & BYTE_MASK;
      index += 1;
    }
  }
  return bytes;
}
