export type CostMode = 'fumigation' | 'road' | 'sea';

export type CostStatus = 'active' | 'draft' | 'expired';

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface CostImportResult {
  failed: number;
  errors: string[];
  imported: number;
}

export interface CostBatchUpdatePayload {
  fields: Record<string, unknown>;
  ids: number[];
}

export interface FreightCostRecord {
  allIn?: number;
  buc?: number;
  carrier: string;
  currency: string;
  destination: string;
  extraFields?: Record<string, unknown>;
  id: number;
  origin: string;
  remark?: string;
  spec: string;
  status: CostStatus;
  surchargeValidDate?: string;
  unit: string;
  unitPrice: number;
  updatedAt: string;
  validDate?: string;
  validFrom: string;
  validTo: string;
}

export interface FreightCostSave {
  allIn?: number;
  buc?: number;
  carrier: string;
  currency: string;
  destination: string;
  extraFields?: Record<string, unknown>;
  origin: string;
  remark?: string;
  spec: string;
  status: CostStatus;
  surchargeValidDate?: string;
  unit: string;
  unitPrice: number;
  validDate?: string;
  validFrom: string;
  validTo: string;
}

export interface RoadCostRecord {
  allIn: number;
  allInNonOak: number;
  allInOak: number;
  baseFreight: number;
  chassis: number;
  city: string;
  extraFields?: Record<string, unknown>;
  fsc: number;
  id: number;
  logYardNameAddress: string;
  nsLift: number;
  owTriAxle: number;
  pol: string;
  por: string;
  prepull: number;
  redelivery: number;
  remark?: string;
  split: number;
  state: string;
  stopOff: number;
  supplier: string;
  updatedAt?: string;
  validDate: string;
  waitingFee: number;
}

export type RoadCostSave = Omit<RoadCostRecord, 'id' | 'updatedAt'>;

export interface FumigationCostRecord {
  extraFields?: Record<string, unknown>;
  id: number;
  nonOakIndoor?: number;
  nonOakOutdoor?: number;
  nonOakQuoteSummer?: string;
  nonOakQuoteWinter?: string;
  oakIndoor?: number;
  oakOutdoor?: number;
  oakQuoteSummer?: string;
  oakQuoteWinter?: string;
  port: string;
  remark?: string;
  station: string;
  updatedAt?: string;
}

export type FumigationCostSave = Omit<FumigationCostRecord, 'id' | 'updatedAt'>;

export interface CostTableFieldOverride {
  align?: 'center' | 'left' | 'right';
  fixed?: 'left' | 'right' | null;
  minWidth?: number;
  required?: boolean;
  title?: string;
  visible?: boolean;
  width?: number;
}

export interface CostTableCustomFieldDef {
  dataType?: 'number' | 'text';
  field: string;
  required?: boolean;
  title: string;
}

export interface CostTableTemplateGroup {
  fields: string[];
  headerClassName?: string;
  key: string;
  labelKey: string;
}

export interface CostTableTemplateLayout {
  customFields?: CostTableCustomFieldDef[];
  fieldOrder?: string[];
  fieldOverrides?: Record<string, CostTableFieldOverride>;
  fields?: string[];
  groups?: CostTableTemplateGroup[];
}

export interface CostTableTemplate {
  code: string;
  createdAt?: string;
  id: number;
  isDefault: boolean;
  layout: CostTableTemplateLayout;
  mode: CostMode;
  name: string;
}

export type CostTableTemplateSave = {
  code?: string;
  isDefault: boolean;
  layout: CostTableTemplateLayout;
  mode: CostMode;
  name: string;
};
