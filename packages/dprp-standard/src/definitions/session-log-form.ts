import { DEFINITION_KIND, DELIVERY_MODE, DELIVERY_MODE_CODE, SUBMISSION_COLUMN } from '@penji-demos/constants';
import { ChoiceOption, FormDefinition, toDefinitionId } from '@penji-demos/types';
import { resolveDataElement } from './data-dictionary-2024';

// M1: the form a coach uses to record one session, resolved from the data
// dictionary, so its limits are the dictionary's limits.  Change the
// dictionary and the form follows.

const DELIVERY_MODE_BY_CODE: ReadonlyMap<string | number, string> = new Map([
  [DELIVERY_MODE_CODE.IN_PERSON, DELIVERY_MODE.IN_PERSON],
  [DELIVERY_MODE_CODE.ONLINE, DELIVERY_MODE.ONLINE],
  [DELIVERY_MODE_CODE.DISTANCE_LEARNING, DELIVERY_MODE.DISTANCE_LEARNING],
]);

export function resolveSessionLogForm(): FormDefinition {
  const date = resolveDataElement(SUBMISSION_COLUMN.SESSION_DATE);
  const weight = resolveDataElement(SUBMISSION_COLUMN.WEIGHT);
  const activity = resolveDataElement(SUBMISSION_COLUMN.PHYSICAL_ACTIVITY);
  const mode = resolveDataElement(SUBMISSION_COLUMN.DELIVERY_MODE);
  const modeOptions: ChoiceOption[] = mode.codes.flatMap((coded) => {
    const value = DELIVERY_MODE_BY_CODE.get(coded.code);
    return value ? [{ value, label: coded.meaning }] : [];
  });

  return {
    kind: DEFINITION_KIND.FORM,
    id: toDefinitionId('dprp-session-log'),
    version: '2024',
    title: 'Record a session',
    description: 'One session attended by one participant, as Table 5 defines it.',
    source: date.source,
    fields: [
      { kind: 'date', key: 'sessionDate', label: date.title, required: true },
      { kind: 'yesNo', key: 'isMakeUp', label: 'Was this a make-up session?', required: true },
      { kind: 'choice', key: 'deliveryMode', label: mode.title, required: true, options: modeOptions },
      { kind: 'yesNo', key: 'weightReported', label: 'Was a weight recorded?', required: true },
      {
        kind: 'number',
        key: 'weightPounds',
        label: `${weight.title} (${weight.unit})`,
        help: weight.description,
        required: true,
        ...(weight.range ? { min: weight.range.min, max: weight.range.max } : {}),
        showWhen: { kind: 'equals', field: 'weightReported', value: true },
      },
      {
        kind: 'number',
        key: 'activityMinutes',
        label: `${activity.title}`,
        help: activity.description,
        required: true,
        wholeNumber: true,
        ...(activity.range ? { min: activity.range.min } : {}),
      },
    ],
    rules: [],
  };
}
