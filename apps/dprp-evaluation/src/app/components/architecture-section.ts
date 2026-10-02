import { ChangeDetectionStrategy, Component } from '@angular/core';

interface PackageView {
  readonly name: string;
  readonly layer: string;
  readonly holds: string;
  readonly uses: string;
}

const PACKAGES: readonly PackageView[] = [
  { name: 'constants', layer: 'Every layer', holds: 'Every fixed value: MOF layers, platform facts, rule kinds, severities, canonical field names, DPRP codes and columns.', uses: 'Nothing' },
  { name: 'types', layer: 'M3, M2, M0 shapes', holds: "Branded IDs, what a definition is, the shape of each kind of definition, the platform's records and the compliance and requirement results.", uses: 'constants' },
  { name: 'time', layer: 'Platform', holds: 'Calendar dates and program months.', uses: 'types' },
  { name: 'form-engine', layer: 'Engine', holds: 'Renders and validates any form definition, evaluates conditions and calculates fields.', uses: 'types, time' },
  { name: 'compliance-engine', layer: 'Engine', holds: "Evaluates any standard's eligibility and rules over a subject's facts and the entries in its streams, merges rules onto forms, and turns findings into guidance.", uses: 'form-engine' },
  { name: 'rule-engine', layer: 'Engine', holds: 'Evaluates requirement definitions against a metric registry, awards tiers, and carries statuses forward.', uses: 'types' },
  { name: 'workflow-engine', layer: 'Engine', holds: 'Checks permissions and moves a record through any workflow definition.', uses: 'form-engine' },
  { name: 'record-engine', layer: 'Engine', holds: "Reads any configuration's tenants, entities and streams: works out facts, resolves who may do what over the tenant and entity trees, resolves each person's roles from their record, records changes, and validates a configuration.", uses: 'every engine' },
  { name: 'dprp-configuration', layer: 'M1', holds: 'The program as configuration: hub and organization tenants, cohorts and participants, the session, A1C result and recode streams, the forms, and the access roles with the positions that hold them.', uses: 'types, constants, dprp-standard, mdpp-standard' },
  { name: 'dprp-standard', layer: 'M1', holds: 'The recognition standard\'s shape, and the 2024 DPRP Standards and the Table 5 data dictionary as data.', uses: 'types, constants' },
  { name: 'mdpp-standard', layer: 'M1', holds: '42 CFR 410.79(c)(1) eligibility as data.', uses: 'types, constants' },
  { name: 'dprp-recognition', layer: 'DPRP calculators', holds: "The DPRP's metric calculators, the shapes of its results, recognition over the submissions and the Table 5 file.", uses: 'record-engine, rule-engine' },
  { name: 'dprp-seed', layer: 'M0', holds: 'A deterministic synthetic hub and organization with a case for every rule.', uses: 'record-engine' },
];

@Component({
  selector: 'app-architecture-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Why it is built this way</h3>
    <p>Penji started as a data system for one program.  To become a platform, it had to take on a new program, a new standard or a new kind of organization as definitions, with the engines that read them left unchanged.  This structure is how it does that, and it is the architecture Penji's current major version is built on.</p>
    <p>Its foundation serves any organization that tracks people or things over time against a standard: tenants and their hierarchy, registrations, longitudinal records, compliance checks, and role-based access.  The <a href="/demos/fleet-supply/">fleet demo</a> runs on the same packages: a tug and barge fleet's supply requests, vessel profiles and maintenance, with vessels and crews where the cohorts and participants are.</p>
    <h3>How it got here</h3>
    <ol class="history">
      <li><span class="when">2018</span><span>Benji, built in Google Sheets and Apps Script, took 11 organizations from paper to digital.  It was version 0, where the workflows took shape.</span></li>
      <li><span class="when">2019 to 2020</span><span>The web rebuild began in React and moved to Angular.</span></li>
      <li><span class="when">May 2025</span><span>The current Penji repository began.</span></li>
      <li><span class="when">Early 2026</span><span>Penji had grown its own abstraction ladder: implementation code at the bottom, meta-primitives above it (forms, workflows and contexts as configuration), and a self-describing schema at the top.</span></li>
      <li><span class="when">Feb to Mar 2026</span><span>I recognized that ladder in the OMG Meta Object Facility and adopted the standard's layers, names and rules.  Repository inheritance gave way to definitions.</span></li>
    </ol>
    <p>The layering grew out of the work.  The standard gave it names and rules other engineers already know.</p>
    <h3>The layers</h3>
    <div class="table-scroll" tabindex="0" role="region" aria-label="The four layers">
      <table class="data-table layers">
        <thead><tr><th scope="col">Layer</th><th scope="col">What it is</th><th scope="col">Here</th></tr></thead>
        <tbody>
          <tr><th scope="row">M3</th><td>What any definition is: a kind, an ID, a version, and the source it was written from.</td><td>types: <code>Definition</code></td></tr>
          <tr><th scope="row">M2</th><td>The shape of each kind of definition: a product configuration, a tenant kind, an entity with its streams and facts, a form, a workflow, an access policy and its role rules, a compliance standard and its rules, a requirement, a data element.  The DPRP adds a recognition standard.</td><td>types: <code>PlatformConfiguration</code>, <code>EntityDefinition</code>, <code>ComplianceStandardDefinition</code>, <code>FormDefinition</code></td></tr>
          <tr><th scope="row">M1</th><td>Definitions written in those shapes: the program's configuration, the 2024 DPRP Standards, the MDPP regulation.</td><td>dprp-configuration, dprp-standard, mdpp-standard</td></tr>
          <tr><th scope="row">M0</th><td>The platform's records: tenants, staff and their assignments, cohort and participant entities, stream entries, and the resolutions people record.</td><td>dprp-seed, and every change made on this page</td></tr>
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
