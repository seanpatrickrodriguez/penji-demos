import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { EntityId } from '@penji-demos/types';
import { ALL_STANDARDS, DemoStore } from '../state/demo-store';
import { resolveParticipantRows } from '../view/participant-view';
import { ParticipantPanel } from './participant-panel';

const BLOCKING_RULE_IDS: ReadonlySet<string> = new Set(ALL_STANDARDS.flatMap((standard) => standard.rules.filter((rule) => rule.blocks).map((rule) => rule.id)));

type Filter = 'evaluated' | 'all' | 'flagged' | 'medicare';

@Component({
  selector: 'app-participants-section',
  imports: [ParticipantPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participants-section.html',
  styleUrl: './participants-section.scss',
})
export class ParticipantsSection {
  protected readonly store = inject(DemoStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly filter = signal<Filter>('evaluated');
  protected readonly filters: readonly { readonly value: Filter; readonly label: string }[] = [
    { value: 'evaluated', label: 'In the evaluation cohort' },
    { value: 'flagged', label: 'With record findings' },
    { value: 'medicare', label: 'On Medicare' },
    { value: 'all', label: 'Everyone on record' },
  ];

  private readonly allRows = computed(() => resolveParticipantRows(this.store.selected(), BLOCKING_RULE_IDS));
  protected readonly rows = computed(() => {
    const rows = this.allRows();
    switch (this.filter()) {
      case 'evaluated':
        return rows.filter((row) => row.inEvaluationCohort);
      case 'flagged':
        return rows.filter((row) => row.findings > 0);
      case 'medicare':
        return rows.filter((row) => row.mdpp !== 'notApplicable');
      case 'all':
        return rows;
    }
  });

  protected setFilter(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : 'evaluated';
    const match = this.filters.find((filter) => filter.value === value);
    if (match) this.filter.set(match.value);
  }

  protected open(participantId: EntityId): void {
    this.store.selectParticipant(participantId);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('#participant-heading')?.focus(), { injector: this.injector });
  }
}
