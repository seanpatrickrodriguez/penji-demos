import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The generated Firestore rules, run in the emulator: `npm run test:rules` starts it.
const packages = ['types', 'constants', 'time', 'form-engine', 'compliance-engine', 'rule-engine', 'workflow-engine', 'record-engine', 'dprp-configuration', 'dprp-standard', 'mdpp-standard', 'dprp-seed', 'security-rules-engine'];

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(packages.map((name) => [`@penji-demos/${name}`, fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url))])),
  },
  test: {
    include: ['firebase/**/*.emulator.spec.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
