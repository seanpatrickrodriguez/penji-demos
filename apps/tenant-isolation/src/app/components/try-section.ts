import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NETWORK_REQUESTS } from '@penji-demos/dprp-seed';
import { NetworkStore, VISITORS } from '../state/network-store';
import { VISITOR_OPTIONS, resolveClaimsView, resolveResultRows, resolveVisitorLabel } from '../view/network-view';

@Component({
  selector: 'app-try-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './try-section.html',
  styleUrl: './try-section.scss',
})
export class TrySection {
  protected readonly store = inject(NetworkStore);
  protected readonly options = VISITOR_OPTIONS;

  private readonly visitor = computed(() => VISITORS.find((candidate) => candidate.key === this.store.visitorKey()) ?? VISITORS[0]);
  protected readonly chosen = computed(() => {
    const visitor = this.visitor();
    return visitor ? resolveVisitorLabel(visitor) : null;
  });
  protected readonly rows = computed(() => {
    const visitor = this.visitor();
    return visitor ? resolveResultRows(visitor, this.store.run()) : [];
  });
  protected readonly currentRun = computed(() => {
    const run = this.store.run();
    return run && run.visitorKey === this.store.visitorKey() ? run : null;
  });
  protected readonly claims = computed(() => {
    const claims = this.currentRun()?.claims;
    return claims ? resolveClaimsView(claims) : null;
  });
  protected readonly status = computed(() => {
    const run = this.currentRun();
    if (!run) return 'Choose who to be, then send.  The page signs in to the live project as them and sends every request below.';
    if (run.signInError) return run.signInError;
    if (!run.signedIn) return 'Signing in…';
    const answered = run.outcomes.size;
    const total = NETWORK_REQUESTS.length;
    if (!run.finished) return `Sent ${answered} of ${total} requests…`;
    const agreed = this.rows().filter((row) => row.agreed === true).length;
    return `Firestore answered ${answered} of ${total} requests, ${agreed} of them as the rules engine predicted.`;
  });

  protected choose(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.store.choose(event.target.value);
  }
}
