import { FACT_DERIVATION_KIND, RULE_CHECK_KIND, RULE_SCOPE } from '@penji-demos/constants';
import { resolveCalculationFields, resolveConditionFields, validateDefinition } from '@penji-demos/form-engine';
import { validateWorkflowDefinition } from '@penji-demos/workflow-engine';
import { ComplianceStandardDefinition, Condition, DefinitionId, FactDefinition, FieldKey, PlatformConfiguration, RuleCheck } from '@penji-demos/types';
import { resolveFieldLabels, resolveForm, resolveWorkflow } from './resolve-configuration';

// Problems in a configuration bundle, found before any record is read: a
// reference to a form, workflow, entity, stream, standard or permission that
// is not in the bundle, a field a definition reads that nothing supplies, a
// form the form engine rejects or a workflow the workflow engine rejects.

const checkFields = (check: RuleCheck): readonly FieldKey[] => {
  switch (check.kind) {
    case RULE_CHECK_KIND.CONDITION:
      return [...resolveConditionFields(check.condition), ...check.describes];
    case RULE_CHECK_KIND.AT_MOST_PER_WINDOW:
      return resolveConditionFields(check.counts);
    case RULE_CHECK_KIND.REQUIRED_WHEN:
      return [check.field, ...resolveConditionFields(check.when)];
    case RULE_CHECK_KIND.WITHIN_DAYS_OF_ANCHOR:
      return [check.field, check.anchor];
    case RULE_CHECK_KIND.NOT_BEFORE_ANCHOR:
      return [check.anchor];
    default:
      return [check.field];
  }
};

const standardFields = (standard: ComplianceStandardDefinition): readonly FieldKey[] => {
  const conditions: readonly Condition[] = [
    ...(standard.appliesWhen ? [standard.appliesWhen] : []),
    ...standard.rules.flatMap((rule) => (rule.appliesWhen ? [rule.appliesWhen] : [])),
    ...(standard.eligibility ? [...standard.eligibility.criteria, ...standard.eligibility.bases].map((criterion) => criterion.condition) : []),
  ];
  const described = standard.eligibility ? [...standard.eligibility.criteria, ...standard.eligibility.bases].flatMap((criterion) => criterion.describes) : [];
  return [...conditions.flatMap(resolveConditionFields), ...described, ...standard.rules.flatMap((rule) => checkFields(rule.check))];
};

