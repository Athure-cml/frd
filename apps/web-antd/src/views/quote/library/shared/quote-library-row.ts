import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';

export type QuoteLibraryMode = 'fumigation' | 'road' | 'sea';

export type QuoteLibraryRow =
  | FreightCostRecord
  | FumigationCostRecord
  | RoadCostRecord;
