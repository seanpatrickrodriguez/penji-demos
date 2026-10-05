import { DEFINITION_KIND } from '@penji-demos/constants';
import { toPlainDate } from '@penji-demos/time';
import { AccessPolicyDefinition, WorkflowDefinition, toDefinitionId } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { applyTransition, isPermitted, resolveTransitionOptions, validateWorkflowDefinition } from './workflow-engine';

// The engine is tested on a made-up domain, a newsletter's article review, to show it needs nothing from any one domain.

const SOURCE = { title: 'Newsroom rules', url: 'https://example.org/newsroom' };

const POLICY: AccessPolicyDefinition = {
  kind: DEFINITION_KIND.ACCESS_POLICY,
  id: toDefinitionId('newsroom-access'),
  version: '1',
  title: 'Newsroom access',
  source: SOURCE,
  permissions: [
    { id: 'submit', label: 'Submit an article' },
    { id: 'withdraw', label: 'Withdraw an article' },
    { id: 'publish', label: 'Publish an article' },
  ],
  roles: [
    {
      id: 'writer',
      label: 'Writer',
      description: '',
      grants: [
        { permission: 'submit', when: null },
        { permission: 'withdraw', when: { kind: 'sameAs', field: 'actorId', other: 'authorId' } },
      ],
    },
    { id: 'editor', label: 'Editor', description: '', grants: [{ permission: 'publish', when: null }] },
  ],
  roleRules: [],
};

const WORKFLOW: WorkflowDefinition = {
  kind: DEFINITION_KIND.WORKFLOW,
  id: toDefinitionId('article-review'),
  version: '1',
  title: 'Article review',
  source: SOURCE,
  initial: 'draft',
  states: [
    { id: 'draft', label: 'Draft', description: '', closed: false },
    { id: 'submitted', label: 'Submitted', description: '', closed: false },
    { id: 'published', label: 'Published', description: '', closed: true },
    { id: 'withdrawn', label: 'Withdrawn', description: '', closed: true },
  ],
  transitions: [
    { id: 'submit', label: 'Submit', from: ['draft'], to: 'submitted', permission: 'submit', guard: null, needsNote: false },
    { id: 'withdraw', label: 'Withdraw', from: ['draft', 'submitted'], to: 'withdrawn', permission: 'withdraw', guard: null, needsNote: true },
    {
      id: 'publish',
      label: 'Publish',
      from: ['submitted'],
      to: 'published',
      permission: 'publish',
      guard: { condition: { kind: 'atLeast', field: 'sources', value: 2 }, blockedReason: 'An article needs at least two sources.' },
      needsNote: false,
    },
  ],
};

describe('isPermitted', () => {
  it('grants a conditional permission only when its condition holds for the actor and the record', () => {
    expect(isPermitted(POLICY, ['writer'], 'withdraw', { actorId: 'ana', authorId: 'ana' })).toBe(true);
    expect(isPermitted(POLICY, ['writer'], 'withdraw', { actorId: 'ben', authorId: 'ana' })).toBe(false);
    expect(isPermitted(POLICY, ['writer'], 'publish', {})).toBe(false);
  });
});

describe('resolveTransitionOptions', () => {
  it('says why each unavailable step is unavailable', () => {
    const options = resolveTransitionOptions(WORKFLOW, POLICY, 'submitted', ['editor'], { sources: 1 });
    expect(options.map((option) => [option.transition.id, option.available, option.reason])).toEqual([
      ['withdraw', false, 'Needs permission to withdraw an article.'],
      ['publish', false, 'An article needs at least two sources.'],
    ]);
  });
});

describe('applyTransition', () => {
  const request = { state: 'submitted', roleIds: ['writer'], context: { actorId: 'ana', authorId: 'ana' }, actorId: 'ana', date: toPlainDate('2026-02-02') };

  it('records the step with who, when and the note', () => {
    expect(applyTransition(WORKFLOW, POLICY, { ...request, transitionId: 'withdraw', note: 'Duplicate' })).toEqual({
      ok: true,
      record: { transitionId: 'withdraw', from: 'submitted', to: 'withdrawn', actorId: 'ana', date: '2026-02-02', note: 'Duplicate' },
    });
  });

  it('refuses a step that needs a note without one, or one the actor may not take', () => {
    expect(applyTransition(WORKFLOW, POLICY, { ...request, transitionId: 'withdraw', note: ' ' })).toEqual({ ok: false, problems: ['Add a note saying why.'] });
    expect(applyTransition(WORKFLOW, POLICY, { ...request, transitionId: 'publish', note: '' })).toEqual({ ok: false, problems: ['Needs permission to publish an article.'] });
  });
});

describe('validateWorkflowDefinition', () => {
  it('finds nothing wrong with a consistent workflow and policy', () => {
    expect(validateWorkflowDefinition(WORKFLOW, POLICY)).toEqual([]);
  });

  it('finds steps to missing states, undefined permissions and unreachable states', () => {
    const broken = { ...WORKFLOW, states: [...WORKFLOW.states, { id: 'archived', label: 'Archived', description: '', closed: true }], transitions: [...WORKFLOW.transitions, { id: 'spike', label: 'Spike', from: ['draft'], to: 'spiked', permission: 'spike', guard: null, needsNote: false }] };
    expect(validateWorkflowDefinition(broken, POLICY)).toEqual([
      'Step "spike" leads to "spiked", which is not a state.',
      'Step "spike" needs "spike", which the policy does not define.',
      'Nothing leads to the state "archived".',
    ]);
  });
});
