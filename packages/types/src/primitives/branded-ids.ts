import { Brand } from './brand';

export type DefinitionId = Brand<string, 'DefinitionId'>;
export type TenantId = Brand<string, 'TenantId'>;
export type ActorId = Brand<string, 'ActorId'>;
export type AssignmentId = Brand<string, 'AssignmentId'>;
export type EntityId = Brand<string, 'EntityId'>;
export type EntryId = Brand<string, 'EntryId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
export type VesselId = Brand<string, 'VesselId'>;
export type PersonId = Brand<string, 'PersonId'>;
export type WantItemId = Brand<string, 'WantItemId'>;

// The one boundary where plain strings become branded IDs.  Every other file
// receives IDs already typed.
export const toDefinitionId = (value: string): DefinitionId => value as DefinitionId;
export const toTenantId = (value: string): TenantId => value as TenantId;
export const toActorId = (value: string): ActorId => value as ActorId;
export const toAssignmentId = (value: string): AssignmentId => value as AssignmentId;
export const toEntityId = (value: string): EntityId => value as EntityId;
export const toEntryId = (value: string): EntryId => value as EntryId;
export const toCompanyId = (value: string): CompanyId => value as CompanyId;
export const toVesselId = (value: string): VesselId => value as VesselId;
export const toPersonId = (value: string): PersonId => value as PersonId;
export const toWantItemId = (value: string): WantItemId => value as WantItemId;
