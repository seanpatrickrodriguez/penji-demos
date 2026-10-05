import { DEFINITION_KIND, PROGRAM_FORM } from '@penji-demos/constants';
import { DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { MDPP_STANDARD } from '@penji-demos/mdpp-standard';
import { PlatformConfiguration, toDefinitionId } from '@penji-demos/types';
import { PROGRAM_ACCESS_POLICY } from './program-access-policy';
import { COHORT_ENTITY, PARTICIPANT_ENTITY, PROGRAM_TENANT_KINDS } from './program-entities';
import { A1C_RESULT_FORM, COHORT_FORM, ENROLLMENT_FORM, HUB_FORM, ORGANIZATION_FORM, RECODE_FORM, SESSION_FORM, STAFF_FORM } from './program-forms';

// M1: a diabetes prevention program as a product on the platform: its
// tenants, records, forms and access, and the standards its participants are
// held to.  The DPRP comes first: it is the standard the program is recognized under.
export const PROGRAM_CONFIGURATION: PlatformConfiguration = {
  kind: DEFINITION_KIND.CONFIGURATION,
  id: toDefinitionId('diabetes-prevention-program'),
  version: '1',
  title: 'Diabetes prevention program',
  source: { title: 'Penji demos: diabetes prevention program records', url: 'https://github.com/seanpatrickrodriguez/penji-demos' },
  tenantKinds: PROGRAM_TENANT_KINDS,
  entities: [COHORT_ENTITY, PARTICIPANT_ENTITY],
  forms: [HUB_FORM, ORGANIZATION_FORM, STAFF_FORM, COHORT_FORM, ENROLLMENT_FORM, SESSION_FORM, A1C_RESULT_FORM, RECODE_FORM],
  workflows: [],
  accessPolicy: PROGRAM_ACCESS_POLICY,
  actorFormId: toDefinitionId(PROGRAM_FORM.STAFF),
  standards: [DPRP_STANDARD_2024, MDPP_STANDARD],
};
