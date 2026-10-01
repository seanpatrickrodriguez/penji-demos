import { ChangeDetectionStrategy, Component } from '@angular/core';

interface PackageView {
  readonly name: string;
  readonly layer: string;
  readonly holds: string;
  readonly uses: string;
}

const PACKAGES: readonly PackageView[] = [
  { name: 'constants', layer: 'Every layer', holds: 'Every fixed value: MOF layers, rule kinds, severities, canonical field names, DPRP codes and columns.', uses: 'Nothing' },
  { name: 'types', layer: 'M3, M2, M0 shapes', holds: 'The one type system: branded IDs, what a definition is, the shape of each kind of definition, the records.', uses: 'constants' },
  { name: 'time', layer: 'Platform', holds: 'Calendar dates and program months, defined once with boundary tests.', uses: 'types' },
  { name: 'form-engine', layer: 'Engine', holds: 'Renders and validates any form definition; the one condition language.', uses: 'types, time' },
  { name: 'compliance-engine', layer: 'Engine', holds: "Evaluates any standard's eligibility and rules over a participant's facts and history, merges rules onto forms, and turns findings into guidance.", uses: 'form-engine' },
  { name: 'rule-engine', layer: 'Engine', holds: 'Evaluates requirement definitions against a metric registry, awards tiers, and carries statuses forward.', uses: 'types' },
  { name: 'program-records', layer: 'M1, platform', holds: "The platform's own enrollment and session forms, and the adapter from records to facts.", uses: 'compliance-engine' },
  { name: 'dprp-standard', layer: 'M1', holds: 'The 2024 DPRP Standards as data, its data dictionary, the recognition evaluation and the submission file.', uses: 'all engines, program-records' },
  { name: 'mdpp-standard', layer: 'M1', holds: '42 CFR 410.79 eligibility as data.  Added without changing any engine.', uses: 'types, constants' },
  { name: 'seed', layer: 'M0', holds: 'A deterministic synthetic organization with a case for every rule.', uses: 'types, time' },
];

@Component({
  selector: 'app-architecture-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-scroll" tabindex="0" role="region" aria-label="The four layers">
      <table class="data-table layers">
        <thead><tr><th scope="col">Layer</th><th scope="col">What it is</th><th scope="col">Here</th></tr></thead>
        <tbody>
          <tr><th scope="row">M3</th><td>What any definition is: a kind, an ID, a version, and the source it was written from.</td><td>types: <code>Definition</code></td></tr>
          <tr><th scope="row">M2</th><td>The shape of each kind of definition: a compliance standard, a rule, a criterion, a requirement, a form, a data element, a guidance item.</td><td>types: <code>ComplianceStandardDefinition</code>, <code>RuleDefinition</code>, <code>FormDefinition</code></td></tr>
          <tr><th scope="row">M1</th><td>Definitions written in those shapes: the 2024 DPRP Standards, the MDPP regulation, the platform's enrollment and session forms.</td><td>dprp-standard, mdpp-standard, program-records</td></tr>
          <tr><th scope="row">M0</th><td>An organization's records: cohorts, participants, sessions, and the resolutions people record.</td><td>seed, and every change made on this page</td></tr>
        </tbody>
      </table>
    </div>
    <ul class="packages">
      @for (item of packages; track item.name) {
        <li>
          <p class="name"><code>&#64;penji-demos/{{ item.name }}</code> <span class="layer">{{ item.layer }}</span></p>
          <p>{{ item.holds }}</p>
          <p class="uses">Uses: {{ item.uses }}</p>
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: block; }
    .layers th[scope='row'] { font-family: var(--font-heading); font-weight: 600; }
    .packages { list-style: none; margin: var(--space-5) 0 0; padding: 0; display: grid; gap: var(--space-3); }
    @media (min-width: 48rem) { .packages { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .packages li { border: 1px solid var(--rule); border-radius: 6px; padding: var(--space-3); min-width: 0; }
    .packages p { margin: 0 0 var(--space-1); }
    .name { font-weight: 600; overflow-wrap: anywhere; }
    .layer { font-weight: 400; font-size: 0.8125rem; color: var(--text-muted); margin-left: var(--space-1); }
    .uses { font-size: 0.875rem; color: var(--text-muted); }
    code { font-size: 0.9em; }
  `,
})
export class ArchitectureSection {
  protected readonly packages = PACKAGES;
}
