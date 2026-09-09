import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export type QuoteTransportMode = 'RAIL' | 'ROAD' | 'SEA';

export type QuoteStatus =
  | 'DRAFT'
  | 'EFFECTIVE'
  | 'EXPIRED'
  | 'FOLLOWING'
  | 'LOST'
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'SENT'
  | 'VOIDED'
  | 'WON';

export type QuoteCostType = 'FUMIGATION' | 'ROAD' | 'SEA';

export namespace QuoteApi {
  export interface QuoteSheetFields {
    cargoAgentFee?: string;
    cargoInsurancePremium?: string;
    cargoMaxWeightTon?: string;
    cifAmount?: number;
    chassis?: number;
    city?: string;
    docUsd?: string;
    fmNonOak?: number;
    fmOak?: number;
    fumigationEnabled?: boolean;
    nsLift?: number;
    oceanFreight?: string;
    pickUpAddress?: string;
    pod?: string;
    pol?: string;
    por?: string;
    redeliveryFee?: number;
    sheetRemark?: string;
    ssl?: string;
    state?: string;
    truckRemark?: string;
    truckingFee?: number;
    truckingNonOakUsd?: number;
    truckingOakUsd?: number;
    waiting?: number;
    zipCode?: string;
    /** @deprecated 使用 oceanFreight */
    ofUsd?: string;
  }

  export interface QuoteCostMatchItem {
    costRefId: number;
    costType: QuoteCostType;
    costVersion?: string;
    matchKeys?: Recordable<any>;
    snapshot?: Recordable<any>;
  }

  export interface QuoteFollowUp {
    content: string;
    followStatus: string;
    followUpAt: string;
    followUpBy: number;
    followUpByName: string;
    id: number;
    updatedAt: string;
  }

  export interface QuoteListItem {
    createdAt: string;
    createdBy: number;
    createdByName: string;
    currency: string;
    customerId?: number;
    customerName: string;
    expired: boolean;
    followUpByName?: string;
    id: number;
    quoteNo: string;
    routeSummary?: string;
    sheet: QuoteSheetFields;
    status: QuoteStatus;
    totalAmount: number;
    transportMode: QuoteTransportMode;
    updatedAt: string;
    validUntil?: string;
    voided: boolean;
    /** 当前用户是否可操作（创建人或超级管理员） */
    operable: boolean;
  }

  export interface QuoteDetail extends QuoteListItem {
    baseCurrency?: string;
    costSnapshots: QuoteCostMatchItem[];
    createdBy: number;
    deptId?: number;
    editable: boolean;
    operable: boolean;
    exchangeRate?: number;
    followUps: QuoteFollowUp[];
    lines: QuoteLine[];
    remark?: string;
    submittedAt?: string;
  }

  export interface QuoteLine {
    amount: number;
    costMode?: string;
    costRefId?: number;
    extraJson?: Recordable<any>;
    id?: number;
    itemName: string;
    quantity: number;
    sort: number;
    spec?: string;
    unit?: string;
    unitPrice: number;
  }

  export interface PageResult {
    items: QuoteListItem[];
    total: number;
  }

  export interface QuoteSave extends QuoteSheetFields {
    costMatches?: QuoteCostMatchItem[];
    currency?: string;
    customerId?: number;
    customerName?: string;
    followUpBy?: number;
    followUpByName?: string;
    lines?: Array<{
      costMode?: string;
      costRefId?: number;
      extraJson?: Recordable<any>;
      itemName: string;
      quantity?: number;
      sort?: number;
      spec?: string;
      unit?: string;
      unitPrice?: number;
    }>;
    remark?: string;
    routeSummary?: string;
    transportMode: QuoteTransportMode;
    validUntil?: string;
  }

  export interface MatchCostsRequest {
    city?: string;
    costType?: QuoteCostType;
    pod?: string;
    pol?: string;
    por?: string;
    ssl?: string;
    state?: string;
    zipCode?: string;
  }

