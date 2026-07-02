import type { FieldCatalogEntry } from './types';

const f = (key: string) => `page.costLibrary.seaFields.${key}`;

/** 海运成本库标准列：Excel 七列 + 备注、有效期、状态 */
export const SEA_FIELD_CATALOG: FieldCatalogEntry[] = [
  { field: 'origin', labelKey: f('pol'), minWidth: 120, width: 140 },
  { field: 'destination', labelKey: f('pod'), minWidth: 180, width: 220 },
  {
    align: 'right',
    className: 'col-price',
    field: 'unitPrice',
    format: 'amount',
    labelKey: f('ofRate'),
    minWidth: 130,
    width: 140,
  },
  {
    align: 'right',
    field: 'buc',
    format: 'amount',
    labelKey: f('buc'),
    minWidth: 90,
    width: 100,
  },
  {
    field: 'surchargeValidDate',
    labelKey: f('surchargeValidDate'),
    minWidth: 120,
    width: 130,
  },
  {
    align: 'right',
    className: 'col-price',
    field: 'allIn',
    format: 'amount',
    labelKey: f('allIn'),
    minWidth: 100,
    width: 110,
  },
  { field: 'carrier', labelKey: f('ssl'), minWidth: 90, width: 100 },
  {
    className: 'col-remark',
    field: 'remark',
    labelKey: f('remark'),
    minWidth: 140,
    showOverflow: true,
  },
  { field: 'validDate', labelKey: f('validDate'), minWidth: 120, width: 130 },
  {
    field: 'status',
    format: 'tag',
    labelKey: f('status'),
    minWidth: 96,
  },
];
