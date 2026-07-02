import type { FieldCatalogEntry } from './types';

import type { CostMode } from '#/api/cost';

import { FUMIGATION_FIELD_CATALOG } from './fumigation';
import { ROAD_FIELD_CATALOG } from './road';
import { SEA_FIELD_CATALOG } from './sea';

export { FUMIGATION_FIELD_CATALOG } from './fumigation';
export { ROAD_FIELD_CATALOG } from './road';
export { SEA_FIELD_CATALOG } from './sea';
export type { FieldCatalogEntry, FieldFormat } from './types';

export function getFieldCatalog(mode: CostMode): FieldCatalogEntry[] {
  if (mode === 'road') {
    return ROAD_FIELD_CATALOG;
  }
  if (mode === 'sea') {
    return SEA_FIELD_CATALOG;
  }
  return FUMIGATION_FIELD_CATALOG;
}

export function toFieldCatalogMap(catalog: FieldCatalogEntry[]) {
  return new Map(catalog.map((entry) => [entry.field, entry]));
}
