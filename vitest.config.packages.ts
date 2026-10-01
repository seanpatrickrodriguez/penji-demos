import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The packages are plain TypeScript, tested without Angular, with the platform's boundary checks beside them.
const packages = ['types', 'constants', 'time', 'rule-engine', 'compliance-engine', 'workflow-engine', 'record-engine', 'dprp-configuration', 'dprp-recognition', 'dprp-standard', 'mdpp-standard', 'form-engine', 'dprp-seed', 'fleet-configuration', 'fleet-seed'];

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(packages.map((name) => [`@penji-demos/${name}`, fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url))])),
  },
  test: {
    include: ['packages/*/src/**/*.spec.ts', 'architecture/**/*.spec.ts'],
  },
});
