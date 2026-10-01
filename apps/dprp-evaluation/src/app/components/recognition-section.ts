import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DemoStore, RECOGNITION_STANDARD } from '../state/demo-store';
import { STATUS_LABEL } from '../view/format';
import { formatWindow, resolveCohortRows, resolveRequirementRows, resolveSubmissionViews, resolveTierGroups } from '../view/recognition-view';

@Component({
  selector: 'app-recognition-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recognition-section.html',
  styleUrl: './recognition-section.scss',
})
export class RecognitionSection {
  protected readonly store = inject(DemoStore);
  protected readonly submissions = computed(() => resolveSubmissionViews(this.store.timeline()));
  protected readonly current = computed(() => this.submissions()[this.store.selectedSequence() - 1]);
  protected readonly requirements = computed(() => resolveRequirementRows(this.store.selected()));
  protected readonly tiers = computed(() => resolveTierGroups(RECOGNITION_STANDARD, this.store.selected()));
  protected readonly cohorts = computed(() => resolveCohortRows(this.store.cohorts(), this.store.selected()));
  protected readonly window = computed(() => formatWindow(this.store.selected()));
  protected readonly evaluatedLabel = computed(() => STATUS_LABEL[this.store.selected().evaluation.status]);

  protected select(sequence: number): void {
    this.store.selectSubmission(sequence);
  }

  // Arrow keys move between submissions, as in a tab list.
  protected step(event: KeyboardEvent, sequence: number): void {
    const last = this.submissions().length;
    const next = event.key === 'ArrowRight' ? Math.min(sequence + 1, last) : event.key === 'ArrowLeft' ? Math.max(sequence - 1, 1) : null;
    if (next === null) return;
    event.preventDefault();
    this.select(next);
    const target = event.currentTarget instanceof HTMLElement ? event.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-sequence="${next}"]`) : null;
    target?.focus();
  }
}
