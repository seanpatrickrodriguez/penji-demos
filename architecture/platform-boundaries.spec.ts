/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// The proof that the platform is one set of engines with products as
// configuration.  Every package is placed in a group; the engines import only
// engines and never name a product's values; each product imports the engines
// and its own packages, never the other product's; and a product's
// configuration packages export definitions only, no code.

const ENGINES = ['constants', 'types', 'time', 'form-engine', 'compliance-engine', 'rule-engine', 'workflow-engine', 'record-engine', 'factor-engine'];
const SHARED_UI = ['ui'];
const PROGRAM = ['dprp-configuration', 'dprp-standard', 'mdpp-standard', 'dprp-recognition', 'dprp-seed'];
const FLEET = ['fleet-configuration', 'fleet-seed'];
const SIGN_IN = ['sign-in-configuration'];
const PRODUCTS: readonly (readonly string[])[] = [PROGRAM, FLEET, SIGN_IN];
// The engines both products run on.
const SHARED_ENGINES = ['form-engine', 'compliance-engine', 'workflow-engine', 'record-engine'];
const CONFIGURATION_PACKAGES = ['dprp-configuration', 'dprp-standard', 'mdpp-standard', 'fleet-configuration', 'sign-in-configuration'];
// The engines that name no product.  constants holds every product's values, by design; each product's shapes live in its own packages.
const DEFINITION_READERS = ['types', 'time', 'form-engine', 'compliance-engine', 'rule-engine', 'workflow-engine', 'record-engine', 'factor-engine'];

const SOURCES = import.meta.glob<string>('../packages/*/src/**/*.ts', { query: '?raw', import: 'default', eager: true });
const MANIFESTS = import.meta.glob<string>('../packages/*/package.json', { query: '?raw', import: 'default', eager: true });
const APP_SOURCES = import.meta.glob<string>('../apps/*/src/**/*.ts', { query: '?raw', import: 'default', eager: true });
// Each product's page, and the product packages it is built from.
const APPS: Readonly<Record<string, readonly string[]>> = { 'dprp-evaluation': PROGRAM, 'fleet-supply': FLEET, 'totp-sign-in': SIGN_IN };
const CONFIGURATIONS = import.meta.glob<Record<string, unknown>>('../packages/{dprp-configuration,dprp-standard,mdpp-standard,fleet-configuration,sign-in-configuration}/src/index.ts', { eager: true });

const packageOf = (path: string) => path.split('/')[2] ?? '';
const isShipped = (path: string) => !path.endsWith('.spec.ts') && !path.includes('/testing/');
const shipped = Object.entries(SOURCES).filter(([path]) => isShipped(path));
const allPackages = [...new Set(Object.keys(MANIFESTS).map(packageOf))].sort();

// Every @penji-demos package a package's shipped sources import.
const importsOf = (name: string): readonly string[] =>
  [...new Set(shipped.filter(([path]) => packageOf(path) === name).flatMap(([, source]) => [...source.matchAll(/from '@penji-demos\/([\w-]+)'/g)].map((match) => match[1] ?? '')))].filter((imported) => imported !== name).sort();

// Every package a package reaches through its imports and theirs.
function reachedFrom(names: readonly string[]): ReadonlySet<string> {
  const reached = new Set<string>();
  const visit = (name: string) => {
    for (const imported of importsOf(name)) {
      if (reached.has(imported)) continue;
      reached.add(imported);
      visit(imported);
    }
  };
  names.forEach(visit);
  return reached;
}

// Every product value the constants package defines, by the name code would use.
const productConstants = Object.entries(SOURCES)
  .filter(([path]) => /constants\/src\/(dprp|fleet)\//.test(path))
  .flatMap(([, source]) => [...source.matchAll(/export const (\w+)/g)].map((match) => match[1] ?? ''));

describe('the platform boundaries', () => {
  it('place every package in exactly one group', () => {
    const grouped = [...ENGINES, ...SHARED_UI, ...PRODUCTS.flat()];
    expect(grouped.slice().sort()).toEqual(allPackages);
  });

  it('keep the engines to the engines', () => {
    for (const engine of ENGINES) expect(importsOf(engine).filter((imported) => !ENGINES.includes(imported)), engine).toEqual([]);
    for (const ui of SHARED_UI) expect(importsOf(ui).filter((imported) => !ENGINES.includes(imported)), ui).toEqual([]);
  });

  it('keep every product value out of the platform’s shapes and engines', () => {
    for (const engine of DEFINITION_READERS) {
      const named = shipped.filter(([path]) => packageOf(path) === engine).flatMap(([, source]) => productConstants.filter((constant) => new RegExp(`\\b${constant}\\b`).test(source)));
      expect(named, engine).toEqual([]);
    }
  });

  it('serve both products from the same engines, and neither product reaches the other', () => {
    for (const own of PRODUCTS) {
      for (const name of own) {
        const imports = importsOf(name);
        expect(imports.filter((imported) => PRODUCTS.some((other) => other !== own && other.includes(imported))), name).toEqual([]);
        expect(imports.filter((imported) => !ENGINES.includes(imported) && !own.includes(imported)), name).toEqual([]);
      }
    }
    const program = reachedFrom(PROGRAM);
    const fleet = reachedFrom(FLEET);
    expect(SHARED_ENGINES.filter((engine) => !program.has(engine) || !fleet.has(engine))).toEqual([]);
  });

  it('check every sign-in code with the factor engine, read from the policy alone', () => {
    const page = Object.entries(APP_SOURCES).filter(([path]) => path.includes('/apps/totp-sign-in/') && isShipped(path)).map(([, source]) => source).join('\n');
    expect(page).toContain("from '@penji-demos/factor-engine'");
    expect(page).toContain("from '@penji-demos/sign-in-configuration'");
    expect(importsOf('sign-in-configuration').filter((imported) => !['constants', 'types'].includes(imported))).toEqual([]);
  });

  it('build each product’s page from the engines, the shared UI and its own product only', () => {
    const appOf = (path: string) => path.split('/')[2] ?? '';
    expect([...new Set(Object.keys(APP_SOURCES).map(appOf))].sort()).toEqual(Object.keys(APPS).sort());
    for (const [app, own] of Object.entries(APPS)) {
      const imports = [...new Set(Object.entries(APP_SOURCES).filter(([path]) => appOf(path) === app && isShipped(path)).flatMap(([, source]) => [...source.matchAll(/from '@penji-demos\/([\w-]+)'/g)].map((match) => match[1] ?? '')))];
      expect(imports.filter((imported) => !ENGINES.includes(imported) && !SHARED_UI.includes(imported) && !own.includes(imported)), app).toEqual([]);
    }
  });

  it('let configuration packages export definitions only', () => {
    expect(Object.keys(CONFIGURATIONS).map(packageOf).sort()).toEqual([...CONFIGURATION_PACKAGES].sort());
    for (const [path, exports] of Object.entries(CONFIGURATIONS)) {
      const functions = Object.entries(exports).filter(([, value]) => typeof value === 'function').map(([name]) => name);
      expect(functions, packageOf(path)).toEqual([]);
    }
  });
});
