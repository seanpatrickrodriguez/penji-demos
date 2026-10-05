import { validateFactorPolicy } from '@penji-demos/factor-engine';
import { describe, expect, it } from 'vitest';
import { SIGN_IN_POLICY } from './sign-in-policy';

describe('the sign-in policy', () => {
  it('is inside the bounds the RFCs set', () => {
    expect(validateFactorPolicy(SIGN_IN_POLICY)).toEqual([]);
  });
});
