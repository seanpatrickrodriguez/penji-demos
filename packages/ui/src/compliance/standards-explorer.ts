import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FieldLabels, describeCondition, describeRuleCheck, resolveGuidanceActions } from '@penji-demos/compliance-engine';
import { ComplianceStandardDefinition, CriterionDefinition, FieldDefinition, RuleDefinition } from '@penji-demos/types';
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

interface EligibilityView {
  readonly criteria: readonly CriterionView[];
  readonly basesLabel: string;
  readonly bases: readonly CriterionView[];
}

interface StandardView {
  readonly shortName: string;
  readonly title: string;
  readonly url: string;
  readonly appliesTo: string;
  readonly eligibility: EligibilityView | null;
  readonly rules: readonly RuleView[];
  readonly interpretations: ComplianceStandardDefinition['interpretations'];
}

// How the explorer names things: field labels, the fields whose choices name
// values, form titles, what a blocking rule stops, and what one event is called.
interface Vocabulary {
  readonly labels: FieldLabels;
  readonly fields: readonly FieldDefinition[];
  readonly formTitles: Readonly<Record<string, string>>;
  readonly blocksLabel: string;
  readonly eventNoun: string;
}

const describeCriterion = (criterion: CriterionDefinition, vocabulary: Vocabulary): CriterionView => ({
  label: criterion.label,
  reads: describeCondition(criterion.condition, vocabulary.labels, vocabulary.fields),
  citation: criterion.citation.section ?? criterion.citation.title,
  url: criterion.citation.url,
});

const describeRule = (rule: RuleDefinition, { labels, fields, formTitles, blocksLabel, eventNoun }: Vocabulary): RuleView => ({
  id: rule.id,
  title: rule.title,
  check: describeRuleCheck(rule.check, labels, fields, eventNoun),
  appliesWhen: rule.appliesWhen ? describeCondition(rule.appliesWhen, labels, fields) : 'Always',
  severity: SEVERITY_LABEL[rule.severity],
  severityClass: rule.severity,
  blocks: rule.blocks ? blocksLabel : rule.bypassable ? 'Can be accepted with a reason' : 'Does not block',
  issue: rule.issue,
  guidance: rule.guidance,
  fix: rule.fixTarget ? `${formTitles[rule.fixTarget.form] ?? rule.fixTarget.form} form, ${labels[rule.fixTarget.field] ?? rule.fixTarget.field}` : 'Nothing to change on a form',
  actions: resolveGuidanceActions(rule).map((action) => action.label).join(', '),
  citation: rule.citation.section ?? rule.citation.title,
  url: rule.citation.url,
  json: JSON.stringify(rule, null, 2),
});

const describeStandard = (standard: ComplianceStandardDefinition, vocabulary: Vocabulary): StandardView => ({
  shortName: standard.shortName,
  title: standard.title,
  url: standard.source.url,
  appliesTo: standard.appliesWhen ? `Records where ${describeCondition(standard.appliesWhen, vocabulary.labels, vocabulary.fields)}` : 'Every record',
  eligibility: standard.eligibility
    ? {
        criteria: standard.eligibility.criteria.map((criterion) => describeCriterion(criterion, vocabulary)),
        basesLabel: standard.eligibility.basesLabel,
        bases: standard.eligibility.bases.map((basis) => describeCriterion(basis, vocabulary)),
      }
    : null,
  rules: standard.rules.map((rule) => describeRule(rule, vocabulary)),
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
  // What a blocking rule stops, in the domain's terms.
  readonly blocksLabel = input('Blocks submission');
  readonly fields = input<readonly FieldDefinition[]>([]);
  readonly eventNoun = input('session');
  protected readonly standards = computed(() => this.definitions().map((standard) => describeStandard(standard, { labels: this.labels(), fields: this.fields(), formTitles: this.formTitles(), blocksLabel: this.blocksLabel(), eventNoun: this.eventNoun() })));
  private readonly picked = signal<string | null>(null);
  protected readonly shown = computed(() => this.picked() ?? this.standards()[0]?.shortName ?? '');

  protected show(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.picked.set(event.target.value);
  }
}
