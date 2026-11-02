import type { Recordable } from '@vben/types';

import type {
  QuoteOakType,
  QuoteServiceType,
  QuoteTransportMode,
} from './index';

import { requestClient } from '#/api/request';

export type InquiryStatus =
  | 'EXPIRED'
  | 'PENDING_QUOTE'
  | 'PENDING_SUBMIT'
  | 'QUOTED'
  | 'VOIDED';

export namespace InquiryApi {
  export interface ListItem {
    city?: string;
    createdAt?: string;
    createdByName?: string;
    customerId?: number;
    customerName: string;
    fumigationPoint?: string;
    id: number;
    inquiryNo: string;
    oakType?: QuoteOakType | string;
    pickUpAddress?: string;
    pod?: string;
    pol?: string;
    por?: string;
    quoteDate?: string;
    quoteId?: number;
    serviceTypes?: QuoteServiceType[];
    state?: string;
    status: InquiryStatus;
    updatedAt?: string;
    validUntil?: string;
    zipCode?: string;
  }

  export interface Detail extends ListItem {
    fumigationEnabled?: boolean;
    quoteNo?: string;
    remark?: string;
    routeSummary?: string;
    submittedAt?: string;
    transportMode?: QuoteTransportMode;
  }

  export interface SaveRequest {
    city?: string;
    customerId?: null | number;
    customerName?: string;
    fumigationEnabled?: boolean;
    fumigationPoint?: string;
    oakType?: null | QuoteOakType;
    pickUpAddress?: string;
    pod?: string;
    pol?: string;
    por?: string;
    quoteDate?: string;
    remark?: string;
    routeSummary?: string;
    serviceTypes?: QuoteServiceType[];
    state?: string;
    transportMode?: QuoteTransportMode;
    validUntil?: string;
    zipCode?: string;
  }
}

export async function getInquiryList(params: Recordable<any> = {}) {
  return requestClient.get<{ items: InquiryApi.ListItem[]; total: number }>(
    '/inquiries',
    { params },
  );
}

export async function getInquiryDetail(id: number) {
  return requestClient.get<InquiryApi.Detail>(`/inquiries/${id}`);
}

export async function createInquiry(data: InquiryApi.SaveRequest) {
  return requestClient.post<InquiryApi.Detail>('/inquiries', data);
}

export async function updateInquiry(id: number, data: InquiryApi.SaveRequest) {
  return requestClient.put<InquiryApi.Detail>(`/inquiries/${id}`, data);
}

export async function submitInquiry(id: number) {
  return requestClient.post<InquiryApi.Detail>(`/inquiries/${id}/submit`);
}

export async function deleteInquiry(id: number) {
  return requestClient.delete(`/inquiries/${id}`);
}
