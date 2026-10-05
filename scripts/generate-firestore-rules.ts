// Writes firebase/firestore.rules from the diabetes prevention program's
// configuration.  The rules file is never edited by hand; a test fails when
// it falls out of step with the configuration.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { resolveSecurityRules } from '@penji-demos/security-rules-engine';

const target = fileURLToPath(new URL('../firebase/firestore.rules', import.meta.url));
writeFileSync(target, resolveSecurityRules(PROGRAM_CONFIGURATION));
console.log(`Wrote ${target}`);
