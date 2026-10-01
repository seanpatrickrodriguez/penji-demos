import { Brand } from './brand';

export type OrganizationCode = Brand<string, 'OrganizationCode'>;
export type CohortId = Brand<string, 'CohortId'>;
export type ParticipantId = Brand<string, 'ParticipantId'>;
export type CoachId = Brand<string, 'CoachId'>;
export type DefinitionId = Brand<string, 'DefinitionId'>;

// The one boundary where plain strings become branded IDs.  Every other file
// receives IDs already typed.
export const toOrganizationCode = (value: string): OrganizationCode => value as OrganizationCode;
export const toCohortId = (value: string): CohortId => value as CohortId;
export const toParticipantId = (value: string): ParticipantId => value as ParticipantId;
export const toCoachId = (value: string): CoachId => value as CoachId;
export const toDefinitionId = (value: string): DefinitionId => value as DefinitionId;
