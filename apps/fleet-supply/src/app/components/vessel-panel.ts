import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { resolveConstrainedForm, resolveFieldConstraints } from '@penji-demos/compliance-engine';
import {
  resolveEntityDefinition,
  resolveEntityFacts,
  resolveEntityStandards,
  resolveFieldDefinitions,
  resolveFieldLabels,
  resolveForm,
  resolvePermissionOption,
  resolveRecordAnswers,
} from '@penji-demos/record-engine';
import { Answers, GuidanceItem, RuleFinding } from '@penji-demos/types';
import { DefinitionForm, GuidanceList, ResolveGuidance, formatDate } from '@penji-demos/ui';
import { AS_OF, CONFIGURATION, FleetStore } from '../state/fleet-store';
import { describeValues, resolveEntityName, resolveEventName, resolveRolesHere, resolveStreamViews } from '../view/fleet-view';
import { EntryEditing, StreamSection } from './stream-section';

type Editing = { readonly kind: 'record'; readonly focus: string | null } | ({ readonly kind: 'entry'; readonly streamId: string } & EntryEditing);

// One entity, read entirely through its definition: its record and the rules
// on it, the review of every finding, and every stream it keeps.
@Component({
  selector: 'app-vessel-panel',
  imports: [DefinitionForm, GuidanceList, StreamSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vessel-panel.html',
  styleUrl: './vessel-panel.scss',
})
export class VesselPanel {
  protected readonly store = inject(FleetStore);
  protected readonly labels = resolveFieldLabels(CONFIGURATION);
  protected readonly fields = resolveFieldDefinitions(CONFIGURATION);
  protected readonly formatDate = formatDate;
  protected readonly resolveGuidance: ResolveGuidance = (item, action, note) => this.store.resolveGuidance(item, action, note);
  protected readonly describeEvent = (finding: RuleFinding): string => resolveEventName(CONFIGURATION, this.store.data(), finding.eventId) ?? formatDate(finding.eventDate ?? AS_OF);

  protected readonly editing = signal<Editing | null>(null);
  // The record's answers while its form is open, so rules that depend on them apply as they change.
  private readonly draft = signal<Answers | null>(null);

  protected readonly entity = this.store.selectedEntity;
  private readonly definition = computed(() => {
    const entity = this.entity();
    return entity ? resolveEntityDefinition(CONFIGURATION, entity.kind) : null;
  });
  private readonly recordForm = computed(() => {
    const definition = this.definition();
    return definition ? resolveForm(CONFIGURATION, definition.formId) : null;
  });
  private readonly standards = computed(() => {
    const definition = this.definition();
    return definition ? resolveEntityStandards(CONFIGURATION, definition) : [];
  });

  protected readonly name = computed(() => {
    const entity = this.entity();
    return entity ? resolveEntityName(CONFIGURATION, entity) : '';
  });
  protected readonly recordTitle = computed(() => this.recordForm()?.title ?? 'Record');
  protected readonly rolesHere = computed(() => {
    const entity = this.entity();
    return entity ? resolveRolesHere(CONFIGURATION, this.store.data(), this.store.viewerId(), entity) : [];
  });
  protected readonly guidance = computed<readonly GuidanceItem[]>(() => {
    const entity = this.entity();
    return entity ? (this.store.guidance().get(entity.entityId) ?? []) : [];
  });
  protected readonly streams = computed(() => {
    const entity = this.entity();
    return entity ? resolveStreamViews(CONFIGURATION, this.store.data(), this.store.viewerId(), entity, this.guidance()) : [];
  });
  protected readonly streamRows = computed(() =>
    this.streams().map((view) => {
      const editing = this.editing();
      return { view, editing: editing?.kind === 'entry' && editing.streamId === view.stream.id ? { entryId: editing.entryId, focus: editing.focus } : null };
    }),
  );

  protected readonly record = computed(() => {
    const entity = this.entity();
    return entity ? describeValues(this.recordForm(), resolveRecordAnswers(CONFIGURATION, entity)) : [];
  });
  protected readonly editRecord = computed(() => {
    const entity = this.entity();
    const definition = this.definition();
    return entity && definition ? resolvePermissionOption(CONFIGURATION, this.store.data(), this.store.viewerId(), definition.editPermission, entity) : null;
  });

  private readonly facts = computed<Answers>(() => {
    const entity = this.entity();
    if (!entity) return {};
    const facts = resolveEntityFacts(CONFIGURATION, this.store.data(), entity, AS_OF);
    const draft = this.draft();
    return draft ? { ...facts, ...draft } : facts;
  });
  protected readonly recordConstraints = computed(() => {
    const form = this.recordForm();
    return form ? resolveFieldConstraints(form, null, this.standards(), this.facts()) : [];
  });
  protected readonly constrainedRecordForm = computed(() => {
    const form = this.recordForm();
    return form ? resolveConstrainedForm(form, this.recordConstraints()) : null;
  });
  protected readonly recordInitial = computed<Answers>(() => this.entity()?.values ?? {});
  protected readonly editingRecord = computed(() => {
    const editing = this.editing();
    return editing?.kind === 'record' ? editing : null;
  });

  protected close(): void {
    this.store.selectEntity(null);
  }

  protected openRecord(focus: string | null = null): void {
    this.draft.set(null);
    this.editing.set({ kind: 'record', focus });
  }

  protected openEntry(streamId: string, editing: EntryEditing): void {
    this.editing.set({ kind: 'entry', streamId, ...editing });
  }

  protected closeEditor(): void {
    this.editing.set(null);
    this.draft.set(null);
  }

  protected draftChanged(answers: Answers): void {
    this.draft.set(answers);
  }

  protected saveRecord(answers: Answers): void {
    const entity = this.entity();
    if (entity && this.store.updateEntity(entity.entityId, answers)) this.closeEditor();
  }

  // "Fix this": open the form the rule names, at the entry it found, on the field to change, when this person may change it.
  protected fix(item: GuidanceItem): void {
    const target = item.target;
    const entity = this.entity();
    if (!target || !entity) return;
    if (target.form === this.definition()?.formId) {
      const option = this.editRecord();
      if (option && !option.available) {
        this.store.changeProblems.set([option.reason ?? 'Not available.']);
        return;
      }
      this.openRecord(target.field);
      return;
    }
    const stream = this.streams().find((view) => view.stream.formId === target.form);
    const entry = stream?.entries.find((candidate) => candidate.entryId === target.eventId);
    if (!stream || !entry) return;
    if (!entry.edit.available) {
      this.store.changeProblems.set([entry.edit.reason ?? 'Not available.']);
      return;
    }
    this.openEntry(stream.stream.id, { entryId: entry.entryId, focus: target.field });
  }
}
