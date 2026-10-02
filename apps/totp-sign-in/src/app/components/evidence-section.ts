import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ACCOUNT_NAME, POLICY, SignInStore } from '../state/sign-in-store';
import { resolveEvidenceRows, resolveStoredRecord } from '../view/sign-in-view';

// What the server checked for each code, and what it keeps for the account.
@Component({
  selector: 'app-evidence-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evidence-section.html',
  styleUrl: './evidence-section.scss',
})
export class EvidenceSection {
  private readonly store = inject(SignInStore);
  protected readonly accountName = ACCOUNT_NAME;
  protected readonly rows = computed(() => resolveEvidenceRows(POLICY, this.store.verifications()));
  protected readonly record = computed(() => {
    const account = this.store.account();
    return account === null ? null : resolveStoredRecord(POLICY, account, this.store.now());
  });
}
