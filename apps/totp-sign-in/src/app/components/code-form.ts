import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

// One labeled field for a code and the button that sends it.
@Component({
  selector: 'app-code-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form novalidate (submit)="send($event)">
      <label class="label" [for]="fieldId()">{{ label() }}</label>
      <p class="hint" [id]="fieldId() + '-hint'">{{ hint() }}</p>
      <div class="row">
        <input
          [id]="fieldId()"
          type="text"
          [attr.inputmode]="numeric() ? 'numeric' : null"
          [attr.autocomplete]="numeric() ? 'one-time-code' : 'off'"
          autocapitalize="characters"
          spellcheck="false"
          [class.numeric]="numeric()"
          [value]="value()"
          [attr.aria-describedby]="fieldId() + '-hint'"
          (input)="type($event)"
        />
        <button type="submit" class="button button-primary" [disabled]="busy()">{{ submitLabel() }}</button>
      </div>
    </form>
  `,
  styles: `
    .label {
      display: block;
      font-weight: 600;
    }
    .hint {
      margin: 0 0 var(--space-2);
      color: var(--text-muted);
      font-size: var(--text-small);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: stretch;
    }
    input {
      flex: 1 1 10rem;
      min-width: 0;
      max-width: 16rem;
      font: inherit;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--control-border);
      border-radius: 4px;
      padding: 0.5rem 0.75rem;
      letter-spacing: 0.08em;
    }
    input.numeric {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CodeForm {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input.required<string>();
  readonly submitLabel = input.required<string>();
  readonly numeric = input(true);
  readonly busy = input(false);
  readonly value = model.required<string>();
  readonly submitted = output<void>();

  protected type(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.value.set(event.target.value);
  }

  protected send(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
