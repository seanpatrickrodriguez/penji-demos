import { Answers, PlainDate } from '@penji-demos/types';

// What the engine checks: a participant's facts and their session records,
// each as plain field values.  The domain builds a subject from its own
// records; the engine never sees a record type.
export interface ComplianceSubject {
  readonly facts: Answers;
  readonly sessions: readonly SubjectSession[];
}

export interface SubjectSession {
  readonly sessionDate: PlainDate;
  readonly values: Answers;
}

// Labels for field keys, used when a finding shows the values it checked.
export type FieldLabels = Readonly<Record<string, string>>;
