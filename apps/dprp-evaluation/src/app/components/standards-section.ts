import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { describeCondition, describeRuleCheck, resolveGuidanceActions } from '@penji-demos/compliance-engine';
import { FACT_LABELS } from '@penji-demos/program-records';
import { ComplianceStandardDefinition, CriterionDefinition, RuleDefinition } from '@penji-demos/types';
import { ALL_STANDARDS } from '../state/demo-store';
import { SEVERITY_LABEL } from '../view/format';

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

const describeCriterion = (criterion: CriterionDefinition): CriterionView => ({
  label: criterion.label,
  reads: describeCondition(criterion.condition, FACT_LABELS),
  citation: criterion.citation.section ?? criterion.citation.title,
  url: criterion.citation.url,
});

const describeRule = (rule: RuleDefinition): RuleView => ({
  id: rule.id,
  title: rule.title,
  check: describeRuleCheck(rule.check, FACT_LABELS),
  appliesWhen: rule.appliesWhen ? describeCondition(rule.appliesWhen, FACT_LABELS) : 'Always',
  severity: SEVERITY_LABEL[rule.severity],
  severityClass: rule.severity,
  blocks: rule.blocks ? 'Blocks submission' : rule.bypassable ? 'Can be accepted with a reason' : 'Does not block',
  issue: rule.issue,
  guidance: rule.guidance,
  fix: rule.fixTarget ? `${rule.fixTarget.form} form, ${FACT_LABELS[rule.fixTarget.field] ?? rule.fixTarget.field}` : 'Nothing to change on a form',
  actions: resolveGuidanceActions(rule).map((action) => action.label).join(', '),
  citation: rule.citation.section ?? rule.citation.title,
  url: rule.citation.url,
  json: JSON.stringify(rule, null, 2),
});

const STANDARD_VIEWS: readonly StandardView[] = ALL_STANDARDS.map((standard) => ({
  shortName: standard.shortName,
  title: standard.title,
  url: standard.source.url,
  appliesTo: standard.appliesWhen ? `Participants where ${describeCondition(standard.appliesWhen, FACT_LABELS)}` : 'Every participant',
  criteria: standard.eligibility.criteria.map(describeCriterion),
  basesLabel: standard.eligibility.basesLabel,
  bases: standard.eligibility.bases.map(describeCriterion),
  rules: standard.rules.map(describeRule),
  interpretations: standard.interpretations,
}));

@Component({
  selector: 'app-standards-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './standards-section.html',
  styleUrl: './standards-section.scss',
})
export class StandardsSection {
  protected readonly standards = STANDARD_VIEWS;
  protected readonly shown = signal(STANDARD_VIEWS[0]?.shortName ?? '');

  protected show(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.shown.set(event.target.value);
  }
}
