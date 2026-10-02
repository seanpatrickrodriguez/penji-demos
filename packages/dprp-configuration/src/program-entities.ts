import {
  A1C_RESULT_FIELD,
  COHORT_FIELD,
  DEFINITION_KIND,
  DERIVED_FACT,
  ENROLLMENT_FIELD,
  FACT_DERIVATION_KIND,
  PLATFORM_FACT,
  PROGRAM_ENTITY,
  PROGRAM_FORM,
  PROGRAM_PERMISSION,
  PROGRAM_STREAM,
  PROGRAM_TENANT_KIND,
  RECODE_FIELD,
  SESSION_FIELD,
} from '@penji-demos/constants';
import { DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { MDPP_STANDARD } from '@penji-demos/mdpp-standard';
import { EntityDefinition, StreamDefinition, TenantKindDefinition, toDefinitionId } from '@penji-demos/types';

// M1: what a diabetes prevention program keeps on file.  A hub oversees
// organizations, and an organization may oversee others; an organization runs cohorts; a participant sits in a
// cohort, with a stream of sessions, a stream of A1C results and a stream of
// recodes.  The participant's facts that no form asks for are worked out here
// from those records, and the standards the participant is held to are named.

const SOURCE = { title: 'Penji demos: diabetes prevention program records', url: 'https://github.com/seanpatrickrodriguez/penji-demos' };
const P = PROGRAM_PERMISSION;
const F = DERIVED_FACT;
const id = toDefinitionId;

export const PROGRAM_TENANT_KINDS: readonly TenantKindDefinition[] = [
  { kind: DEFINITION_KIND.TENANT_KIND, id: id(PROGRAM_TENANT_KIND.HUB), version: '1', title: 'Hub', source: SOURCE, label: 'Hub', parentKinds: [], formId: id(PROGRAM_FORM.HUB) },
  {
    kind: DEFINITION_KIND.TENANT_KIND,
    id: id(PROGRAM_TENANT_KIND.ORGANIZATION),
    version: '1',
    title: 'Organization',
    source: SOURCE,
    label: 'Organization',
    // An organization sits under a hub, or under an organization that oversees it.
    parentKinds: [id(PROGRAM_TENANT_KIND.HUB), id(PROGRAM_TENANT_KIND.ORGANIZATION)],
    formId: id(PROGRAM_FORM.ORGANIZATION),
  },
];

const stream = (streamId: string, label: string, entryLabel: string, formId: string, dateField: string, permission: string): StreamDefinition => ({
  id: streamId,
  label,
  entryLabel,
  formId: id(formId),
  dateField,
  workflowId: null,
  addPermission: permission,
  editPermission: permission,
  removePermission: permission,
  facts: [],
});

export const COHORT_ENTITY: EntityDefinition = {
  kind: DEFINITION_KIND.ENTITY,
  id: id(PROGRAM_ENTITY.COHORT),
  version: '1',
  title: 'Cohort',
  source: SOURCE,
  label: 'Cohort',
  pluralLabel: 'Cohorts',
  formId: id(PROGRAM_FORM.COHORT),
  editPermission: P.EDIT_COHORT,
  parentKind: null,
  startField: COHORT_FIELD.START_DATE,
  streams: [],
  facts: [],
  standardIds: [],
};

const weighed = { kind: 'answered' as const, field: SESSION_FIELD.WEIGHT_POUNDS };

export const PARTICIPANT_ENTITY: EntityDefinition = {
  kind: DEFINITION_KIND.ENTITY,
  id: id(PROGRAM_ENTITY.PARTICIPANT),
  version: '1',
  title: 'Participant',
  source: SOURCE,
  label: 'Participant',
  pluralLabel: 'Participants',
  formId: id(PROGRAM_FORM.ENROLLMENT),
  editPermission: P.EDIT_ENROLLMENT,
  parentKind: id(PROGRAM_ENTITY.COHORT),
  startField: null,
  streams: [
    stream(PROGRAM_STREAM.SESSION, 'Sessions', 'Session', PROGRAM_FORM.SESSION, SESSION_FIELD.SESSION_DATE, P.RECORD_SESSION),
    stream(PROGRAM_STREAM.A1C_RESULT, 'A1C results', 'A1C result', PROGRAM_FORM.A1C_RESULT, A1C_RESULT_FIELD.REPORTED_DATE, P.RECORD_RESULT),
    stream(PROGRAM_STREAM.RECODE, 'Recodes', 'Recode', PROGRAM_FORM.RECODE, RECODE_FIELD.DATE, P.RECORD_RESULT),
  ],
  facts: [
    { key: F.COHORT_START_DATE, label: "Cohort's first session", derivation: { kind: FACT_DERIVATION_KIND.PARENT_VALUE, field: COHORT_FIELD.START_DATE } },
    { key: F.COHORT_KIND, label: 'Cohort kind', derivation: { kind: FACT_DERIVATION_KIND.PARENT_VALUE, field: COHORT_FIELD.KIND } },
    {
      key: F.FIRST_SESSION_DATE,
      label: 'First session attended',
      derivation: { kind: FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE, stream: PROGRAM_STREAM.SESSION, field: PLATFORM_FACT.ENTRY_DATE, where: null, onOrAfter: F.COHORT_START_DATE },
    },
    {
      key: F.FIRST_SESSION_WEIGHT,
      label: 'Weight at the first weighed session',
      derivation: { kind: FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE, stream: PROGRAM_STREAM.SESSION, field: SESSION_FIELD.WEIGHT_POUNDS, where: weighed, onOrAfter: F.COHORT_START_DATE },
    },
    {
      key: F.FIRST_SESSION_BMI,
      label: 'BMI at the first weighed session',
      // Body mass index from pounds and inches: 703 x weight / height².
      derivation: {
        kind: FACT_DERIVATION_KIND.CALCULATED,
        calculation: { kind: 'quotient', numerator: [F.FIRST_SESSION_WEIGHT], denominator: [ENROLLMENT_FIELD.HEIGHT_INCHES, ENROLLMENT_FIELD.HEIGHT_INCHES], factor: 703, decimals: 1 },
      },
    },
    { key: F.RECODED_INELIGIBLE, label: 'Recoded ineligible during the program', derivation: { kind: FACT_DERIVATION_KIND.ANY_ENTRY, stream: PROGRAM_STREAM.RECODE, where: null } },
  ],
  standardIds: [DPRP_STANDARD_2024.id, MDPP_STANDARD.id],
};
