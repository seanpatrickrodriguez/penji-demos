import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteFooter, SiteHeader } from '@penji-demos/ui';
import { ArchitectureSection } from './components/architecture-section';
import { NetworkSection } from './components/network-section';
import { RulesSection } from './components/rules-section';
import { TrySection } from './components/try-section';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, SiteFooter, NetworkSection, TrySection, RulesSection, ArchitectureSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
