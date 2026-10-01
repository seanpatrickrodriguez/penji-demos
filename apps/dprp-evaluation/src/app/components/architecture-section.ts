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
    <h3>Why it is built this way</h3>
    <p>Penji started as a data system for one program.  To become a platform, it had to take on a new program, a new standard or a new kind of organization as definitions, with the engines that read them left unchanged.  This structure is how it does that, and it is the architecture Penji's current major version is built on.</p>
    <p>Its foundation serves any organization that tracks people or things over time against a standard: tenants and their hierarchy, registrations, longitudinal records, compliance checks, and role-based access.  A marine engineering company's supply requests, equipment and vessel maintenance fit the same structure, with vessels and crews where the cohorts and participants are, maintenance logs as the longitudinal record, and inspection requirements as the compliance standard.</p>
    <h3>How it got here</h3>
    <ol class="history">
      <li><span class="when">2018</span><span>Benji, built in Google Sheets and Apps Script, took 11 organizations from paper to digital.  It was version 0, where the workflows took shape.</span></li>
      <li><span class="when">2019 to 2020</span><span>The web rebuild began in React and moved to Angular.</span></li>
      <li><span class="when">May 2025</span><span>The current Penji repository began.</span></li>
      <li><span class="when">Early 2026</span><span>Penji had grown its own abstraction ladder: implementation code at the bottom, meta-primitives above it (forms, workflows and contexts as configuration), and a self-describing schema at the top.</span></li>
      <li><span class="when">Feb to Mar 2026</span><span>I recognized that ladder in the OMG Meta Object Facility and adopted the standard's layers, names and rules.  Repository inheritance gave way to definitions, and by late March every definition saved to the platform was checked against the standard's seven structural layers, with any that did not conform rolled back.</span></li>
    </ol>
    <p>The layering grew out of the work.  The standard gave it names and rules other engineers already know.</p>
    <h3>The layers</h3>
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
    h3 { margin-top: var(--space-5); }
    h3:first-child { margin-top: 0; }
    .history { list-style: none; margin: 0 0 var(--space-3); padding: 0; }
    .history li { padding: var(--space-2) 0; border-top: 1px solid var(--rule); }
    .when { display: block; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    @media (min-width: 48rem) {
      .history li { display: grid; grid-template-columns: 10.5rem minmax(0, 1fr); column-gap: var(--space-4); }
    }
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
