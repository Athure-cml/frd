/** 卡车成本库行数据（对齐业务 Excel 表头） */
export interface RoadCostRecord {
  id: string;
  validDate: string;
  supplier: string;
  logYardNameAddress: string;
  city: string;
  state: string;
  por: string;
  pol: string;
  baseFreight: number;
  fsc: number;
  chassis: number;
  owTriAxle: number;
  split: number;
  stopOff: number;
  allIn: number;
  allInNonOak: number;
  allInOak: number;
  waitingFee: number;
  redelivery: number;
  prepull: number;
  nsLift: number;
  remark?: string;
}

export interface RoadCostQueryForm {
  city?: string;
  pol?: string;
  state?: string;
  supplier?: string;
}
