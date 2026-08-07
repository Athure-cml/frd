export type CostMode = 'fumigation' | 'road' | 'sea';

export type CostStatus = 'active' | 'expired';

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface CostImportResult {
  errors: string[];
  failed: number;
  imported: number;
}

export interface CostBatchUpdatePayload {
  fields: Record<string, unknown>;
  ids: number[];
}

export interface FreightCostRecord {
  agent?: string;
  allIn?: number;
  buc?: number;
  bucValidDate?: string;
  cnShortName?: string;
  containerType?: string;
  ebs?: number;
  ebsValidDate?: string;
  enProductName?: string;
  extraFields?: Record<string, unknown>;
  freight?: number;
  freightValidDate?: string;
  gri?: number;
  griValidDate?: string;
  id: number;
  others?: number;
  othersValidDate?: string;
  pod: string;
  pol: string;
  por?: string;
  remark?: string;
  ssl: string;
  status?: CostStatus;
  updatedAt?: string;
}

export interface FreightCostSave {
  agent?: string;
  allIn?: number;
  buc?: number;
  bucValidDate?: string;
  cnShortName?: string;
  containerType?: string;
  ebs?: number;
  ebsValidDate?: string;
  enProductName?: string;
  extraFields?: Record<string, unknown>;
  freight?: number;
  freightValidDate?: string;
  gri?: number;
  griValidDate?: string;
  others?: number;
  othersValidDate?: string;
  pod: string;
  pol: string;
  por?: string;
  remark?: string;
  ssl: string;
  status?: CostStatus;
}

export interface RoadCostRecord {
  allInFmOneWay: number;
  allInFmRound: number;
  allInNoFm: number;
  baseFreight?: number;
  chassis?: number;
  city: string;
  extraFields?: Record<string, unknown>;
  fsc?: number;
  id: number;
  logYardNameAddress?: string;
  otherFee?: number;
  pol: string;
  por: string;
  prepull?: number;
  redelivery?: number;
  remark?: string;
  split?: number;
  state: string;
  status?: CostStatus;
  stopOff?: number;
  supplier: string;
  nsLift?: number;
  triTandemAxle?: number;
  updatedAt?: string;
  validDate?: string;
  waitingFee?: number;
  zipCode: string;
}

export type RoadCostSave = Omit<RoadCostRecord, 'id' | 'updatedAt'>;

export interface FumigationCostRecord {
  address?: string;
  extraFields?: Record<string, unknown>;
  id: number;
  indoorNonOak?: number;
  indoorOak?: number;
  indoorValidity?: string;
  outdoorNonOak?: number;
  outdoorOak?: number;
  outdoorValidity?: string;
  region?: string;
  remark?: string;
  station?: string;
  status?: CostStatus;
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
