import { isPlainDate, toPlainDate } from '@penji-demos/time';
import { AnswerValue, Answers, PlainDate } from '@penji-demos/types';

// A record's values read by the type a field holds.  A value of another type
// reads as missing, never as a guess.

export const readNumber = (values: Answers, key: string): number | null => {
  const value = values[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const readText = (values: Answers, key: string): string | null => {
  const value = values[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

export const readDate = (values: Answers, key: string): PlainDate | null => {
  const value = values[key];
  return typeof value === 'string' && isPlainDate(value) ? toPlainDate(value) : null;
};

export const readBoolean = (values: Answers, key: string): boolean | null => {
  const value = values[key];
  return typeof value === 'boolean' ? value : null;
};

// A value that is one of a constants object's members, or null.
export const readMember = <Member extends string>(values: Answers, key: string, members: Readonly<Record<string, Member>>): Member | null =>
  Object.values(members).find((member) => member === values[key]) ?? null;

export const isAnswerValue = (value: unknown): value is AnswerValue =>
  value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
