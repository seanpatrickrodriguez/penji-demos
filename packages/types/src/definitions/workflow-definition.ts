import { DEFINITION_KIND } from '@penji-demos/constants';
import { PlainDate } from '../primitives/plain-date';
import { Definition } from './definition';
import { Condition } from './form-definition';

// M2: the states a record moves through and the steps between them.  Each step
// names the permission it needs and, where a rule applies, a guard written in
// the platform's condition language with the reason it gives when it blocks.

export interface WorkflowStateDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly closed: boolean;
}

export interface TransitionGuard {
  readonly condition: Condition;
  readonly blockedReason: string;
}

export interface TransitionDefinition {
  readonly id: string;
  readonly label: string;
  readonly from: readonly string[];
  readonly to: string;
  readonly permission: string;
  readonly guard: TransitionGuard | null;
  readonly needsNote: boolean;
}

export interface WorkflowDefinition extends Definition<typeof DEFINITION_KIND.WORKFLOW> {
  readonly states: readonly WorkflowStateDefinition[];
  readonly initial: string;
  readonly transitions: readonly TransitionDefinition[];
}

// One step taken, kept as the record's history.
export interface TransitionRecord {
  readonly transitionId: string;
  readonly from: string;
  readonly to: string;
  readonly actorId: string;
  readonly date: PlainDate;
  readonly note: string;
}
