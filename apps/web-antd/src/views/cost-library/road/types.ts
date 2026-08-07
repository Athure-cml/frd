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
  stopOff?: number;
  supplier: string;
  nsLift?: number;
  triTandemAxle?: number;
  updatedAt?: string;
  validDate?: string;
  waitingFee?: number;
  zipCode: string;
}

export interface RoadCostQueryForm {
  city?: string;
  pol?: string;
  por?: string;
  state?: string;
  supplier?: string;
  zipCode?: string;
}
