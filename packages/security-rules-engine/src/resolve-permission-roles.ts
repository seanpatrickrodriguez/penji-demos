import { AccessPolicyDefinition } from '@penji-demos/types';

// The roles that hold a permission outright.  A grant with a condition reads
// facts about the record and the person acting together, which the rules
// cannot see, so it grants nothing in the rules and is left to the server.
export const resolvePermissionRoles = (policy: AccessPolicyDefinition, permission: string): readonly string[] =>
  policy.roles.filter((role) => role.grants.some((grant) => grant.permission === permission && grant.when === null)).map((role) => role.id);

export const resolveConditionalGrants = (policy: AccessPolicyDefinition): readonly { readonly roleId: string; readonly permission: string }[] =>
  policy.roles.flatMap((role) => role.grants.filter((grant) => grant.when !== null).map((grant) => ({ roleId: role.id, permission: grant.permission })));
