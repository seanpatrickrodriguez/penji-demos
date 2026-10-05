import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { resolveConstrainedForm, resolveFieldConstraints } from '@penji-demos/compliance-engine';
import { resolveEntityDefinition, resolveEntityFacts, resolveEntityStandards, resolveEntryAnswers } from '@penji-demos/record-engine';
import { Answers, EntityRecord, EntryId } from '@penji-demos/types';
import { DefinitionForm } from '@penji-demos/ui';
import { AS_OF, CONFIGURATION, FleetStore } from '../state/fleet-store';
import { EntryView, StepView, StreamView } from '../view/fleet-view';

// Which entry's form is open, and the field to start on.
export interface EntryEditing {
  readonly entryId: EntryId | null;
  readonly focus: string | null;
}

// A step that needs a note, waiting for one.
interface PendingStep {
  readonly entryId: EntryId;
  readonly step: StepView;
}

// One stream of an entity: its entries newest first, each with the workflow
// steps this person may take, the steps they may not and why, and the entry's
// history.  Adding, editing and removing are offered by the access policy.
@Component({
  selector: 'app-stream-section',
  imports: [DefinitionForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stream-section.html',
  styleUrl: './stream-section.scss',
})
export class StreamSection {
  protected readonly store = inject(FleetStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly view = input.required<StreamView>();
  readonly entity = input.required<EntityRecord>();
  readonly editing = input<EntryEditing | null>(null);
  readonly edit = output<EntryEditing>();
  readonly closeEditor = output<void>();

  protected readonly confirmingRemoval = signal<EntryId | null>(null);
  protected readonly pending = signal<PendingStep | null>(null);
  protected readonly note = signal('');
  // Problems from the last step, by entry.
  protected readonly stepProblems = signal<ReadonlyMap<EntryId, readonly string[]>>(new Map());
  // A short confirmation of the last change, read out to screen readers.
  protected readonly announcement = signal('');

  private readonly editedEntry = computed(() => {
    const editing = this.editing();
    return editing?.entryId ? (this.store.data().entries.find((entry) => entry.entryId === editing.entryId) ?? null) : null;
  });

  private readonly facts = computed<Answers>(() => {
    const entityFacts = resolveEntityFacts(CONFIGURATION, this.store.data(), this.entity(), AS_OF);
    const entry = this.editedEntry();
    return entry ? { ...entityFacts, ...resolveEntryAnswers(CONFIGURATION, entry) } : entityFacts;
  });

  private readonly standards = computed(() => {
    const definition = resolveEntityDefinition(CONFIGURATION, this.entity().kind);
    return definition ? resolveEntityStandards(CONFIGURATION, definition) : [];
  });

  protected readonly constraints = computed(() => {
    const form = this.view().form;
    return form ? resolveFieldConstraints(form, this.view().stream.id, this.standards(), this.facts()) : [];
  });
  protected readonly form = computed(() => {
    const form = this.view().form;
    return form ? resolveConstrainedForm(form, this.constraints()) : null;
  });
  // Each entry with what is open on it: a step waiting for its note, and what stopped the last step.
  protected readonly rows = computed(() =>
    this.view().entries.map((entry) => {
      const pending = this.pending();
      return {
        entry,
        pendingStep: pending?.entryId === entry.entryId ? pending.step : null,
        problems: this.stepProblems().get(entry.entryId) ?? [],
        // Without any role here, every step is refused for the same reason, said once above.
        blocked: this.view().hasRole ? entry.blocked : entry.blocked.filter((blocked) => blocked.held),
        confirmingRemoval: this.confirmingRemoval() === entry.entryId,
        editing: this.editing()?.entryId === entry.entryId,
      };
    }),
  );
  protected readonly adding = computed(() => this.editing()?.entryId === null);
  protected readonly initial = computed<Answers>(() => this.editedEntry()?.values ?? {});
  protected readonly idPrefix = computed(() => `${this.view().stream.id}-${this.editing()?.entryId ?? 'new'}`);

  protected save(answers: Answers): void {
    const editing = this.editing();
    if (!editing) return;
    const label = this.view().stream.entryLabel.toLowerCase();
    const saved = editing.entryId === null ? this.store.addEntry(this.entity().entityId, this.view().stream.id, answers) : this.store.updateEntry(editing.entryId, answers);
    if (saved) {
      this.announcement.set(editing.entryId === null ? `Added the ${label}.` : `Saved the ${label}.`);
      this.closeEditor.emit();
    }
  }

  protected take(entry: EntryView, step: StepView): void {
    if (step.needsNote) {
      this.pending.set({ entryId: entry.entryId, step });
      this.note.set('');
      afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(`note-${entry.entryId}`)}`)?.focus(), { injector: this.injector });
      return;
    }
    this.apply(entry, step, '');
  }

  protected confirmStep(entry: EntryView): void {
    const pending = this.pending();
    if (!pending) return;
    if (this.apply(entry, pending.step, this.note())) this.pending.set(null);
  }

  protected setNote(event: Event): void {
    this.note.set(event.target instanceof HTMLTextAreaElement ? event.target.value : '');
  }

  protected remove(entry: EntryView): void {
    if (this.store.removeEntry(entry.entryId)) this.announcement.set(`Removed ${entry.title}.`);
    this.confirmingRemoval.set(null);
  }

  private apply(entry: EntryView, step: StepView, note: string): boolean {
    const problems = this.store.applyTransition(entry.entryId, step.id, note);
    this.stepProblems.update((all) => new Map(all).set(entry.entryId, problems));
    if (problems.length === 0) this.announcement.set(`${step.label}: ${entry.title}.`);
    return problems.length === 0;
  }
}
