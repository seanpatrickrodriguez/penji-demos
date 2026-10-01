import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The packages are plain TypeScript, tested without Angular.
const packages = ['types', 'constants', 'time', 'rule-engine', 'compliance-engine', 'program-records', 'dprp-standard', 'mdpp-standard', 'form-engine', 'seed'];

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(packages.map((name) => [`@penji-demos/${name}`, fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url))])),
  },
  test: {
    include: ['packages/*/src/**/*.spec.ts'],
  },
});
