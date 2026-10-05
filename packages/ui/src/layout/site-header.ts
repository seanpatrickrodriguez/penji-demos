// The header from seanrodriguez.dev, with plain links back into the site.
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="site-header">
      <div class="container">
        <a class="wordmark" href="/">Sean Rodriguez</a>
        <nav aria-label="Main">
          <ul>
            <li><a href="/#work">Case studies</a></li>
            <li><a href="/#work-with-me">Work with me</a></li>
            <li><a href="/#experience">Experience</a></li>
            <li><a href="/#contact">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  `,
  styles: `
    .site-header {
      border-bottom: 1px solid var(--rule);
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2) var(--space-4);
      padding-top: var(--space-3);
      padding-bottom: var(--space-3);
    }
    .wordmark {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
      text-decoration: none;
    }
    .wordmark:hover {
      color: var(--text);
      text-decoration: underline;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
      list-style: none;
      margin: 0;
      padding: 0;
    }
  `,
})
export class SiteHeader {}
