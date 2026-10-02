import { DEFINITION_KIND, FACTOR_KIND, HMAC_ALGORITHM } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { Definition } from './definition';

// M2: what a sign-in factor policy holds.  The factor engine reads a policy and
// knows nothing else about the product it protects.

export type FactorKind = ValueOf<typeof FACTOR_KIND>;
export type HmacAlgorithm = ValueOf<typeof HMAC_ALGORITHM>;

export interface TotpPolicy {
  readonly algorithm: HmacAlgorithm;
  readonly digits: number;
  readonly periodSeconds: number;
  // How many time steps either side of the current one a code may come from.
  readonly driftSteps: number;
  readonly secretBytes: number;
  // The name an authenticator app shows above the code.
  readonly issuer: string;
}

export interface RecoveryCodePolicy {
  readonly count: number;
  readonly groupCount: number;
  readonly groupLength: number;
}

export interface AttemptPolicy {
  // Failed codes in a row before sign-in is locked.
  readonly maxFailedAttempts: number;
  readonly lockoutSeconds: number;
}

export interface FactorPolicyDefinition extends Definition<typeof DEFINITION_KIND.FACTOR_POLICY> {
  readonly factors: readonly FactorKind[];
  readonly totp: TotpPolicy;
  readonly recoveryCode: RecoveryCodePolicy;
  readonly attempts: AttemptPolicy;
  // Where a source leaves room, the reading this policy takes.
  readonly interpretations: readonly string[];
}
