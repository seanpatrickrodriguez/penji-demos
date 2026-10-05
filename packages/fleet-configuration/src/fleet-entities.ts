import { ACCESS_SCOPE_KIND, DEFINITION_KIND, FACT_DERIVATION_KIND, FLEET_ENTITY, FLEET_FACT, FLEET_FORM, FLEET_PERMISSION, FLEET_STREAM, FLEET_TENANT_KIND, SUPPLY_STATUS } from '@penji-demos/constants';
import { EntityDefinition, TenantKindDefinition, toDefinitionId } from '@penji-demos/types';
import { FLEET_POLICY_SOURCE } from './fleet-policy-source';
import { VESSEL_MAINTENANCE_POLICY } from './maintenance-policy';
import { FLEET_SUPPLY_POLICY } from './supply-policy';
import { WANT_LIST_WORKFLOW } from './want-list-workflow';

// M1: what the fleet keeps on file.  A company owns vessels; a company may sit
// under another, as the shop sits under the owner.  A vessel has its profile
// and a want list, a stream of items that each move through the want-list
// workflow.  Whether someone aboard can send the list, and whether an item was
// ever approved, are worked out from the records.

const P = FLEET_PERMISSION;
const id = toDefinitionId;

export const FLEET_TENANT_KINDS: readonly TenantKindDefinition[] = [
  {
    kind: DEFINITION_KIND.TENANT_KIND,
    id: id(FLEET_TENANT_KIND.COMPANY),
    version: '1',
    title: 'Company',
    source: FLEET_POLICY_SOURCE,
    label: 'Company',
    parentKinds: [id(FLEET_TENANT_KIND.COMPANY)],
    formId: id(FLEET_FORM.COMPANY),
  },
];

export const VESSEL_ENTITY: EntityDefinition = {
  kind: DEFINITION_KIND.ENTITY,
  id: id(FLEET_ENTITY.VESSEL),
  version: '1',
  title: 'Vessel',
  source: FLEET_POLICY_SOURCE,
  label: 'Vessel',
  pluralLabel: 'Vessels',
  formId: id(FLEET_FORM.VESSEL_PROFILE),
  editPermission: P.EDIT_PROFILE,
  parentKind: null,
  startField: null,
  streams: [
    {
      id: FLEET_STREAM.WANT_LIST,
      label: 'Want list',
      entryLabel: 'Item',
      formId: id(FLEET_FORM.WANT_ITEM),
      dateField: null,
      workflowId: WANT_LIST_WORKFLOW.id,
      addPermission: P.ADD_ITEM,
      editPermission: P.EDIT_ITEM,
      removePermission: P.REMOVE_ITEM,
      facts: [{ key: FLEET_FACT.APPROVED, label: 'Approved for purchase', derivation: { kind: FACT_DERIVATION_KIND.STATE_REACHED, states: [SUPPLY_STATUS.APPROVED] } }],
    },
  ],
  facts: [
    {
      key: FLEET_FACT.HAS_SENDING_OFFICER,
      label: 'Someone aboard can send the want list',
      derivation: { kind: FACT_DERIVATION_KIND.PERMISSION_HELD, permission: P.SEND_LIST, assignedTo: ACCESS_SCOPE_KIND.ENTITY },
    },
  ],
  standardIds: [VESSEL_MAINTENANCE_POLICY.id, FLEET_SUPPLY_POLICY.id],
};
