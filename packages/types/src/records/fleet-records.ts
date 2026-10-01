import { BARGE_CARGO, FLEET_POSITION, SUPPLY_CATEGORY, SUPPLY_STATUS, TOILET_FLUSH, VESSEL_KIND } from '@penji-demos/constants';
import { ValueOf } from '../primitives/brand';
import { CompanyId, PersonId, VesselId, WantItemId } from '../primitives/branded-ids';
import { PlainDate } from '../primitives/plain-date';
import { TransitionRecord } from '../definitions/workflow-definition';

// M0: the fleet's records.  Like the program records, they are stored in
// plain terms; policies and workflows reach them through definitions.

export type VesselKind = ValueOf<typeof VESSEL_KIND>;
export type BargeCargo = ValueOf<typeof BARGE_CARGO>;
export type FleetPosition = ValueOf<typeof FLEET_POSITION>;
export type SupplyStatus = ValueOf<typeof SUPPLY_STATUS>;
export type SupplyCategory = ValueOf<typeof SUPPLY_CATEGORY>;
export type ToiletFlush = ValueOf<typeof TOILET_FLUSH>;

export interface CompanyRecord {
  readonly companyId: CompanyId;
  readonly name: string;
  // The company above this one, if any: the shop answers to the fleet owner.
  readonly parentId: CompanyId | null;
}

// What the shop keeps on file for each vessel.
export interface VesselProfile {
  readonly mainEngines: string;
  readonly generatorEngines: string;
  readonly generators: string;
  readonly potableWaterPump: string;
  readonly potableWaterGallons: number | null;
  readonly toiletFlush: ToiletFlush | null;
  readonly lastAnnualInspection: PlainDate | null;
  readonly lastDryDock: PlainDate | null;
  // For tank barges: the last five- or ten-year tank maintenance.
  readonly lastTankMaintenance: PlainDate | null;
}

export interface VesselRecord {
  readonly vesselId: VesselId;
  readonly ownerId: CompanyId;
  readonly name: string;
  readonly kind: VesselKind;
  readonly cargo: BargeCargo | null;
  readonly inService: boolean;
  readonly profile: VesselProfile;
}

export interface PersonRecord {
  readonly personId: PersonId;
  readonly name: string;
  readonly position: FleetPosition;
  readonly companyId: CompanyId;
  // The vessels this person rotates aboard; empty for shop staff.
  readonly vesselIds: readonly VesselId[];
  // Whether the person is aboard now or on their rotation off.
  readonly aboard: boolean;
}

export interface WantItemRecord {
  readonly itemId: WantItemId;
  readonly vesselId: VesselId;
  readonly requestedBy: PersonId;
  readonly addedDate: PlainDate;
  readonly description: string;
  readonly category: SupplyCategory;
  readonly quantity: number;
  readonly unitCost: number | null;
  // Limited stock or a long lead time at the vendor.
  readonly limited: boolean;
  readonly status: SupplyStatus;
  readonly history: readonly TransitionRecord[];
}

export interface FleetData {
  readonly asOfDate: PlainDate;
  readonly companies: readonly CompanyRecord[];
  readonly vessels: readonly VesselRecord[];
  readonly people: readonly PersonRecord[];
  readonly wantItems: readonly WantItemRecord[];
}
