import type { FreightCostRecord, FreightCostSave } from '#/api/cost';

import { computeSeaAllIn } from '../shared/freight-schema';

const NUMERIC_OVERRIDE_FIELDS = ['freight', 'buc', 'others'] as const;

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

function optionalNumber(value: unknown): number | undefined {
  if (!hasMeaningfulValue(value)) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalText(value: unknown): string | undefined {
  if (!hasMeaningfulValue(value)) {
    return undefined;
  }
  return String(value).trim();
}

function pickNumericOverride(
  source: FreightCostRecord,
  overrides: Record<string, unknown>,
  field: (typeof NUMERIC_OVERRIDE_FIELDS)[number],
) {
  const next = optionalNumber(overrides[field]);
  return next === undefined ? source[field] : next;
}

function buildExtraFields(
  source: FreightCostRecord,
  overrides: Record<string, unknown>,
) {
  const extra: Record<string, unknown> = {
    ...source.extraFields,
  };
  delete extra.cf_sea_renewed_from;
  delete extra.cf_sea_renewed_to;
  delete extra.cf_seaFreightEff;
  delete extra.cf_seaBunkerEff;
  delete extra.cf_seaOthersEff;

  const freightEff = optionalText(overrides.freightEffDate);
  if (freightEff) {
    extra.cf_sea_freight_eff = freightEff;
  }
  const bucEff = optionalText(overrides.bucEffDate);
  if (bucEff) {
    extra.cf_sea_bunker_eff = bucEff;
  }
  const othersEff = optionalText(overrides.othersEffDate);
  if (othersEff) {
    extra.cf_sea_others_eff = othersEff;
  }

  return extra;
}

export interface SeaRenewPreviewJob {
  payload: FreightCostSave;
  sourceId: number;
}

function seaSaveToPreviewRecord(
  source: FreightCostRecord,
  payload: FreightCostSave,
): FreightCostRecord {
  return {
    ...source,
    agent: payload.agent ?? source.agent,
    allIn: payload.allIn ?? source.allIn,
    buc: payload.buc ?? source.buc,
    bucValidDate: payload.bucValidDate ?? source.bucValidDate,
    containerType: payload.containerType ?? source.containerType,
    ebs: payload.ebs ?? source.ebs,
    ebsValidDate: payload.ebsValidDate ?? source.ebsValidDate,
    extraFields: payload.extraFields ?? source.extraFields,
    freight: payload.freight ?? source.freight,
    freightValidDate: payload.freightValidDate ?? source.freightValidDate,
    gri: payload.gri ?? source.gri,
    griValidDate: payload.griValidDate ?? source.griValidDate,
    others: payload.others ?? source.others,
    othersValidDate: payload.othersValidDate ?? source.othersValidDate,
    remark: payload.remark ?? source.remark,
    ssl: payload.ssl ?? source.ssl,
    status: payload.status ?? source.status,
  };
}

export function buildSeaRenewPreviewPlan(
  sources: FreightCostRecord[],
  overrides: Record<string, unknown>,
) {
  const items: FreightCostRecord[] = [];
  const renewJobs: SeaRenewPreviewJob[] = [];
  for (const source of sources) {
    if (source.id === undefined || source.id === null) {
      continue;
    }
    const payload = buildSeaRenewSavePayload(source, overrides);
    renewJobs.push({ payload, sourceId: source.id });
    items.push(seaSaveToPreviewRecord(source, payload));
  }
  return { items, renewJobs };
}

export function buildSeaRenewSavePayload(
  source: FreightCostRecord,
  overrides: Record<string, unknown>,
): FreightCostSave {
  const freightEff = optionalText(overrides.freightEffDate);
  if (!freightEff) {
    throw new Error('missing freight effective date');
  }

  const values = {
    buc: pickNumericOverride(source, overrides, 'buc'),
    ebs: source.ebs,
    freight: pickNumericOverride(source, overrides, 'freight'),
    gri: source.gri,
    others: pickNumericOverride(source, overrides, 'others'),
  };

  return {
    agent: source.agent,
    allIn: computeSeaAllIn(values),
    buc: values.buc,
    bucValidDate: optionalText(overrides.bucValidDate),
    cnShortName: source.cnShortName,
    containerType: hasMeaningfulValue(overrides.containerType)
      ? String(overrides.containerType).trim()
      : source.containerType,
    ebs: values.ebs,
    ebsValidDate: source.ebsValidDate,
    enProductName: source.enProductName,
    extraFields: buildExtraFields(source, overrides),
    freight: values.freight,
    freightValidDate: optionalText(overrides.freightValidDate),
    gri: values.gri,
    griValidDate: source.griValidDate,
    others: values.others,
    othersValidDate: optionalText(overrides.othersValidDate),
    pod: source.pod ?? '',
    pol: source.pol ?? '',
    por: source.por,
    remark: hasMeaningfulValue(overrides.remark)
      ? optionalText(overrides.remark)
      : source.remark,
    ssl: source.ssl,
    status: 'active',
  };
}
