import { GUIDANCE_ACTION_TYPE } from '@penji-demos/constants';
import { GuidanceAction, GuidanceItem, GuidanceResolution, RuleDefinition, RuleFinding } from '@penji-demos/types';

// A stable ID for a finding, so a resolution still matches it after the record is re-evaluated.
export const resolveGuidanceId = (subjectId: string, finding: RuleFinding): string =>
  [subjectId, finding.standardShortName, finding.ruleId, finding.eventDate ?? 'record'].join(':');

// What a person can do about a finding.  Change is offered only where there is
// a field to change, accept only where the rule allows the record to stand, and
// defer always.
export function resolveGuidanceActions(rule: RuleDefinition): readonly GuidanceAction[] {
  return [
    ...(rule.fixTarget ? [{ actionType: GUIDANCE_ACTION_TYPE.CHANGE, label: 'Fix this', primary: true }] : []),
    ...(rule.bypassable ? [{ actionType: GUIDANCE_ACTION_TYPE.ACCEPT, label: 'Accept as is', primary: !rule.fixTarget }] : []),
    { actionType: GUIDANCE_ACTION_TYPE.DEFER, label: 'Later', primary: false },
  ];
}

export function resolveGuidanceItem(
  subjectId: string,
  rule: RuleDefinition,
  finding: RuleFinding,
  resolutions: ReadonlyMap<string, GuidanceResolution>,
): GuidanceItem {
  const id = resolveGuidanceId(subjectId, finding);
  return {
    id,
    rule,
    finding,
    target: rule.fixTarget ? { ...rule.fixTarget, eventDate: finding.eventDate } : null,
    requiresAction: rule.blocks,
    availableActions: resolveGuidanceActions(rule),
    resolution: resolutions.get(id) ?? null,
  };
}

// A resolution is valid when its action is one the item offers, and an
// acceptance always says why.
export function validateResolution(item: GuidanceItem, action: GuidanceResolution['action'], note: string): readonly string[] {
  const problems: string[] = [];
  if (!item.availableActions.some((available) => available.actionType === action)) problems.push('That action is not available for this item.');
  if (action === GUIDANCE_ACTION_TYPE.ACCEPT && note.trim() === '') problems.push('Say why the record can stand as it is.');
  return problems;
}

// An item is open until it is accepted; deferring keeps it open for later.
export const isGuidanceOpen = (item: GuidanceItem): boolean => item.resolution?.action !== GUIDANCE_ACTION_TYPE.ACCEPT;

// True while any open item blocks the record.
export const isRecordBlocked = (items: readonly GuidanceItem[]): boolean => items.some((item) => item.requiresAction && isGuidanceOpen(item));
