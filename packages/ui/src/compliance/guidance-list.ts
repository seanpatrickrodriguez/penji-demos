import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { GUIDANCE_ACTION_TYPE, VALIDATION_SEVERITY } from '@penji-demos/constants';
import { FieldLabels, describeRuleCheck, isGuidanceOpen } from '@penji-demos/compliance-engine';
import { GuidanceActionType, GuidanceItem, PlainDate } from '@penji-demos/types';
import { SEVERITY_LABEL } from './labels';

interface GuidanceView {
  readonly item: GuidanceItem;
  readonly severity: string;
  readonly severityClass: string;
  readonly when: string;
  readonly check: string;
  readonly open: boolean;
  readonly resolution: string;
}

export type ResolveGuidance = (item: GuidanceItem, action: GuidanceActionType, note: string) => readonly string[];

// A record review: each finding with its rule, citation, guidance and the
// actions its rule allows.  Accepting asks for a reason and shows who and when.
@Component({
  selector: 'app-guidance-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guidance-list.html',
  styleUrl: './guidance-list.scss',
})
export class GuidanceList {
  readonly items = input.required<readonly GuidanceItem[]>();
  readonly labels = input.required<FieldLabels>();
  // What one event is called ("Session", "Item") and what the subject's own record is called.
  readonly eventLabel = input.required<string>();
  readonly recordLabel = input.required<string>();
  readonly blockingLabel = input('blocking');
  readonly formatDate = input.required<(date: PlainDate) => string>();
  readonly resolve = input.required<ResolveGuidance>();
  readonly fix = output<GuidanceItem>();
  readonly reopen = output<GuidanceItem>();

  protected readonly accepting = signal<string | null>(null);
  protected readonly acceptNote = signal('');
  protected readonly acceptProblems = signal<readonly string[]>([]);

  protected readonly views = computed<readonly GuidanceView[]>(() =>
    this.items().map((item) => ({
      item,
      severity: SEVERITY_LABEL[item.rule.severity],
      severityClass: item.rule.severity,
      when: item.finding.eventDate ? `${this.eventLabel()} of ${this.formatDate()(item.finding.eventDate)}` : this.recordLabel(),
      check: describeRuleCheck(item.rule.check, this.labels()),
      open: isGuidanceOpen(item),
      resolution: item.resolution
        ? `${item.resolution.action === GUIDANCE_ACTION_TYPE.ACCEPT ? 'Accepted' : 'Deferred'} by ${item.resolution.resolvedBy}, ${new Date(item.resolution.resolvedAt).toLocaleString()}${item.resolution.note ? `: "${item.resolution.note}"` : ''}`
        : '',
    })),
  );

  protected readonly summary = computed(() => {
    const open = this.items().filter(isGuidanceOpen);
    const blocking = open.filter((item) => item.requiresAction && item.rule.severity === VALIDATION_SEVERITY.ERROR).length;
    const accepted = this.items().length - open.length;
    return `${open.length} open${blocking ? `, ${blocking} ${this.blockingLabel()}` : ''}${accepted ? `, ${accepted} accepted` : ''}.`;
  });

  protected act(item: GuidanceItem, action: GuidanceActionType): void {
    if (action === GUIDANCE_ACTION_TYPE.CHANGE) {
      this.fix.emit(item);
      return;
    }
    if (action === GUIDANCE_ACTION_TYPE.ACCEPT) {
      this.accepting.set(item.id);
      this.acceptNote.set('');
      this.acceptProblems.set([]);
      return;
    }
    this.resolve()(item, action, '');
  }

  protected confirmAccept(item: GuidanceItem): void {
    const problems = this.resolve()(item, GUIDANCE_ACTION_TYPE.ACCEPT, this.acceptNote());
    this.acceptProblems.set(problems);
    if (problems.length === 0) this.accepting.set(null);
  }

  protected setNote(event: Event): void {
    this.acceptNote.set(event.target instanceof HTMLTextAreaElement ? event.target.value : '');
  }
}
