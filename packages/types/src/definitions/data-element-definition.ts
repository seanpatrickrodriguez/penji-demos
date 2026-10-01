import { DEFINITION_KIND } from '@penji-demos/constants';
import { Definition } from './definition';
import { InclusiveRange } from './standard-definition';

export interface CodedValue {
  readonly code: string | number;
  readonly meaning: string;
}

// M2: one variable of a submission data dictionary: its column name, what it
// means, and either its coded values or its allowed numeric range and the
// sentinel used when the value was not reported.
export interface DataElementDefinition extends Definition<typeof DEFINITION_KIND.DATA_ELEMENT> {
  readonly column: string;
  readonly description: string;
  readonly codes: readonly CodedValue[];
  readonly range: InclusiveRange | null;
  readonly notReported: number | null;
  readonly unit: string | null;
}
