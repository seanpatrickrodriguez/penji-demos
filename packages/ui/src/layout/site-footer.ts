// The footer from seanrodriguez.dev, with the same theme choice, saved under the same key.
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { THEME_CHOICES, ThemeChoice, ThemeService } from '../theme/theme';

const THEME_LABELS: Record<ThemeChoice, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <div class="container">
        <p>© {{ year }} Sean Rodriguez</p>
        <fieldset class="theme-choice">
          <legend>Theme</legend>
          @for (option of options; track option.choice) {
            <button
              type="button"
              [attr.aria-pressed]="theme.choice() === option.choice"
              (click)="theme.select(option.choice)"
            >
              {{ option.label }}
            </button>
          }
        </fieldset>
      </div>
    </footer>
  `,
  styles: `
    .site-footer {
      border-top: 1px solid var(--rule);
      padding: var(--space-4) 0 var(--space-5);
      color: var(--text-muted);
      font-size: 1rem;
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    p {
      margin: 0;
    }
    .theme-choice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      float: left;
      margin-right: var(--space-2);
      padding: 0;
    }
    button {
      font: inherit;
      font-size: 1rem;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--control-border);
      border-radius: 4px;
      padding: 0.25rem 0.75rem;
      cursor: pointer;
    }
    button[aria-pressed='true'] {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--on-accent);
    }
  `,
})
export class SiteFooter {
  protected readonly theme = inject(ThemeService);
  protected readonly year = new Date().getFullYear();
  protected readonly options = THEME_CHOICES.map((choice) => ({ choice, label: THEME_LABELS[choice] }));
}
