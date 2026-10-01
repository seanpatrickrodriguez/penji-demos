import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CANONICAL_FORM, DELIVERY_MODE, GUIDANCE_ACTION_TYPE, SESSION_FIELD, VALIDATION_SEVERITY } from '@penji-demos/constants';
import { describeRuleCheck, isGuidanceOpen, resolveConstrainedForm, resolveFieldConstraints } from '@penji-demos/compliance-engine';
import {
  ENROLLMENT_FORM,
  FACT_LABELS,
  SESSION_FORM,
  resolveEnrollmentAnswers,
  resolveEnrollmentFromAnswers,
  resolveParticipantFacts,
  resolveSessionAnswers,
  resolveSessionFromAnswers,
} from '@penji-demos/program-records';
import { Answers, GuidanceActionType, GuidanceItem } from '@penji-demos/types';
import { ALL_STANDARDS, DemoStore, RECOGNITION_STANDARD } from '../state/demo-store';
import { CHART, resolveWeightChart } from '../view/chart-view';
import { SEVERITY_LABEL, formatDate } from '../view/format';
import { resolveGuidanceSummary, resolveSessionRows } from '../view/participant-view';
import { DefinitionForm } from './definition-form';

type Editing =
  | { readonly form: typeof CANONICAL_FORM.SESSION; readonly index: number | null; readonly focus: string | null }
  | { readonly form: typeof CANONICAL_FORM.ENROLLMENT; readonly focus: string | null };

interface GuidanceView {
  readonly item: GuidanceItem;
  readonly severity: string;
  readonly severityClass: string;
  readonly when: string;
  readonly check: string;
  readonly open: boolean;
  readonly resolution: string;
}

