import { requestClient } from '#/api/request';

export namespace QuoteRuleApi {
  export type TargetField =
    | 'CARGO_AGENT'
    | 'CARGO_INSURANCE'
    | 'DOC_FEE'
    | 'FM_NON_OAK'
    | 'FM_OAK'
    | 'OCEAN_FREIGHT'
    | 'TRUCKING_FEE';

  export type ConditionType =
    | 'ALWAYS'
    | 'BASE_GT'
    | 'BASE_LTE'
    | 'FUMIGATION_DISABLED'
    | 'FUMIGATION_ENABLED'
    | 'POD_CHINA'
    | 'POD_NOT_CHINA';

  export type CalcType = 'CIF_MULTIPLY' | 'CIF_PERCENT' | 'COST_PLUS' | 'FIXED';

  export interface QuoteRule {
    addAmount?: number;
    calcType: CalcType;
    cifFactor?: number;
    cifRate?: number;
    conditionAmount?: number;
    conditionType: ConditionType;
    fixedAmount?: number;
    id: number;
    name: string;
    remark?: string;
    sortOrder: number;
    status: 0 | 1;
    targetField: TargetField;
  }

  export type QuoteRuleSave = Omit<QuoteRule, 'id'>;
}

export async function getQuoteRuleList(params?: {
  name?: string;
  status?: number;
  targetField?: string;
}) {
  return requestClient.get<QuoteRuleApi.QuoteRule[]>('/quote-rules', {
    params,
  });
}

export async function createQuoteRule(data: QuoteRuleApi.QuoteRuleSave) {
  return requestClient.post<QuoteRuleApi.QuoteRule>('/quote-rules', data);
}

export async function updateQuoteRule(
  id: number,
  data: QuoteRuleApi.QuoteRuleSave,
) {
  return requestClient.put<QuoteRuleApi.QuoteRule>(`/quote-rules/${id}`, data);
}

export async function deleteQuoteRule(id: number) {
  return requestClient.delete(`/quote-rules/${id}`);
}

export async function batchDeleteQuoteRule(ids: number[]) {
  return requestClient.post('/quote-rules/batch-delete', { ids });
}
