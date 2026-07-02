import { requestClient } from '#/api/request';

export namespace ExchangeRateApi {
  export interface ExchangeRate {
    effectiveDate: string;
    fromCurrency: string;
    id: number;
    rate: number;
    status: 0 | 1;
    toCurrency: string;
    updatedAt: string;
  }

  export interface ExchangeRateSave {
    effectiveDate: string;
    fromCurrency: string;
    rate: number;
    status?: 0 | 1;
    toCurrency: string;
  }
}

export async function getExchangeRateList(params?: {
  fromCurrency?: string;
  status?: number;
  toCurrency?: string;
}) {
  return requestClient.get<ExchangeRateApi.ExchangeRate[]>('/exchange-rates', {
    params,
  });
}

export async function createExchangeRate(
  data: ExchangeRateApi.ExchangeRateSave,
) {
  return requestClient.post<ExchangeRateApi.ExchangeRate>(
    '/exchange-rates',
    data,
  );
}

export async function updateExchangeRate(
  id: number,
  data: ExchangeRateApi.ExchangeRateSave,
) {
  return requestClient.put<ExchangeRateApi.ExchangeRate>(
    `/exchange-rates/${id}`,
    data,
  );
}

export async function deleteExchangeRate(id: number) {
  return requestClient.delete(`/exchange-rates/${id}`);
}
