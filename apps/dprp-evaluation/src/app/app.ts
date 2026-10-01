import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArchitectureSection } from './components/architecture-section';
import { ParticipantsSection } from './components/participants-section';
import { RecognitionSection } from './components/recognition-section';
import { SubmissionSection } from './components/submission-section';
import { resolveFieldDefinitions, resolveFieldLabels } from '@penji-demos/record-engine';
import { SiteFooter, SiteHeader, StandardsExplorer } from '@penji-demos/ui';
import { ALL_STANDARDS, CONFIGURATION, DemoStore } from './state/demo-store';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, SiteFooter, RecognitionSection, ParticipantsSection, StandardsExplorer, SubmissionSection, ArchitectureSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(DemoStore);
  protected readonly standards = ALL_STANDARDS;
  protected readonly labels = resolveFieldLabels(CONFIGURATION);
  protected readonly fields = resolveFieldDefinitions(CONFIGURATION);
  protected readonly formTitles = Object.fromEntries(CONFIGURATION.forms.map((form) => [form.id, form.title]));
}
