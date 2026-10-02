import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteFooter, SiteHeader } from '@penji-demos/ui';
import { ArchitectureSection } from './components/architecture-section';
import { EvidenceSection } from './components/evidence-section';
import { PolicySection } from './components/policy-section';
import { TrySection } from './components/try-section';
import { SignInStore } from './state/sign-in-store';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, SiteFooter, TrySection, EvidenceSection, PolicySection, ArchitectureSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(SignInStore);
}
