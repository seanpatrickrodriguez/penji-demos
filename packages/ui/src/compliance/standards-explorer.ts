import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FieldLabels, describeCondition, describeRuleCheck, resolveGuidanceActions } from '@penji-demos/compliance-engine';
import { ComplianceStandardDefinition, CriterionDefinition, RuleDefinition } from '@penji-demos/types';
import { SEVERITY_LABEL } from './labels';

interface CriterionView {
  readonly label: string;
  readonly reads: string;
  readonly citation: string;
  readonly url: string;
}

interface RuleView {
  readonly id: string;
  readonly title: string;
  readonly check: string;
  readonly appliesWhen: string;
  readonly severity: string;
  readonly severityClass: string;
  readonly blocks: string;
  readonly issue: string;
  readonly guidance: string;
  readonly fix: string;
  readonly actions: string;
  readonly citation: string;
  readonly url: string;
  readonly json: string;
}

interface StandardView {
  readonly shortName: string;
  readonly title: string;
  readonly url: string;
  readonly appliesTo: string;
  readonly criteria: readonly CriterionView[];
  readonly basesLabel: string;
  readonly bases: readonly CriterionView[];
  readonly rules: readonly RuleView[];
  readonly interpretations: ComplianceStandardDefinition['interpretations'];
}

const describeCriterion = (criterion: CriterionDefinition, labels: FieldLabels): CriterionView => ({
  label: criterion.label,
  reads: describeCondition(criterion.condition, labels),
  citation: criterion.citation.section ?? criterion.citation.title,
  url: criterion.citation.url,
});

const describeRule = (rule: RuleDefinition, labels: FieldLabels, formTitles: Readonly<Record<string, string>>): RuleView => ({
  id: rule.id,
  title: rule.title,
  check: describeRuleCheck(rule.check, labels),
  appliesWhen: rule.appliesWhen ? describeCondition(rule.appliesWhen, labels) : 'Always',
  severity: SEVERITY_LABEL[rule.severity],
  severityClass: rule.severity,
  blocks: rule.blocks ? 'Blocks submission' : rule.bypassable ? 'Can be accepted with a reason' : 'Does not block',
  issue: rule.issue,
  guidance: rule.guidance,
  fix: rule.fixTarget ? `${formTitles[rule.fixTarget.form] ?? rule.fixTarget.form} form, ${labels[rule.fixTarget.field] ?? rule.fixTarget.field}` : 'Nothing to change on a form',
  actions: resolveGuidanceActions(rule).map((action) => action.label).join(', '),
  citation: rule.citation.section ?? rule.citation.title,
  url: rule.citation.url,
  json: JSON.stringify(rule, null, 2),
});

const describeStandard = (standard: ComplianceStandardDefinition, labels: FieldLabels, formTitles: Readonly<Record<string, string>>): StandardView => ({
  shortName: standard.shortName,
  title: standard.title,
  url: standard.source.url,
  appliesTo: standard.appliesWhen ? `Records where ${describeCondition(standard.appliesWhen, labels)}` : 'Every record',
  criteria: standard.eligibility.criteria.map((criterion) => describeCriterion(criterion, labels)),
  basesLabel: standard.eligibility.basesLabel,
  bases: standard.eligibility.bases.map((basis) => describeCriterion(basis, labels)),
  rules: standard.rules.map((rule) => describeRule(rule, labels, formTitles)),
  interpretations: standard.interpretations,
});

// Shows any compliance standards exactly as they are defined: who they apply
// to, who they accept, and every rule with its check, issue, guidance and source.
@Component({
  selector: 'app-standards-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './standards-explorer.html',
  styleUrl: './standards-explorer.scss',
})
export class StandardsExplorer {
  readonly definitions = input.required<readonly ComplianceStandardDefinition[]>();
  readonly labels = input.required<FieldLabels>();
  // Form titles by form definition ID, for naming where "Fix this" leads.
  readonly formTitles = input<Readonly<Record<string, string>>>({});
  protected readonly standards = computed(() => this.definitions().map((standard) => describeStandard(standard, this.labels(), this.formTitles())));
  private readonly picked = signal<string | null>(null);
  protected readonly shown = computed(() => this.picked() ?? this.standards()[0]?.shortName ?? '');

  protected show(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.picked.set(event.target.value);
  }
}