  export interface MatchCostsResponse {
    matched: boolean;
    matches: QuoteCostMatchItem[];
    suggestedFields: QuoteSheetFields;
  }

  export interface GenerateSheetRequest {
    cifAmount?: number;
    fumigationEnabled?: boolean;
    pickUpAddress?: string;
    pod?: string;
    pol?: string;
    por?: string;
    quoteDate?: string;
  }

  export interface GenerateSheetResponse {
    costMatches: QuoteCostMatchItem[];
    quoteDate: string;
    sheet: QuoteSheetFields;
  }
}

export async function lookupQuoteZip(keyword: string, limit = 20) {
  return requestClient.get<
    Array<{
      city: string;
      cityId: number;
      id: number;
      stateCode: string;
      stateId: number;
      zipCode: string;
    }>
  >('/quotes/zip-lookup', { params: { keyword, limit } });
}

export async function getQuoteList(params: Recordable<any>) {
  return requestClient.get<QuoteApi.PageResult>('/quotes', { params });
}

export async function getQuoteDetail(id: number) {
  return requestClient.get<QuoteApi.QuoteDetail>(`/quotes/${id}`);
}

export async function createQuote(data: QuoteApi.QuoteSave) {
  return requestClient.post<QuoteApi.QuoteDetail>('/quotes', data);
}

export async function updateQuote(id: number, data: QuoteApi.QuoteSave) {
  return requestClient.put<QuoteApi.QuoteDetail>(`/quotes/${id}`, data);
}

export async function deleteQuote(id: number) {
  return requestClient.delete(`/quotes/${id}`);
}

export async function matchQuoteCosts(data: QuoteApi.MatchCostsRequest) {
  return requestClient.post<QuoteApi.MatchCostsResponse>(
    '/quotes/match-costs',
    data,
  );
}

export async function generateQuoteSheet(data: QuoteApi.GenerateSheetRequest) {
  return requestClient.post<QuoteApi.GenerateSheetResponse>(
    '/quotes/generate-sheet',
    data,
  );
}

export async function submitQuote(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/submit`);
}

export async function cancelQuoteApproval(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(
    `/quotes/${id}/cancel-approval`,
  );
}

export async function sendQuote(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/send`);
}

export async function rejectQuote(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/reject`);
}

/** @deprecated 使用 sendQuote */
export async function followQuote(id: number) {
  return sendQuote(id);
}

export async function wonQuote(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/won`);
}

export async function voidQuote(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/void`);
}

export async function copyQuote(id: number) {
  return requestClient.post<QuoteApi.QuoteDetail>(`/quotes/${id}/copy`);
}

export async function exportQuotes(params: Recordable<any> = {}) {
  return requestClient.download('/quotes/export', { params });
}

export async function getQuoteOperationLogs(
  id: number,
  params: Recordable<any> = {},
) {
  return requestClient.get<{ items: any[]; total: number }>(
    `/quotes/${id}/operation-logs`,
    { params },
  );
}

export async function getQuoteCostSnapshots(
  id: number,
  costType?: QuoteCostType,
) {
  return requestClient.get<QuoteApi.QuoteCostMatchItem[]>(
    `/quotes/${id}/cost-snapshots`,
    { params: costType ? { costType } : {} },
  );
}

export async function createQuoteFollowUp(
  id: number,
  data: { content: string; followUpBy?: number },
) {
  return requestClient.post<QuoteApi.QuoteFollowUp>(
    `/quotes/${id}/follow-ups`,
    data,
  );
}

export async function updateQuoteFollowUp(
  quoteId: number,
  followUpId: number,
  data: { content: string; followUpBy?: number },
) {
  return requestClient.put<QuoteApi.QuoteFollowUp>(
    `/quotes/${quoteId}/follow-ups/${followUpId}`,
    data,
  );
}

export async function deleteQuoteFollowUp(quoteId: number, followUpId: number) {
  return requestClient.delete(`/quotes/${quoteId}/follow-ups/${followUpId}`);
}
