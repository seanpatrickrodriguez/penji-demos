import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RULES_SECTIONS } from '../view/network-view';

@Component({
  selector: 'app-rules-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (section of sections; track section.title; let index = $index) {
      <div class="part">
        <h3 [id]="'rules-part-' + index">{{ section.title }}</h3>
        <p class="origin" [class.generated]="section.generated">{{ section.origin }}</p>
        <pre tabindex="0" role="region" [attr.aria-labelledby]="'rules-part-' + index"><code>{{ section.text }}</code></pre>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .part {
      margin-top: var(--space-5);
    }
    h3 {
      margin: 0 0 var(--space-1);
    }
    .origin {
      margin: 0;
      color: var(--text-muted);
      font-weight: 600;
    }
    .origin.generated {
      color: var(--ok);
    }
    pre {
      margin: var(--space-2) 0 0;
      max-height: 28rem;
      overflow: auto;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--rule);
      border-radius: 4px;
      padding: var(--space-3);
    }
  `,
})
export class RulesSection {
  protected readonly sections = RULES_SECTIONS;
}
