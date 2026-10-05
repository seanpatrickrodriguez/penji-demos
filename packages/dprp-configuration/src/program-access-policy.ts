import { DEFINITION_KIND, PROGRAM_PERMISSION, PROGRAM_ROLE, STAFF_FIELD, STAFF_POSITION } from '@penji-demos/constants';
import { AccessPolicyDefinition, toDefinitionId } from '@penji-demos/types';

// M1: who may change a program's records.  A staff member's position gives
// their role, and their assignments say where it applies.  A data specialist holds every
// permission over the tenant they are assigned to and everything under it: at
// an organization, its cohorts and participants; at a hub, every organization
// the hub oversees.  A coach records sessions for the cohorts they teach.

const P = PROGRAM_PERMISSION;

export const PROGRAM_ACCESS_POLICY: AccessPolicyDefinition = {
  kind: DEFINITION_KIND.ACCESS_POLICY,
  id: toDefinitionId('program-access'),
  version: '1',
  title: 'Program records access',
  source: { title: 'Penji demos: diabetes prevention program records', url: 'https://github.com/seanpatrickrodriguez/penji-demos' },
  permissions: [
    { id: P.EDIT_COHORT, label: 'Edit a cohort' },
    { id: P.EDIT_ENROLLMENT, label: 'Edit an enrollment' },
    { id: P.RECORD_SESSION, label: 'Record a session' },
    { id: P.RECORD_RESULT, label: 'Record a result or a recode' },
  ],
  roles: [
    {
      id: PROGRAM_ROLE.DATA_SPECIALIST,
      label: 'Data specialist',
      description: 'Keeps the records of every cohort and participant in their scope.',
      grants: Object.values(P).map((permission) => ({ permission, when: null })),
    },
    {
      id: PROGRAM_ROLE.COACH,
      label: 'Lifestyle coach',
      description: 'Records the sessions of the cohorts they teach.',
      grants: [{ permission: P.RECORD_SESSION, when: null }],
    },
  ],
  roleRules: [
    { id: 'data-specialists', label: 'Data specialists', when: { kind: 'equals', field: STAFF_FIELD.POSITION, value: STAFF_POSITION.DATA_SPECIALIST }, roleIds: [PROGRAM_ROLE.DATA_SPECIALIST] },
    { id: 'lifestyle-coaches', label: 'Lifestyle coaches', when: { kind: 'equals', field: STAFF_FIELD.POSITION, value: STAFF_POSITION.LIFESTYLE_COACH }, roleIds: [PROGRAM_ROLE.COACH] },
  ],
};
