import { Answers, PlainDate } from '@penji-demos/types';

// What the engine checks: a subject's facts and its dated history, each as
// plain field values.  A participant with sessions and a vessel with want-list
// items are both subjects; the domain builds one from its own records, and the
// engine never sees a record type.
export interface ComplianceSubject {
  readonly facts: Answers;
  readonly events: readonly SubjectEvent[];
}

export interface SubjectEvent {
  // The stream the event was recorded in, so a rule reads only the events it names.
  readonly streamId: string;
  // What identifies the event within its subject.
  readonly eventId: string;
  readonly eventDate: PlainDate;
  readonly values: Answers;
}

// Labels for field keys, used when a finding shows the values it checked.
export type FieldLabels = Readonly<Record<string, string>>;
