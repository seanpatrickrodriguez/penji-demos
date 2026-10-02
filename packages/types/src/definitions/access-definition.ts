import { DEFINITION_KIND } from '@penji-demos/constants';
import { Definition } from './definition';
import { Condition } from './form-definition';

// M2: what a person may do.  A permission names an action; a role grants
// permissions, some only when a condition holds for the actor and the record
// (deleting only the rows you added, for example).  Role rules say which
// roles a person holds, read from their own record; their assignments say
// where.

export interface PermissionDefinition {
  readonly id: string;
  readonly label: string;
}

export interface PermissionGrant {
  readonly permission: string;
  // Read over the actor's facts and the record's values together; null means always.
  readonly when: Condition | null;
}

export interface RoleDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly grants: readonly PermissionGrant[];
}

// M2: the roles a person holds when their own record matches, such as every
// captain being a crew member and a sending officer.
export interface RoleRuleDefinition {
  readonly id: string;
  readonly label: string;
  // Read over the person's record, on the product's actor form.
  readonly when: Condition;
  readonly roleIds: readonly string[];
}

export interface AccessPolicyDefinition extends Definition<typeof DEFINITION_KIND.ACCESS_POLICY> {
  readonly permissions: readonly PermissionDefinition[];
  readonly roles: readonly RoleDefinition[];
  readonly roleRules: readonly RoleRuleDefinition[];
}
