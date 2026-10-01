import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteFooter, SiteHeader } from '@penji-demos/ui';
import { ArchitectureSection } from './components/architecture-section';
import { DefinitionsSection } from './components/definitions-section';
import { FleetSection } from './components/fleet-section';
import { ViewerSection } from './components/viewer-section';
import { FleetStore } from './state/fleet-store';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, SiteFooter, ViewerSection, FleetSection, DefinitionsSection, ArchitectureSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(FleetStore);
}
