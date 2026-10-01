import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { resolveLabel, resolveSubmission, resolveVisibleFields, validateForm } from '@penji-demos/form-engine';
import { AnswerValue, Answers, ChoiceOption, FieldDefinition, FormDefinition, ResolvedFieldConstraint } from '@penji-demos/types';

interface OptionView extends ChoiceOption {
  readonly id: string;
  readonly checked: boolean;
}

// Everything the template shows for one field.
interface FieldView {
  readonly key: string;
  readonly kind: FieldDefinition['kind'];
  readonly inputId: string;
  readonly label: string;
  readonly optional: boolean;
  readonly text: string;
  readonly options: readonly OptionView[];
  readonly errors: readonly string[];
  readonly describedBy: string | null;
  readonly rules: readonly string[];
}

const YES_NO: readonly ChoiceOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

// Renders any form definition with the constraints the active standards put
// on it, and shows under each field which standard each rule came from.
@Component({
  selector: 'app-definition-form',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './definition-form.html',
  styleUrl: './definition-form.scss',
})
export class DefinitionForm {
  readonly definition = input.required<FormDefinition>();
  readonly constraints = input<readonly ResolvedFieldConstraint[]>([]);
  readonly initial = input<Answers>({});
  readonly focusField = input<string | null>(null);
  readonly idPrefix = input.required<string>();
  readonly submitLabel = input('Save');
  readonly saved = output<Answers>();
  readonly changed = output<Answers>();
  readonly cancelled = output<void>();

  private readonly injector = inject(Injector);
  private readonly answers = signal<Answers>({});
  private readonly touched = signal<ReadonlySet<string>>(new Set());
  private readonly submitAttempted = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  constructor() {
    effect(() => {
      this.answers.set(this.initial());
      this.touched.set(new Set());
      this.submitAttempted.set(false);
    });
    effect(() => {
      const field = this.focusField();
      if (!field) return;
      const id = `${this.idPrefix()}-${field}`;
      afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus(), { injector: this.injector });
    });
  }

  private readonly errors = computed(() => validateForm(this.definition(), this.answers()));
  private readonly rulesByField = computed(() => new Map(this.constraints().map((constraint) => [constraint.field, constraint.sources.map((source) => `${source.text}: ${source.standardShortName}, ${source.citation.section ?? source.citation.title}`)])));

  protected readonly fields = computed<readonly FieldView[]>(() => {
    const answers = this.answers();
    const errors = this.errors();
    const showErrors = (key: string) => this.submitAttempted() || this.touched().has(key);
    return resolveVisibleFields(this.definition(), answers)
      .filter((field) => field.kind !== 'calculated')
      .map((field) => {
        const inputId = `${this.idPrefix()}-${field.key}`;
        const value = answers[field.key] ?? null;
        const shown = showErrors(field.key) ? (errors[field.key] ?? []) : [];
        const rules = this.rulesByField().get(field.key) ?? [];
        const selected = typeof value === 'boolean' ? (value ? 'yes' : 'no') : value;
        const choices = field.kind === 'choice' ? field.options : field.kind === 'yesNo' ? YES_NO : [];
        const describedBy = [rules.length ? `${inputId}-rules` : null, shown.length ? `${inputId}-error` : null].filter(Boolean).join(' ');
        return {
          key: field.key,
          kind: field.kind,
          inputId,
          label: resolveLabel(field.label, answers),
          optional: !field.required,
          text: value === null || typeof value === 'boolean' ? '' : String(value),
          options: choices.map((option, index) => ({ ...option, id: index === 0 ? inputId : `${inputId}-${option.value}`, checked: option.value === selected })),
          errors: shown,
          describedBy: describedBy || null,
          rules,
        };
      });
  });

  protected readonly summaryItems = computed(() =>
    this.submitAttempted() ? this.fields().flatMap((field) => field.errors.map((message) => ({ inputId: field.inputId, text: `${field.label}: ${message}` }))) : [],
  );

  protected setText(key: string, event: Event): void {
    this.setAnswer(key, inputValue(event).trim() === '' ? null : inputValue(event));
  }

  protected setNumber(key: string, event: Event): void {
    const trimmed = inputValue(event).trim();
    const parsed = Number(trimmed);
    this.setAnswer(key, trimmed === '' ? null : Number.isFinite(parsed) ? parsed : trimmed);
  }

  protected setChoice(key: string, kind: FieldDefinition['kind'], value: string): void {
    this.setAnswer(key, kind === 'yesNo' ? value === 'yes' : value);
    this.markTouched(key);
  }

  protected markTouched(key: string): void {
    if (!this.touched().has(key)) this.touched.update((keys) => new Set(keys).add(key));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitAttempted.set(true);
    if (Object.keys(this.errors()).length > 0) {
      afterNextRender(() => this.summary()?.nativeElement.focus(), { injector: this.injector });
      return;
    }
    this.saved.emit({ ...this.answers(), ...resolveSubmission(this.definition(), this.answers()) });
  }

  protected focusInput(event: Event, inputId: string): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(inputId)}`)?.focus();
  }

  private setAnswer(key: string, value: AnswerValue): void {
    this.answers.update((answers) => ({ ...answers, [key]: value }));
    this.changed.emit(this.answers());
  }
}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}
