import { downloadFileFromBlob } from '@vben/utils';

export { seaCostApi } from './freight';
export { fumigationCostApi } from './fumigation';
export * from './road';
export * from './templates';
export * from './types';

import type { CostMode } from './types';

import { seaCostApi } from './freight';
import { fumigationCostApi } from './fumigation';
import * as roadApi from './road';

export const costApiMap = {
  fumigation: fumigationCostApi,
  road: {
    batchDelete: roadApi.batchDeleteRoadCost,
    batchUpdate: roadApi.batchUpdateRoadCost,
    create: roadApi.createRoadCost,
    delete: roadApi.deleteRoadCost,
    export: roadApi.exportRoadCost,
    import: roadApi.importRoadCost,
    list: roadApi.getRoadCostList,
    update: roadApi.updateRoadCost,
  },
  sea: seaCostApi,
} as const;

export function getCostApi(mode: CostMode) {
  return costApiMap[mode];
}

export async function downloadCostExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
