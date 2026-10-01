import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SUBMISSION_COLUMN } from '@penji-demos/constants';
import { resolveSubmissionCsv, resolveSubmissionRows } from '@penji-demos/dprp-recognition';
import { resolveDataAsOf } from '@penji-demos/record-engine';
import { CONFIGURATION, DemoStore, ORGANIZATION_ID, RECOGNITION_STANDARD } from '../state/demo-store';
import { formatMonth } from '@penji-demos/ui';

const PREVIEW_ROWS = 8;

@Component({
  selector: 'app-submission-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      The records are stored in plain terms.  The DPRP's column names and codes are applied only here, when the file is made:
      a missing weight becomes 999, a make-up in month 8 becomes MU-CM, and the prediabetes columns come from the DPRP's own eligibility bases.
    </p>
    <p class="muted">{{ rows().length }} session rows for the {{ month() }} submission, in the column order of Table 5.</p>
    <div class="table-scroll" tabindex="0" role="region" aria-label="First rows of the submission file">
      <table class="data-table">
        <thead>
          <tr>
            @for (column of columns; track column) { <th scope="col">{{ column }}</th> }
          </tr>
        </thead>
        <tbody>
          @for (row of preview(); track $index) {
            <tr>
              @for (column of columns; track column) { <td>{{ row[column] }}</td> }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p class="actions"><button type="button" class="button button-primary" (click)="download()">Download the {{ month() }} file (CSV)</button></p>
  `,
  styles: `
    :host { display: block; }
    .actions { margin-top: var(--space-3); }
    td { white-space: nowrap; }
  `,
})
export class SubmissionSection {
  private readonly store = inject(DemoStore);
  protected readonly columns = Object.values(SUBMISSION_COLUMN);
  protected readonly month = computed(() => formatMonth(this.store.selected().evaluation.submissionMonth));
  protected readonly rows = computed(() => {
    const month = this.store.selected().evaluation.submissionMonth;
    return resolveSubmissionRows(RECOGNITION_STANDARD, CONFIGURATION, resolveDataAsOf(CONFIGURATION, this.store.data(), month), ORGANIZATION_ID, month);
  });
  protected readonly preview = computed(() => this.rows().slice(0, PREVIEW_ROWS));

  protected download(): void {
    const blob = new Blob([resolveSubmissionCsv(this.rows())], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dprp-submission-${this.store.selected().evaluation.submissionMonth.slice(0, 7)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
