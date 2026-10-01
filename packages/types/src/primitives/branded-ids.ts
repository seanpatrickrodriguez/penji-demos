import { Brand } from './brand';

export type OrganizationCode = Brand<string, 'OrganizationCode'>;
export type CohortId = Brand<string, 'CohortId'>;
export type ParticipantId = Brand<string, 'ParticipantId'>;
export type CoachId = Brand<string, 'CoachId'>;
export type DefinitionId = Brand<string, 'DefinitionId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
export type VesselId = Brand<string, 'VesselId'>;
export type PersonId = Brand<string, 'PersonId'>;
export type WantItemId = Brand<string, 'WantItemId'>;

// The one boundary where plain strings become branded IDs.  Every other file
// receives IDs already typed.
export const toOrganizationCode = (value: string): OrganizationCode => value as OrganizationCode;
export const toCohortId = (value: string): CohortId => value as CohortId;
export const toParticipantId = (value: string): ParticipantId => value as ParticipantId;
export const toCoachId = (value: string): CoachId => value as CoachId;
export const toDefinitionId = (value: string): DefinitionId => value as DefinitionId;
export const toCompanyId = (value: string): CompanyId => value as CompanyId;
export const toVesselId = (value: string): VesselId => value as VesselId;
export const toPersonId = (value: string): PersonId => value as PersonId;
export const toWantItemId = (value: string): WantItemId => value as WantItemId;
