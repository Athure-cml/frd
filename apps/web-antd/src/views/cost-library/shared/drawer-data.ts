import type { CostMode, CostTableTemplate } from '#/api/cost';

export type CostDrawerPayload<T extends Record<string, unknown>> =
  Partial<T> & {
    copyFrom?: boolean;
    copyFromId?: number;
    renewFrom?: boolean;
    renewFromId?: number;
    template?: CostTableTemplate;
  };

export function toCopyDrawerData<
  T extends Record<string, unknown> & { id: number },
>(row: T, template?: CostTableTemplate): CostDrawerPayload<T> {
  const { id, updatedAt: _updatedAt, createdAt: _createdAt, ...rest } = row;
  return {
    ...(rest as Partial<T>),
    copyFrom: true,
    copyFromId: id,
    template,
  };
}

const SEA_RENEW_EXTRA_KEYS = [
  'cf_sea_freight_eff',
  'cf_sea_bunker_eff',
  'cf_sea_others_eff',
  'cf_seaFreightEff',
  'cf_seaBunkerEff',
  'cf_seaOthersEff',
  'cf_sea_renewed_from',
  'cf_sea_renewed_to',
] as const;

/** 续期：带出旧行数据，清空有效期与生效期，保存时反填源行 */
export function toRenewDrawerData<
  T extends Record<string, unknown> & { id: number },
>(
  row: T,
  template?: CostTableTemplate,
  mode: CostMode = 'road',
): CostDrawerPayload<T> {
  const { id, updatedAt: _updatedAt, createdAt: _createdAt, ...rest } = row;

  if (mode === 'sea') {
    const {
      freightValidDate: _freightValid,
      bucValidDate: _bucValid,
      ebsValidDate: _ebsValid,
      griValidDate: _griValid,
      othersValidDate: _othersValid,
      ...seaRest
    } = rest as T & {
      bucValidDate?: string;
      ebsValidDate?: string;
      freightValidDate?: string;
      griValidDate?: string;
      othersValidDate?: string;
    };
    const seaExtraBase = {
      ...(seaRest.extraFields as Record<string, unknown> | undefined),
    };
    const extraFields = Object.fromEntries(
      Object.entries(seaExtraBase).filter(
        ([key]) =>
          !SEA_RENEW_EXTRA_KEYS.includes(
            key as (typeof SEA_RENEW_EXTRA_KEYS)[number],
          ),
      ),
    );
    return {
      ...(seaRest as Partial<T>),
      bucValidDate: undefined,
      ebsValidDate: undefined,
      extraFields,
      freightValidDate: undefined,
      griValidDate: undefined,
      othersValidDate: undefined,
      renewFrom: true,
      renewFromId: id,
      template,
    };
  }

  const { validDate: _valid, ...roadRest } = rest as T & {
    validDate?: string;
  };
  const {
    cf_road_eff: _eff,
    cf_road_renewed_from: _from,
    cf_road_renewed_to: _to,
    ...extraFields
  } = {
    ...(roadRest.extraFields as Record<string, unknown> | undefined),
  };
  return {
    ...(roadRest as Partial<T>),
    extraFields,
    renewFrom: true,
    renewFromId: id,
    template,
    validDate: undefined,
  };
}

export function isCostCopyPayload(
  data: undefined | { copyFrom?: boolean; id?: number },
) {
  return Boolean(data?.copyFrom && !data?.id);
}

export function isCostRenewPayload(
  data: undefined | { id?: number; renewFrom?: boolean; renewFromId?: number },
) {
  return Boolean(data?.renewFrom && data?.renewFromId && !data?.id);
}
