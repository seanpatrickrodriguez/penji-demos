import { PlainDate } from '@penji-demos/types';

// Calendar dates as a person reads them: "Sep 15, 2026", "September 2026".

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthIndex = (date: PlainDate) => Number(date.slice(5, 7)) - 1;

export const formatMonth = (date: PlainDate): string => `${MONTHS[monthIndex(date)] ?? ''} ${date.slice(0, 4)}`;
export const formatShortMonth = (date: PlainDate): string => `${(MONTHS[monthIndex(date)] ?? '').slice(0, 3)} ${date.slice(0, 4)}`;
export const formatDate = (date: PlainDate): string => `${(MONTHS[monthIndex(date)] ?? '').slice(0, 3)} ${Number(date.slice(8, 10))}, ${date.slice(0, 4)}`;
