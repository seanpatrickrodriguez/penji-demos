import { ChangeDetectionStrategy, Component } from '@angular/core';

interface PackageRow {
  readonly name: string;
  readonly holds: string;
}

const PACKAGES: readonly PackageRow[] = [
  { name: 'constants', holds: 'The factor kinds, hash algorithms, outcomes, alphabets and the bounds the RFCs set.' },
  { name: 'types', holds: 'The M2 factor policy, and the M0 account, factor, recovery code and verification records.' },
  { name: 'factor-engine', holds: 'HOTP and TOTP over Web Crypto, base 32, the otpauth link, recovery codes and their hashes, setup, code checks with drift, replay and lockout, and the policy check.' },
  { name: 'sign-in-configuration', holds: 'The platform’s sign-in policy, as a definition.' },
  { name: 'ui', holds: 'The site’s layout and theme, shared with the other demos.' },
];

@Component({
  selector: 'app-architecture-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      The factor engine reads a policy definition and an account, and returns what it found and the account as it stands after.  It
      holds no state, keeps no clock and makes no random numbers: the time and the random bytes are handed to it, so every check can
      be tested to the second against the RFCs' own test vectors.  The policy is configuration, and the engine knows nothing about the
      product it protects.
    </p>
    <div class="table-scroll" tabindex="0" role="region" aria-labelledby="totp-packages-caption">
      <table class="data-table">
        <caption id="totp-packages-caption">The packages this demo is built from.</caption>
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
      In Penji, setup and every check run on the server.  The secret is made there, handed to the person once as the QR code, and
      never sent to the browser again.  Here the browser plays the server and the phone, so every step can be watched.
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
