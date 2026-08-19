import type { FieldCatalogEntry } from './types';

const f = (key: string) => `page.costLibrary.fumigationFields.${key}`;

/** 列宽由 column-width 按表头估算，目录只描述字段语义 */
export const FUMIGATION_FIELD_CATALOG: FieldCatalogEntry[] = [
  { field: 'region', labelKey: f('region') },
  { field: 'station', labelKey: f('station'), showOverflow: true },
  {
    align: 'right',
    field: 'outdoorNonOak',
    format: 'amount',
    labelKey: f('outdoorNonOak'),
  },
  {
    align: 'right',
    field: 'outdoorOak',
    format: 'amount',
    labelKey: f('outdoorOak'),
  },
  {
    field: 'outdoorValidity',
    format: 'dateMd',
    labelKey: f('outdoorValidity'),
  },
  {
    align: 'right',
    field: 'indoorNonOak',
    format: 'amount',
    labelKey: f('indoorNonOak'),
  },
  {
    align: 'right',
    field: 'indoorOak',
    format: 'amount',
    labelKey: f('indoorOak'),
  },
  { field: 'indoorValidity', format: 'dateMd', labelKey: f('indoorValidity') },
  {
    className: 'col-remark',
    field: 'address',
    labelKey: f('address'),
    showOverflow: true,
  },
];
