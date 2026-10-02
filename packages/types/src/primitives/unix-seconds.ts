import { Brand } from './brand';

// A moment as whole seconds since 1970-01-01T00:00:00Z, the clock TOTP counts
// time steps from (RFC 6238 section 4).  Branded so a count of seconds is never
// taken for a moment.
export type UnixSeconds = Brand<number, 'UnixSeconds'>;

export const toUnixSeconds = (value: number): UnixSeconds => Math.floor(value) as UnixSeconds;
