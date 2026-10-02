import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FLEET_WALKTHROUGH } from '@penji-demos/fleet-seed';
import { ActorId } from '@penji-demos/types';
import { CONFIGURATION, FleetStore } from '../state/fleet-store';
import { resolveActorName, resolveActorTitle, resolveViewer, resolveViewerGroups } from '../view/fleet-view';

// Who the page acts as.  Every button below is offered or refused for this
// person by the record engine: their position gives their roles under the
// access policy, and their assignments say where those roles apply.
@Component({
  selector: 'app-viewer-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './viewer-section.html',
  styleUrl: './viewer-section.scss',
})
export class ViewerSection {
  protected readonly store = inject(FleetStore);

  protected readonly groups = computed(() => resolveViewerGroups(CONFIGURATION, this.store.data(), 'off rotation'));
  protected readonly viewer = computed(() => resolveViewer(CONFIGURATION, this.store.data(), this.store.viewer()));
  protected readonly stops = computed(() =>
    FLEET_WALKTHROUGH.map((stop) => {
      const actor = this.store.data().actors.find((candidate) => candidate.actorId === stop.actorId);
      return {
        actorId: stop.actorId,
        name: resolveActorName(this.store.data(), stop.actorId),
        title: actor ? resolveActorTitle(CONFIGURATION, actor) : '',
        does: stop.does,
        current: stop.actorId === this.store.viewerId(),
      };
    }),
  );

  protected choose(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    const actor = this.store.data().actors.find((candidate) => candidate.actorId === value);
    if (actor) this.store.selectViewer(actor.actorId);
  }

  protected viewAs(actorId: ActorId): void {
    this.store.selectViewer(actorId);
  }
}
