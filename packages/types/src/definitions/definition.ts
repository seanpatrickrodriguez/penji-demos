import { DEFINITION_KIND } from '@penji-demos/constants';
import { DefinitionId } from '../primitives/branded-ids';
import { ValueOf } from '../primitives/brand';

// M3: what every definition is, whatever it defines.  A definition has a kind,
// a stable ID, a version and the source it was written from, so any rule can
// be traced to the document and section that require it.
export type DefinitionKind = ValueOf<typeof DEFINITION_KIND>;

export interface SourceReference {
  readonly title: string;
  readonly url: string;
  readonly section?: string;
}

export interface Definition<Kind extends DefinitionKind> {
  readonly kind: Kind;
  readonly id: DefinitionId;
  readonly version: string;
  readonly title: string;
  readonly source: SourceReference;
}
