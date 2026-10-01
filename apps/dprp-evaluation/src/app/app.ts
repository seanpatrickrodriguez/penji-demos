import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArchitectureSection } from './components/architecture-section';
import { ParticipantsSection } from './components/participants-section';
import { RecognitionSection } from './components/recognition-section';
import { SubmissionSection } from './components/submission-section';
import { ENROLLMENT_FORM, FACT_LABELS, SESSION_FORM } from '@penji-demos/program-records';
import { SiteFooter, SiteHeader, StandardsExplorer } from '@penji-demos/ui';
import { ALL_STANDARDS, DemoStore } from './state/demo-store';

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
  protected readonly labels = FACT_LABELS;
  protected readonly formTitles = { [ENROLLMENT_FORM.id]: 'Enrollment', [SESSION_FORM.id]: 'Session' };
}
