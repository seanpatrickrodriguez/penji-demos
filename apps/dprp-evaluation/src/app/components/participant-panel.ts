import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DELIVERY_MODE, PROGRAM_FORM, PROGRAM_STREAM, SESSION_FIELD } from '@penji-demos/constants';
import { resolveConstrainedForm, resolveFieldConstraints } from '@penji-demos/compliance-engine';
import { ENROLLMENT_FORM, SESSION_FORM } from '@penji-demos/dprp-configuration';
import { resolveEntityFacts, resolveFieldDefinitions, resolveFieldLabels } from '@penji-demos/record-engine';
import { Answers, EntryId, GuidanceItem } from '@penji-demos/types';
import { DefinitionForm, GuidanceList, ResolveGuidance } from '@penji-demos/ui';
import { ALL_STANDARDS, CONFIGURATION, DemoStore, RECOGNITION_STANDARD, THROUGH_MONTH } from '../state/demo-store';
import { CHART, resolveWeightChart } from '../view/chart-view';
import { formatDate } from '../view/format';
import { resolveSessionRows } from '../view/participant-view';

type Editing =
  | { readonly form: typeof PROGRAM_FORM.SESSION; readonly entryId: EntryId | null; readonly focus: string | null }
  | { readonly form: typeof PROGRAM_FORM.ENROLLMENT; readonly focus: string | null };

@Component({
  selector: 'app-participant-panel',
  imports: [DefinitionForm, GuidanceList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participant-panel.html',
  styleUrl: './participant-panel.scss',
})
export class ParticipantPanel {
  protected readonly store = inject(DemoStore);
  protected readonly chartSize = CHART;
  protected readonly editing = signal<Editing | null>(null);
  protected readonly confirmingRemoval = signal<EntryId | null>(null);
  protected readonly labels = resolveFieldLabels(CONFIGURATION);
  protected readonly fields = resolveFieldDefinitions(CONFIGURATION);
  protected readonly formatDate = formatDate;
  protected readonly resolveGuidance: ResolveGuidance = (item, action, note) => this.store.resolveGuidance(item, action, note);
  // Enrollment answers while the form is open, so rules that depend on them (Medicare) apply as they change.
  private readonly draftEnrollment = signal<Answers | null>(null);

  protected readonly participant = this.store.selectedParticipant;
  protected readonly evaluation = this.store.participantEvaluation;

  protected readonly chart = computed(() => {
    const evaluation = this.evaluation();
    const subject = this.store.selectedSubject();
    return evaluation && subject ? resolveWeightChart(RECOGNITION_STANDARD, evaluation, subject.cohortStart) : null;
  });

  protected readonly standards = computed(() =>
    (this.evaluation()?.standards ?? []).map((standard, index) => ({
      ...standard,
      citation: ALL_STANDARDS[index]?.source.title ?? '',
      citationUrl: ALL_STANDARDS[index]?.source.url ?? '',
    })),
  );

  protected readonly sessionRows = computed(() => {
    const evaluation = this.evaluation();
    return evaluation ? resolveSessionRows(evaluation, this.store.participantGuidance()) : [];
  });

  private readonly facts = computed(() => {
    const participant = this.participant();
    if (!participant) return {};
    const facts = resolveEntityFacts(CONFIGURATION, this.store.data(), participant, THROUGH_MONTH);
    const draft = this.draftEnrollment();
    return draft ? { ...facts, ...draft } : facts;
  });

  protected readonly sessionConstraints = computed(() => resolveFieldConstraints(SESSION_FORM, PROGRAM_STREAM.SESSION, ALL_STANDARDS, this.facts()));
  protected readonly sessionForm = computed(() => resolveConstrainedForm(SESSION_FORM, this.sessionConstraints()));
  protected readonly enrollmentConstraints = computed(() => resolveFieldConstraints(ENROLLMENT_FORM, null, ALL_STANDARDS, this.facts()));
  protected readonly enrollmentForm = computed(() => resolveConstrainedForm(ENROLLMENT_FORM, this.enrollmentConstraints()));

  protected readonly sessionInitial = computed<Answers>(() => {
    const editing = this.editing();
    if (!editing || editing.form !== PROGRAM_FORM.SESSION) return {};
    const session = this.store.sessionEntries().find((entry) => entry.entryId === editing.entryId);
    return session
      ? session.values
      : { [SESSION_FIELD.WEIGHT_REPORTED]: true, [SESSION_FIELD.IS_MAKE_UP]: false, [SESSION_FIELD.DELIVERY_MODE]: DELIVERY_MODE.IN_PERSON, [SESSION_FIELD.ACTIVITY_MINUTES]: 0 };
  });
  protected readonly enrollmentInitial = computed<Answers>(() => {
    return this.participant()?.values ?? {};
  });

  protected readonly editingSession = computed(() => {
    const editing = this.editing();
    return editing?.form === PROGRAM_FORM.SESSION ? editing : null;
  });
  protected readonly editingEnrollment = computed(() => {
    const editing = this.editing();
    return editing?.form === PROGRAM_FORM.ENROLLMENT ? editing : null;
  });

  protected close(): void {
    this.store.selectParticipant(null);
  }

  protected editSession(entryId: EntryId | null, focus: string | null = null): void {
    this.editing.set({ form: PROGRAM_FORM.SESSION, entryId, focus });
  }

  protected editEnrollment(focus: string | null = null): void {
    this.draftEnrollment.set(null);
    this.editing.set({ form: PROGRAM_FORM.ENROLLMENT, focus });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.draftEnrollment.set(null);
  }

  protected saveSession(answers: Answers): void {
    const editing = this.editingSession();
    const participant = this.participant();
    if (!editing || !participant) return;
    this.store.saveSession(participant.entityId, editing.entryId, answers);
    this.editing.set(null);
  }

  protected removeSession(entryId: EntryId): void {
    this.store.removeSession(entryId);
    this.confirmingRemoval.set(null);
  }

  protected draftChanged(answers: Answers): void {
    this.draftEnrollment.set(answers);
  }

  protected saveEnrollment(answers: Answers): void {
    const participant = this.participant();
    if (participant) this.store.saveEnrollment(participant.entityId, answers);
    this.cancelEdit();
  }

  // "Fix this": open the form the rule names, at the session it found, on the field to change.
  protected fix(item: GuidanceItem): void {
    const target = item.target;
    if (!target) return;
    if (target.form === PROGRAM_FORM.ENROLLMENT) {
      this.editEnrollment(target.field);
      return;
    }
    const session = this.store.sessionEntries().find((entry) => entry.entryId === target.eventId);
    this.editSession(session?.entryId ?? null, target.field);
  }

}
