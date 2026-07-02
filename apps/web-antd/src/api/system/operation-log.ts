import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace OperationLogApi {
  export type OperationAction = 'CREATE' | 'DELETE' | 'UPDATE';

  export interface OperationLog {
    action: OperationAction;
    createdAt: string;
    errorMessage?: string;
    id: number;
    ipAddress?: string;
    module: string;
    realName?: string;
    requestBody?: string;
    requestMethod?: string;
    requestUri?: string;
    resourceId?: string;
    resourceType?: string;
    success: boolean;
    summary?: string;
    userId?: number;
    username?: string;
  }

  export interface PageResult {
    items: OperationLog[];
    total: number;
  }
}

export async function getOperationLogList(params: Recordable<any>) {
  return requestClient.get<OperationLogApi.PageResult>('/sys/operation-logs', {
    params,
  });
}

export async function getOperationLogDetail(id: number) {
  return requestClient.get<OperationLogApi.OperationLog>(
    `/sys/operation-logs/${id}`,
  );
}
