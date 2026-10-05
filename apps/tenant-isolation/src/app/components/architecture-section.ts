import { ChangeDetectionStrategy, Component } from '@angular/core';

interface PackageRow {
  readonly name: string;
  readonly holds: string;
}

const PACKAGES: readonly PackageRow[] = [
  { name: 'constants', holds: 'The stored collections and fields, the token claims, the request kinds and the rule clauses.' },
  { name: 'types', holds: 'The M0 tenants, staff, assignments and entities, and the shapes they take in the database: stored records, token claims and requests.' },
  { name: 'record-engine', holds: 'The tenant tree, the entity tree, role rules and assignments: who holds which roles over which records.' },
  { name: 'security-rules-engine', holds: 'Stored lines and token claims from the record engine, the Firestore rules generated from a configuration, and the reading of what those rules decide.' },
  { name: 'dprp-configuration', holds: 'The diabetes prevention program as definitions: hubs and organizations, cohorts, forms and the access policy.' },
  { name: 'dprp-seed', holds: 'The synthetic Lantern Bay network, its demo accounts and the requests this page sends.' },
  { name: 'ui', holds: 'The site’s layout and theme, shared with the other demos.' },
];

@Component({
  selector: 'app-architecture-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      The tenants, staff and cohorts on this page are the same platform records the other demos use, under the same diabetes prevention
      program configuration.  Each organization is a tenant, and one organization can oversee another.  A staff member's position gives
      their role, and an assignment says where it applies: a tenant and everything under it, or one cohort.
    </p>
    <p>
      The server works out two things the browser could not be trusted with.  Each stored record carries its line: its own ID and its
      ancestors'.  Each person's sign-in token carries their roles and the tenants and records their assignments cover.  The rules then
      need one comparison to tell whether a scope covers a record, and the browser can change neither.
    </p>
    <div class="table-scroll" tabindex="0" role="region" aria-labelledby="tenant-packages-caption">
      <table class="data-table">
        <caption id="tenant-packages-caption">The packages this demo is built from.</caption>
        <thead>
          <tr><th scope="col">Package</th><th scope="col">Holds</th></tr>
        </thead>
        <tbody>
          @for (row of packages; track row.name) {
            <tr><th scope="row"><code>{{ row.name }}</code></th><td>{{ row.holds }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <p>
      The rules are tested in the Firestore emulator: every request on this page, for every demo account, a person signed in with no staff
      record and nobody signed in, each answer checked against the rules engine's prediction and, where the request asks only about
      access, against the access policy.  A seed script with the Admin SDK writes the records and sets each account's claims.  This public
      demo leaves adding and removing records to the server, and every save it sends writes a value the record already holds or one the
      rules refuse, so the shared records stay as seeded.
    </p>
  `,
  styles: `
    :host {
      display: block;
    }
    .table-scroll {
      margin: var(--space-4) 0;
    }
  `,
})
export class ArchitectureSection {
  protected readonly packages = PACKAGES;
}
