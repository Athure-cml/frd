export type {
  CostMode,
  CostStatus,
  FreightCostRecord,
  FreightCostSave,
  RoadCostRecord,
  RoadCostSave,
} from '#/api/cost';

export interface CostQueryForm {
  carrier?: string;
  destination?: string;
  origin?: string;
  status?: import('#/api/cost').CostStatus;
}

/** @deprecated Use FreightCostRecord from #/api/cost */
export type CostRecord = import('#/api/cost').FreightCostRecord;
