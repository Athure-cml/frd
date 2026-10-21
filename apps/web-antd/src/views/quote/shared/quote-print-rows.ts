import type { SslRemarkLookup } from './quote-sea-ssl-remark';
import type { OceanFreightEntry } from './sheet-ocean-freight';

import type { QuoteApi, QuoteServiceType } from '#/api/quote';

import { parseUsdNumber } from './quote-sheet-format';
import { resolveOceanFreightEntries } from './sheet-ocean-freight';
import {
  resolveTruckingFeeValues,
  truckingFeeLabel,
} from './sheet-road-freight';
import { FIXED_TRUCK_REDELIVERY_RATE } from './sheet-truck-extras';

export type QuotePrintFeeRow =
  | {
      item: string;
      mergeRateMeta?: boolean;
      mergeUnitMeta?: boolean;
      rate: string;
      remark: string;
      ssl: string;
      type: 'fee';
      unit: string;
    }
  | { label: string; type: 'group' };

type TranslateFn = (key: string, params?: unknown[]) => string;

export function formatPrintUsd(value?: null | number | string): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (/CIF/i.test(text)) {
    return text;
  }
  const num = parseUsdNumber(text);
  if (num === undefined) {
    return text;
  }
  return `US$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPrintRate(value?: null | number | string): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (/CIF/i.test(text)) {
    return text;
  }
  const num = parseUsdNumber(text);
  if (num === undefined) {
    return text.startsWith('US$') ? text : text;
  }
  return formatPrintUsd(num);
}

function oceanFreightLabel(
  index: number,
  total: number,
  t: TranslateFn,
): string {
  if (total <= 1) {
    return t('page.quote.sheet.oceanFreight');
  }
  return t('page.quote.sheet.oceanFreightN', [index + 1]);
}

function pushFeeRow(
  rows: QuotePrintFeeRow[],
  item: string,
  rate: unknown,
  unit: string,
  ssl = '',
  remark = '',
  mergeUnitMeta = false,
) {
  rows.push({
    type: 'fee',
    item,
    rate: formatPrintRate(rate as number | string),
    unit,
    ssl,
    remark,
    mergeUnitMeta,
  });
}

function isFumigationEnabled(sheet: QuoteApi.QuoteSheetFields): boolean {
  return (
    Boolean(sheet.fumigationPoint?.trim()) || sheet.fumigationEnabled === true
  );
}

function hasPrintServiceType(
  serviceTypes: QuoteServiceType[] | undefined,
  type: QuoteServiceType,
): boolean {
  // 未传入服务类型时保持旧行为（按费用字段展示）
  if (!serviceTypes) {
    return true;
  }
  return serviceTypes.includes(type);
}

export function buildQuotePrintFeeRows(
  sheet: QuoteApi.QuoteSheetFields,
  seaMatches: QuoteApi.QuoteCostMatchItem[],
  t: TranslateFn,
  sslRemarkByName?: SslRemarkLookup,
  serviceTypes?: QuoteServiceType[],
): QuotePrintFeeRow[] {
  const rows: QuotePrintFeeRow[] = [];
  const unitContainer = t('page.quote.sheet.unitPerContainer');
  const showSea = hasPrintServiceType(serviceTypes, 'SEA');
  const showTruck = hasPrintServiceType(serviceTypes, 'TRUCK');
  const showFumigation = serviceTypes
    ? serviceTypes.includes('FUMIGATION')
    : isFumigationEnabled(sheet);
  const showInsurance = hasPrintServiceType(serviceTypes, 'INSURANCE');
  const showTrade = hasPrintServiceType(serviceTypes, 'TRADE');

  rows.push({ type: 'group', label: t('page.quote.print.serviceFees') });

  if (showSea) {
    const oceanEntries: OceanFreightEntry[] = resolveOceanFreightEntries(
      sheet,
      seaMatches,
      sslRemarkByName,
    );
    for (const [index, entry] of oceanEntries.entries()) {
      if (!entry.rate.trim() && oceanEntries.length === 1) {
        pushFeeRow(
          rows,
          oceanFreightLabel(index, oceanEntries.length, t),
          '',
          unitContainer,
          entry.ssl,
          entry.remark,
        );
        continue;
      }
      if (!entry.rate.trim()) {
        continue;
      }
      pushFeeRow(
        rows,
        oceanFreightLabel(index, oceanEntries.length, t),
        entry.rate,
        unitContainer,
        entry.ssl,
        entry.remark,
      );
    }
  }

  if (showTruck) {
    const truckingFees = resolveTruckingFeeValues(sheet);
    for (const [index, fee] of truckingFees.entries()) {
      pushFeeRow(
        rows,
        truckingFeeLabel(index, truckingFees.length, t),
        fee.value,
        unitContainer,
        '',
        '',
        true,
      );
    }
  }

  if (showFumigation) {
    pushFeeRow(
      rows,
      t('page.quote.sheet.fmNonOak'),
      sheet.fmNonOak,
      unitContainer,
      '',
      '',
      true,
    );
    pushFeeRow(
      rows,
      t('page.quote.sheet.fmOak'),
      sheet.fmOak,
      unitContainer,
      '',
      '',
      true,
    );
  }

  pushFeeRow(
    rows,
    t('page.quote.sheet.docFee'),
    sheet.docUsd,
    t('page.quote.sheet.unitPerBill'),
    '',
    '',
    true,
  );
  if (showInsurance && sheet.cargoInsurancePremium?.trim()) {
    pushFeeRow(
      rows,
      t('page.quote.sheet.cargoInsurance'),
      sheet.cargoInsurancePremium,
      t('page.quote.sheet.unitPerCif'),
      '',
      '',
      true,
    );
  }
  if (showTrade && sheet.cargoAgentFee?.trim()) {
    pushFeeRow(
      rows,
      t('page.quote.sheet.cargoAgent'),
      sheet.cargoAgentFee,
      t('page.quote.sheet.unitBankFee'),
      '',
      '',
      true,
    );
  }

  if (showTruck) {
    rows.push({ type: 'group', label: t('page.quote.print.truckExtras') });
    pushFeeRow(
      rows,
      t('page.quote.sheet.nsLift'),
      sheet.nsLift,
      t('page.quote.sheet.unitNsLift'),
      '',
      '',
      true,
    );
    pushFeeRow(
      rows,
      t('page.quote.sheet.chassis'),
      sheet.chassis,
      t('page.quote.sheet.unitChassis'),
      '',
      '',
      true,
    );
    pushFeeRow(
      rows,
      t('page.quote.sheet.waiting'),
      sheet.waiting,
      t('page.quote.sheet.unitWaiting'),
      '',
      '',
      true,
    );
    pushFeeRow(
      rows,
      t('page.quote.sheet.redelivery'),
      FIXED_TRUCK_REDELIVERY_RATE,
      unitContainer,
      '',
      '',
      true,
    );

    if (sheet.truckRemark?.trim()) {
      rows.push({
        type: 'fee',
        item: t('page.quote.sheet.truckRemark'),
        rate: sheet.truckRemark.trim(),
        unit: '',
        ssl: '',
        remark: '',
        mergeRateMeta: true,
      });
    }
  }

  return rows;
}

export function formatPorPolForPrint(sheet: QuoteApi.QuoteSheetFields): string {
  const por = sheet.por?.trim();
  const pol = sheet.pol?.trim();
  if (por && pol && por !== pol) {
    return `${por} / ${pol}`;
  }
  return por || pol || '—';
}

export function formatPrintQuoteDate(value?: string): string {
  if (!value?.trim()) {
    return '—';
  }
  const normalized = value.trim().replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return value;
  }
  const date = new Date(parsed);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