export function validateConfiguration(configuration: PlatformConfiguration): readonly string[] {
  const problems: string[] = [];
  const policy = configuration.accessPolicy;
  const permissions = new Set(policy.permissions.map((permission) => permission.id));
  const requirePermission = (owner: string, permission: string) => {
    if (!permissions.has(permission)) problems.push(`${owner} needs "${permission}", which the access policy does not define.`);
  };
  const requireForm = (owner: string, formId: DefinitionId) => {
    const form = resolveForm(configuration, formId);
    if (!form) problems.push(`${owner} names the form "${formId}", which is not in the bundle.`);
    return form;
  };
  const requireDateField = (owner: string, formId: DefinitionId, field: FieldKey) => {
    const form = resolveForm(configuration, formId);
    if (form && form.fields.find((candidate) => candidate.key === field)?.kind !== 'date') problems.push(`${owner} dates its records by "${field}", which is not a date on its form.`);
  };

  const collections = [configuration.forms, configuration.workflows, configuration.entities, configuration.tenantKinds, configuration.standards];
  for (const definitions of collections) {
    const ids = definitions.map((definition) => definition.id);
    for (const id of new Set(ids)) if (ids.filter((candidate) => candidate === id).length > 1) problems.push(`The ID "${id}" is used by more than one ${definitions[0]?.kind ?? 'definition'}.`);
  }

  for (const form of configuration.forms) for (const problem of validateDefinition(form)) problems.push(`Form "${form.id}": ${problem}`);
  for (const workflow of configuration.workflows) for (const problem of validateWorkflowDefinition(workflow, policy)) problems.push(`Workflow "${workflow.id}": ${problem}`);
  for (const role of policy.roles) for (const grant of role.grants) requirePermission(`Role "${role.id}"`, grant.permission);

  requireForm('The actor record', configuration.actorFormId);
  const tenantKinds = new Set(configuration.tenantKinds.map((kind) => kind.id));
  for (const kind of configuration.tenantKinds) {
    requireForm(`Tenant kind "${kind.id}"`, kind.formId);
    for (const parent of kind.parentKinds) if (!tenantKinds.has(parent)) problems.push(`Tenant kind "${kind.id}" sits under "${parent}", which is not a tenant kind.`);
  }

  const entityKinds = new Set(configuration.entities.map((entity) => entity.id));
  const standardIds = new Set(configuration.standards.map((standard) => standard.id));
  const streamIds = configuration.entities.flatMap((entity) => entity.streams.map((stream) => stream.id));
  for (const id of new Set(streamIds)) if (streamIds.filter((candidate) => candidate === id).length > 1) problems.push(`The stream "${id}" is defined more than once.`);

  for (const entity of configuration.entities) {
    const owner = `Entity "${entity.id}"`;
    requireForm(owner, entity.formId);
    requirePermission(owner, entity.editPermission);
    if (entity.parentKind !== null && !entityKinds.has(entity.parentKind)) problems.push(`${owner} sits under "${entity.parentKind}", which is not an entity kind.`);
    if (entity.startField !== null) requireDateField(owner, entity.formId, entity.startField);
    for (const id of entity.standardIds) if (!standardIds.has(id)) problems.push(`${owner} is evaluated by "${id}", which is not in the bundle.`);
    const ownStreams = new Set(entity.streams.map((stream) => stream.id));
    const parent = configuration.entities.find((candidate) => candidate.id === entity.parentKind);
    const parentForm = parent ? resolveForm(configuration, parent.formId) : null;
    const checkFact = (fact: FactDefinition, level: 'entity' | 'entry', workflowStates: ReadonlySet<string>) => {
      const where = `${owner}, fact "${fact.key}"`;
      const { derivation } = fact;
      switch (derivation.kind) {
        case FACT_DERIVATION_KIND.PARENT_VALUE:
          if (level !== 'entity' || !parentForm?.fields.some((field) => field.key === derivation.field)) problems.push(`${where} reads "${derivation.field}" from a parent that does not have it.`);
          return;
        case FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE:
        case FACT_DERIVATION_KIND.ANY_ENTRY:
          if (level !== 'entity' || !ownStreams.has(derivation.stream)) problems.push(`${where} reads the stream "${derivation.stream}", which this entity does not have.`);
          return;
        case FACT_DERIVATION_KIND.PERMISSION_HELD:
          if (level !== 'entity') problems.push(`${where} asks who holds a permission, which only an entity fact can.`);
          requirePermission(where, derivation.permission);
          return;
        case FACT_DERIVATION_KIND.STATE_REACHED:
          if (level !== 'entry') problems.push(`${where} reads a workflow state, which only an entry fact can.`);
          for (const state of derivation.states) if (!workflowStates.has(state)) problems.push(`${where} names the state "${state}", which its workflow does not have.`);
          return;
        case FACT_DERIVATION_KIND.CALCULATED:
          if (resolveCalculationFields(derivation.calculation).length === 0) problems.push(`${where} calculates from no fields.`);
          return;
      }
    };
    for (const fact of entity.facts) checkFact(fact, 'entity', new Set());
    for (const stream of entity.streams) {
      const streamOwner = `${owner}, stream "${stream.id}"`;
      requireForm(streamOwner, stream.formId);
      if (stream.dateField !== null) requireDateField(streamOwner, stream.formId, stream.dateField);
      for (const permission of [stream.addPermission, stream.editPermission, stream.removePermission]) requirePermission(streamOwner, permission);
      const workflow = resolveWorkflow(configuration, stream.workflowId);
      if (stream.workflowId !== null && !workflow) problems.push(`${streamOwner} names the workflow "${stream.workflowId}", which is not in the bundle.`);
      for (const fact of stream.facts) checkFact(fact, 'entry', new Set(workflow?.states.map((state) => state.id) ?? []));
    }
  }

  for (const standard of configuration.standards) {
    const evaluated = configuration.entities.filter((entity) => entity.standardIds.includes(standard.id));
    if (evaluated.length === 0) problems.push(`Standard "${standard.shortName}" evaluates no entity kind.`);
    const streams = new Set(evaluated.flatMap((entity) => entity.streams.map((stream) => stream.id)));
    for (const rule of standard.rules) {
      const owner = `Rule "${rule.id}"`;
      if (rule.scope === RULE_SCOPE.SUBJECT && rule.stream !== null) problems.push(`${owner} checks the subject's own record and names a stream.`);
      if (rule.scope !== RULE_SCOPE.SUBJECT && (rule.stream === null || !streams.has(rule.stream))) problems.push(`${owner} reads the stream "${rule.stream}", which no entity it evaluates has.`);
      const target = rule.fixTarget;
      if (target && !configuration.forms.some((form) => form.id === target.form)) problems.push(`${owner} sends a fix to the form "${target.form}", which is not in the bundle.`);
    }
  }

  const known = new Set(Object.keys(resolveFieldLabels(configuration)));
  const read = [
    ...configuration.standards.flatMap(standardFields),
    ...policy.roles.flatMap((role) => role.grants.flatMap((grant) => (grant.when ? resolveConditionFields(grant.when) : []))),
    ...configuration.workflows.flatMap((workflow) => workflow.transitions.flatMap((transition) => (transition.guard ? resolveConditionFields(transition.guard.condition) : []))),
    ...configuration.entities.flatMap((entity) => [...entity.facts, ...entity.streams.flatMap((stream) => stream.facts)]).flatMap((fact) => {
      const { derivation } = fact;
      if (derivation.kind === FACT_DERIVATION_KIND.CALCULATED) return resolveCalculationFields(derivation.calculation);
      if (derivation.kind === FACT_DERIVATION_KIND.FIRST_ENTRY_VALUE) return [derivation.field, ...(derivation.where ? resolveConditionFields(derivation.where) : []), ...(derivation.onOrAfter ? [derivation.onOrAfter] : [])];
      if (derivation.kind === FACT_DERIVATION_KIND.ANY_ENTRY) return derivation.where ? resolveConditionFields(derivation.where) : [];
      return [];
    }),
  ];
  for (const field of new Set(read)) if (!known.has(field)) problems.push(`"${field}" is read by a definition, and no form, fact or platform fact supplies it.`);
  return problems;
}
