import type { QuoteApi } from '#/api/quote';

import { requestClient } from '#/api/request';

export namespace ApprovalApi {
  export type ListStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'WITHDRAWN';

  export interface ListItem {
    approvalNo: string;
    approvalType: string;
    completedAt?: string;
    currentNode: string;
    cycleIndex?: number;
    id: number;
    initiatedAt?: string;
    initiatorDept?: string;
    initiatorName: string;
    duration?: string;
    relatedDocNo?: string;
    rowKey?: string;
    status: ListStatus;
  }

  export interface LogItem {
    action: string;
    comment?: string;
    createdAt: string;
    fromStatus?: string;
    id: number;
    operatorId: number;
    operatorName: string;
    toStatus?: string;
  }

  export interface WorkflowStep {
    comment?: string;
    key: string;
    operatedAt?: string;
    operatorName?: string;
    status: 'error' | 'finish' | 'process' | 'wait';
    title: string;
  }

  export interface Detail {
    logs: LogItem[];
    pendingApproval: boolean;
    quote: QuoteApi.QuoteDetail;
    workflowSteps: WorkflowStep[];
  }

  export type ConfigObject = 'QUOTE';

  export interface ConfigFlowStep {
    approverId: number;
    approverName: string;
  }

  export interface ConfigItem {
    configNo: string;
    configObject: ConfigObject;
    flowSteps: ConfigFlowStep[];
    id: number;
  }

  export interface ConfigSave {
    configObject: ConfigObject;
    flowSteps: Array<{ approverId: number }>;
  }
}

export async function getQuoteApprovalList(params: {
  approvalNo?: string;
  page?: number;
  pageSize?: number;
  status?: ApprovalApi.ListStatus;
}) {
  return requestClient.get<{ items: ApprovalApi.ListItem[]; total: number }>(
    '/approvals/quotes',
    { params },
  );
}

export async function getQuoteApprovalDetail(id: number, cycle?: number) {
  return requestClient.get<ApprovalApi.Detail>(`/approvals/quotes/${id}`, {
    params: cycle ? { cycle } : {},
  });
}

export async function approveQuoteWithComment(id: number, comment: string) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/send`, {
    comment,
  });
}

export async function rejectQuoteApproval(id: number, comment: string) {
  return requestClient.post<QuoteApi.QuoteDetail>(
    `/quotes/${id}/reject-approval`,
    { comment },
  );
}

export async function getApprovalConfigList(params?: {
  configNo?: string;
  configObject?: ApprovalApi.ConfigObject;
  page?: number;
  pageSize?: number;
}) {
  return requestClient.get<{ items: ApprovalApi.ConfigItem[]; total: number }>(
    '/approvals/configs',
    { params },
  );
}

export async function createApprovalConfig(data: ApprovalApi.ConfigSave) {
  return requestClient.post<ApprovalApi.ConfigItem>('/approvals/configs', data);
}

export async function updateApprovalConfig(
  id: number,
  data: ApprovalApi.ConfigSave,
) {
  return requestClient.put<ApprovalApi.ConfigItem>(
    `/approvals/configs/${id}`,
    data,
  );
}

export async function deleteApprovalConfig(id: number) {
  return requestClient.delete(`/approvals/configs/${id}`);
}
