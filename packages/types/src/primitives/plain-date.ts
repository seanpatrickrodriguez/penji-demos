import { Brand } from './brand';

// A calendar date with no time or zone, as the DPRP records session dates:
// 'yyyy-mm-dd'.  Created and compared only through @penji-demos/time.
export type PlainDate = Brand<string, 'PlainDate'>;
