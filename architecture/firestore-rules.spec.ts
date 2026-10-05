/// <reference types="vite/client" />
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { resolveSecurityRules } from '@penji-demos/security-rules-engine';
import { describe, expect, it } from 'vitest';

// The deployed security rules are generated from the configuration and never
// edited by hand.  Regenerate with `npm run rules:generate`.

const RULES = import.meta.glob<string>('../firebase/firestore.rules', { query: '?raw', import: 'default', eager: true });

describe('the deployed Firestore rules', () => {
  it('match what the configuration generates', () => {
    expect(Object.values(RULES)[0]).toBe(resolveSecurityRules(PROGRAM_CONFIGURATION));
  });
});
