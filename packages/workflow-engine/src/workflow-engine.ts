import { evaluateCondition } from '@penji-demos/form-engine';
import { AccessPolicyDefinition, Answers, PlainDate, TransitionDefinition, TransitionRecord, WorkflowDefinition } from '@penji-demos/types';

// The engine knows roles, permissions, states and transitions.  It does not
// know what a want list, a vessel or a participant is: a policy and a workflow
// definition supply all of that.

// True when any of the actor's roles grants the permission and the grant's condition holds.
// `context` holds the actor's facts and the record's values together.
export function isPermitted(policy: AccessPolicyDefinition, roleIds: readonly string[], permission: string, context: Answers): boolean {
  return policy.roles
    .filter((role) => roleIds.includes(role.id))
    .some((role) => role.grants.some((grant) => grant.permission === permission && (grant.when === null || evaluateCondition(grant.when, context))));
}

export interface TransitionOption {
  readonly transition: TransitionDefinition;
  readonly available: boolean;
  // Why the step is not available, when it is not.
  readonly reason: string | null;
}

// Every step out of the current state, each available or not, with the reason.
export function resolveTransitionOptions(
  workflow: WorkflowDefinition,
  policy: AccessPolicyDefinition,
  state: string,
  roleIds: readonly string[],
  context: Answers,
): readonly TransitionOption[] {
  const permissionLabel = (id: string) => policy.permissions.find((permission) => permission.id === id)?.label ?? id;
  return workflow.transitions
    .filter((transition) => transition.from.includes(state))
    .map((transition) => {
      if (!isPermitted(policy, roleIds, transition.permission, context)) {
        return { transition, available: false, reason: `Needs permission to ${permissionLabel(transition.permission).toLowerCase()}.` };
      }
      if (transition.guard && !evaluateCondition(transition.guard.condition, context)) {
        return { transition, available: false, reason: transition.guard.blockedReason };
      }
      return { transition, available: true, reason: null };
    });
}

export type TransitionResult = { readonly ok: true; readonly record: TransitionRecord } | { readonly ok: false; readonly problems: readonly string[] };

// Takes one step, or says why it cannot be taken.
export function applyTransition(
  workflow: WorkflowDefinition,
  policy: AccessPolicyDefinition,
  request: { readonly state: string; readonly transitionId: string; readonly roleIds: readonly string[]; readonly context: Answers; readonly actorId: string; readonly date: PlainDate; readonly note: string },
): TransitionResult {
  const option = resolveTransitionOptions(workflow, policy, request.state, request.roleIds, request.context).find((candidate) => candidate.transition.id === request.transitionId);
  if (!option) return { ok: false, problems: ['That step is not possible from the current state.'] };
  if (!option.available) return { ok: false, problems: [option.reason ?? 'That step is not available.'] };
  if (option.transition.needsNote && request.note.trim() === '') return { ok: false, problems: ['Add a note saying why.'] };
  return {
    ok: true,
    record: { transitionId: option.transition.id, from: request.state, to: option.transition.to, actorId: request.actorId, date: request.date, note: request.note.trim() },
  };
}

// Problems in a workflow and its access policy: a step to or from a state that
// does not exist, a permission no policy defines, or a state nothing reaches.
export function validateWorkflowDefinition(workflow: WorkflowDefinition, policy: AccessPolicyDefinition): readonly string[] {
  const problems: string[] = [];
  const states = new Set(workflow.states.map((state) => state.id));
  const permissions = new Set(policy.permissions.map((permission) => permission.id));
  if (!states.has(workflow.initial)) problems.push(`The initial state "${workflow.initial}" is not a state.`);
  for (const transition of workflow.transitions) {
    for (const from of transition.from) if (!states.has(from)) problems.push(`Step "${transition.id}" starts from "${from}", which is not a state.`);
    if (!states.has(transition.to)) problems.push(`Step "${transition.id}" leads to "${transition.to}", which is not a state.`);
    if (!permissions.has(transition.permission)) problems.push(`Step "${transition.id}" needs "${transition.permission}", which the policy does not define.`);
  }
  for (const role of policy.roles) {
    for (const grant of role.grants) if (!permissions.has(grant.permission)) problems.push(`Role "${role.id}" grants "${grant.permission}", which the policy does not define.`);
  }
  const reached = new Set([workflow.initial, ...workflow.transitions.map((transition) => transition.to)]);
  for (const state of workflow.states) if (!reached.has(state.id)) problems.push(`Nothing leads to the state "${state.id}".`);
  return problems;
}
