import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArchitectureSection } from './components/architecture-section';
import { ParticipantsSection } from './components/participants-section';
import { RecognitionSection } from './components/recognition-section';
import { StandardsSection } from './components/standards-section';
import { SubmissionSection } from './components/submission-section';
import { SiteFooter } from './layout/site-footer';
import { SiteHeader } from './layout/site-header';
import { DemoStore } from './state/demo-store';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, SiteFooter, RecognitionSection, ParticipantsSection, StandardsSection, SubmissionSection, ArchitectureSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(DemoStore);
}
