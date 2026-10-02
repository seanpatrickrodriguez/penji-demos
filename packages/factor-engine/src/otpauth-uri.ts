import { OTPAUTH } from '@penji-demos/constants';
import { TotpPolicy } from '@penji-demos/types';

// The Key URI Format authenticator apps read from a QR code:
// otpauth://totp/Issuer:account?secret=...&issuer=...&algorithm=...&digits=...&period=...
// Spaces are written %20; some apps read a + literally.
export function resolveOtpauthUri(policy: TotpPolicy, accountName: string, secret: string): string {
  const label = `${encodeURIComponent(policy.issuer)}:${encodeURIComponent(accountName)}`;
  const parameters = [
    ['secret', secret],
    ['issuer', policy.issuer],
    ['algorithm', policy.algorithm],
    ['digits', String(policy.digits)],
    ['period', String(policy.periodSeconds)],
  ]
    .map(([name, value]) => `${name}=${encodeURIComponent(value ?? '')}`)
    .join('&');
  return `${OTPAUTH.SCHEME}${label}?${parameters}`;
}
