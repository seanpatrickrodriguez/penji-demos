import { DEFINITION_KIND, FLEET_FORM } from '@penji-demos/constants';
import { PlatformConfiguration, toDefinitionId } from '@penji-demos/types';
import { FLEET_ACCESS_POLICY } from './fleet-access-policy';
import { FLEET_TENANT_KINDS, VESSEL_ENTITY } from './fleet-entities';
import { COMPANY_FORM, CREW_FORM, VESSEL_PROFILE_FORM, WANT_ITEM_FORM } from './fleet-forms';
import { FLEET_POLICY_SOURCE } from './fleet-policy-source';
import { VESSEL_MAINTENANCE_POLICY } from './maintenance-policy';
import { FLEET_SUPPLY_POLICY } from './supply-policy';
import { WANT_LIST_WORKFLOW } from './want-list-workflow';

// M1: a tug and barge fleet's supply and maintenance as a product on the
// platform: its companies, vessels and want lists, the forms, the want-list
// workflow, who may do what, and the company's policies.
export const FLEET_CONFIGURATION: PlatformConfiguration = {
  kind: DEFINITION_KIND.CONFIGURATION,
  id: toDefinitionId('fleet-supply-and-maintenance'),
  version: '1',
  title: 'Fleet supply and maintenance',
  source: FLEET_POLICY_SOURCE,
  tenantKinds: FLEET_TENANT_KINDS,
  entities: [VESSEL_ENTITY],
  forms: [COMPANY_FORM, CREW_FORM, VESSEL_PROFILE_FORM, WANT_ITEM_FORM],
  workflows: [WANT_LIST_WORKFLOW],
  accessPolicy: FLEET_ACCESS_POLICY,
  actorFormId: toDefinitionId(FLEET_FORM.CREW),
  standards: [VESSEL_MAINTENANCE_POLICY, FLEET_SUPPLY_POLICY],
};