@Component({
  selector: 'app-participant-panel',
  imports: [DefinitionForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participant-panel.html',
  styleUrl: './participant-panel.scss',
})
export class ParticipantPanel {
  protected readonly store = inject(DemoStore);
  protected readonly chartSize = CHART;
  protected readonly editing = signal<Editing | null>(null);
  protected readonly accepting = signal<string | null>(null);
  protected readonly confirmingRemoval = signal<number | null>(null);
  protected readonly acceptNote = signal('');
  protected readonly acceptProblems = signal<readonly string[]>([]);
  // Enrollment answers while the form is open, so rules that depend on them (Medicare) apply as they change.
  private readonly draftEnrollment = signal<Answers | null>(null);

  protected readonly participant = this.store.selectedParticipant;
  protected readonly evaluation = this.store.participantEvaluation;

  protected readonly chart = computed(() => {
    const evaluation = this.evaluation();
    const cohort = this.store.selectedCohort();
    return evaluation && cohort ? resolveWeightChart(RECOGNITION_STANDARD, evaluation, cohort.firstSessionDate) : null;
  });

  protected readonly standards = computed(() =>
    (this.evaluation()?.standards ?? []).map((standard, index) => ({
      ...standard,
      citation: ALL_STANDARDS[index]?.source.title ?? '',
      citationUrl: ALL_STANDARDS[index]?.source.url ?? '',
    })),
  );

  protected readonly guidance = computed<readonly GuidanceView[]>(() =>
    this.store.participantGuidance().map((item) => ({
      item,
      severity: SEVERITY_LABEL[item.rule.severity],
      severityClass: item.rule.severity,
      when: item.finding.sessionDate ? `Session of ${formatDate(item.finding.sessionDate)}` : 'Enrollment record',
      check: describeRuleCheck(item.rule.check, FACT_LABELS),
      open: isGuidanceOpen(item),
      resolution: item.resolution
        ? `${item.resolution.action === GUIDANCE_ACTION_TYPE.ACCEPT ? 'Accepted' : 'Deferred'} by ${item.resolution.resolvedBy}, ${new Date(item.resolution.resolvedAt).toLocaleString()}${item.resolution.note ? `: "${item.resolution.note}"` : ''}`
        : '',
    })),
  );

  protected readonly summary = computed(() => resolveGuidanceSummary(this.store.participantGuidance()));

  protected readonly sessionRows = computed(() => {
    const evaluation = this.evaluation();
    const participant = this.participant();
    return evaluation && participant ? resolveSessionRows(evaluation, participant.sessions, this.store.participantGuidance()) : [];
  });

  private readonly facts = computed(() => {
    const participant = this.participant();
    const cohort = this.store.selectedCohort();
    if (!participant || !cohort) return {};
    const facts = resolveParticipantFacts(participant, cohort);
    const draft = this.draftEnrollment();
    return draft ? { ...facts, ...draft } : facts;
  });

  protected readonly sessionConstraints = computed(() => resolveFieldConstraints(SESSION_FORM, CANONICAL_FORM.SESSION, ALL_STANDARDS, this.facts()));
  protected readonly sessionForm = computed(() => resolveConstrainedForm(SESSION_FORM, this.sessionConstraints()));
  protected readonly enrollmentConstraints = computed(() => resolveFieldConstraints(ENROLLMENT_FORM, CANONICAL_FORM.ENROLLMENT, ALL_STANDARDS, this.facts()));
  protected readonly enrollmentForm = computed(() => resolveConstrainedForm(ENROLLMENT_FORM, this.enrollmentConstraints()));

  protected readonly sessionInitial = computed<Answers>(() => {
    const editing = this.editing();
    const participant = this.participant();
    if (!editing || editing.form !== CANONICAL_FORM.SESSION || !participant) return {};
    const session = editing.index === null ? null : participant.sessions[editing.index];
    return session
      ? resolveSessionAnswers(session)
      : { [SESSION_FIELD.WEIGHT_REPORTED]: true, [SESSION_FIELD.IS_MAKE_UP]: false, [SESSION_FIELD.DELIVERY_MODE]: DELIVERY_MODE.IN_PERSON, [SESSION_FIELD.ACTIVITY_MINUTES]: 0 };
  });
  protected readonly enrollmentInitial = computed<Answers>(() => {
    const participant = this.participant();
    return participant ? resolveEnrollmentAnswers(participant.enrollment) : {};
  });

  protected readonly editingSession = computed(() => {
    const editing = this.editing();
    return editing?.form === CANONICAL_FORM.SESSION ? editing : null;
  });
  protected readonly editingEnrollment = computed(() => {
    const editing = this.editing();
    return editing?.form === CANONICAL_FORM.ENROLLMENT ? editing : null;
  });

  protected close(): void {
    this.store.selectParticipant(null);
  }

  protected editSession(index: number | null, focus: string | null = null): void {
    this.editing.set({ form: CANONICAL_FORM.SESSION, index, focus });
  }

  protected editEnrollment(focus: string | null = null): void {
    this.draftEnrollment.set(null);
    this.editing.set({ form: CANONICAL_FORM.ENROLLMENT, focus });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.draftEnrollment.set(null);
  }

  protected saveSession(answers: Answers): void {
    const editing = this.editingSession();
    const participant = this.participant();
    if (!editing || !participant) return;
    const previous = editing.index === null ? null : (participant.sessions[editing.index] ?? null);
    const session = resolveSessionFromAnswers(answers, previous);
    if (session) this.store.saveSession(participant.participantId, editing.index, session);
    this.editing.set(null);
  }

  protected removeSession(index: number): void {
    const participant = this.participant();
    if (participant) this.store.removeSession(participant.participantId, index);
    this.confirmingRemoval.set(null);
  }

  protected draftChanged(answers: Answers): void {
    this.draftEnrollment.set(answers);
  }

  protected saveEnrollment(answers: Answers): void {
    const participant = this.participant();
    if (participant) this.store.saveEnrollment(participant.participantId, resolveEnrollmentFromAnswers(answers, participant.enrollment));
    this.cancelEdit();
  }

  // "Fix this": open the form the rule names, at the session it found, on the field to change.
  protected fix(item: GuidanceItem): void {
    const target = item.target;
    const participant = this.participant();
    if (!target || !participant) return;
    if (target.form === CANONICAL_FORM.ENROLLMENT) {
      this.editEnrollment(target.field);
      return;
    }
    const index = participant.sessions.findIndex((session) => session.sessionDate === target.sessionDate);
    this.editSession(index >= 0 ? index : null, target.field);
  }

  protected act(item: GuidanceItem, action: GuidanceActionType): void {
    if (action === GUIDANCE_ACTION_TYPE.CHANGE) return this.fix(item);
    if (action === GUIDANCE_ACTION_TYPE.ACCEPT) {
      this.accepting.set(item.id);
      this.acceptNote.set('');
      this.acceptProblems.set([]);
      return;
    }
    this.store.resolveGuidance(item, action, '');
  }

  protected confirmAccept(item: GuidanceItem): void {
    const problems = this.store.resolveGuidance(item, GUIDANCE_ACTION_TYPE.ACCEPT, this.acceptNote());
    this.acceptProblems.set(problems);
    if (problems.length === 0) this.accepting.set(null);
  }

  protected setNote(event: Event): void {
    this.acceptNote.set(event.target instanceof HTMLTextAreaElement ? event.target.value : '');
  }

  protected readonly severityError = VALIDATION_SEVERITY.ERROR;
}
