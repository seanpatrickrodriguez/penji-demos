import { DEFINITION_KIND } from '@penji-demos/constants';
import { DefinitionId } from '../primitives/branded-ids';
import { AccessPolicyDefinition } from './access-definition';
import { ComplianceStandardDefinition } from './compliance-definition';
import { Definition } from './definition';
import { EntityDefinition, TenantKindDefinition } from './entity-definition';
import { FormDefinition } from './form-definition';
import { WorkflowDefinition } from './workflow-definition';

// M2: a product as a bundle of definitions.  Everything a running product
// needs to know about its domain is here, referenced by ID; the engines read
// the bundle and hold nothing of their own about the domain.
export interface PlatformConfiguration extends Definition<typeof DEFINITION_KIND.CONFIGURATION> {
  readonly tenantKinds: readonly TenantKindDefinition[];
  readonly entities: readonly EntityDefinition[];
  readonly forms: readonly FormDefinition[];
  readonly workflows: readonly WorkflowDefinition[];
  readonly accessPolicy: AccessPolicyDefinition;
  // The form that records what the product keeps about a person: a position, a coach code.
  readonly actorFormId: DefinitionId;
  readonly standards: readonly ComplianceStandardDefinition[];
}
