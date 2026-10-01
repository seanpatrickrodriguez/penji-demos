import { ChangeDetectionStrategy, Component } from '@angular/core';

interface PackageRow {
  readonly name: string;
  readonly holds: string;
  readonly program: boolean;
  readonly fleet: boolean;
}

// Which packages each product's page is built from.  The boundary spec in the
// repository fails the build if either page reaches the other product.
const PACKAGES: readonly PackageRow[] = [
  { name: 'constants', holds: 'Every fixed value, each product’s in its own folder.', program: true, fleet: true },
  { name: 'types', holds: 'The M3 and M2 shapes and the platform’s records.', program: true, fleet: true },
  { name: 'time', holds: 'Calendar dates.', program: true, fleet: true },
  { name: 'form-engine', holds: 'Renders, validates and calculates any form definition, and evaluates conditions.', program: true, fleet: true },
  { name: 'compliance-engine', holds: 'Evaluates any standard’s rules over a record and its streams, and turns findings into guidance.', program: true, fleet: true },
  { name: 'workflow-engine', holds: 'Checks permissions and moves an entry through any workflow.', program: true, fleet: true },
  { name: 'record-engine', holds: 'Tenants, entities, streams and scoped roles: facts, access, changes and the configuration check.', program: true, fleet: true },
  { name: 'ui', holds: 'The site’s layout and theme, the definition-driven form, the guidance list and the standards explorer.', program: true, fleet: true },
  { name: 'rule-engine', holds: 'Requirements, tiers and statuses over time.', program: true, fleet: false },
  { name: 'dprp-configuration, dprp-standard, mdpp-standard', holds: 'The program as configuration, and its standards as data.', program: true, fleet: false },
  { name: 'dprp-recognition, dprp-seed', holds: 'The DPRP’s metric calculators and Table 5 file, and a synthetic program.', program: true, fleet: false },
  { name: 'fleet-configuration', holds: 'The fleet as configuration: companies, vessels, the want list and its workflow, forms, access and policies.', program: false, fleet: true },
  { name: 'fleet-seed', holds: 'A synthetic fleet, every item moved through the record engine.', program: false, fleet: true },
];

@Component({
  selector: 'app-architecture-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      A diabetes prevention program and a tug and barge fleet share no domain, and they run on the same code.  Each product is a
      configuration bundle: the kinds of tenants it has, the entities it keeps and their forms, the streams of dated entries on each
      entity, the workflows those entries move through, who may do what over which branch of the tree, and the standards its records
      are held to.  A participant's session log and a vessel's want list are the same thing to the record engine: a stream.  A hub's
      data specialist and the fleet's supply manager are the same thing to the access policy: a role assigned over a branch.
    </p>
    <div class="table-scroll" tabindex="0" role="region" aria-labelledby="packages-caption">
      <table class="data-table">
        <caption id="packages-caption">The packages each demo is built from.</caption>
        <thead>
          <tr><th scope="col">Package</th><th scope="col">Holds</th><th scope="col">DPRP demo</th><th scope="col">Fleet demo</th></tr>
        </thead>
        <tbody>
          @for (row of packages; track row.name) {
            <tr>
              <th scope="row"><code>{{ row.name }}</code></th>
              <td>{{ row.holds }}</td>
              <td>{{ row.program ? 'Yes' : '—' }}</td>
              <td>{{ row.fleet ? 'Yes' : '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p>
      The configuration packages hold definitions and no functions, and a test in the repository fails if one exports a function, if an
      engine names a product's values, or if either product imports the other.  The DPRP keeps one package of its own code: the metric
      calculators the rule engine runs when it evaluates recognition.  The fleet needs none.
    </p>
  `,
  styles: `
    :host { display: block; }
    th[scope='row'] code { font-size: 0.9em; overflow-wrap: anywhere; }
    td:nth-child(3), td:nth-child(4) { white-space: nowrap; }
  `,
})
export class ArchitectureSection {
  protected readonly packages = PACKAGES;
}
