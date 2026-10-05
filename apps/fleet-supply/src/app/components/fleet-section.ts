import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject } from '@angular/core';
import { VESSEL_FIELD } from '@penji-demos/constants';
import { describeRecordValue } from '@penji-demos/record-engine';
import { Answers, EntityId } from '@penji-demos/types';
import { CONFIGURATION, FleetStore } from '../state/fleet-store';
import { resolveEntityRows } from '../view/fleet-view';
import { VesselPanel } from './vessel-panel';

// A vessel at a glance: what it is, and whether it is in service.
const summarizeVessel = (values: Answers): string => {
  const kind = describeRecordValue(CONFIGURATION, VESSEL_FIELD.KIND, values[VESSEL_FIELD.KIND]);
  const cargo = values[VESSEL_FIELD.CARGO] ? `, ${describeRecordValue(CONFIGURATION, VESSEL_FIELD.CARGO, values[VESSEL_FIELD.CARGO]).toLowerCase()}` : '';
  return `${kind}${cargo}${values[VESSEL_FIELD.IN_SERVICE] === false ? ' (out of service)' : ''}`;
};

@Component({
  selector: 'app-fleet-section',
  imports: [VesselPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fleet-section.html',
  styleUrl: './fleet-section.scss',
})
export class FleetSection {
  protected readonly store = inject(FleetStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly rows = computed(() => resolveEntityRows(CONFIGURATION, this.store.data(), this.store.viewerId(), this.store.guidance(), summarizeVessel));
  protected readonly waiting = computed(() => this.rows().reduce((total, row) => total + row.waitingOnViewer, 0));

  protected open(entityId: EntityId): void {
    this.store.selectEntity(entityId);
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('#vessel-heading')?.focus(), { injector: this.injector });
  }
}
