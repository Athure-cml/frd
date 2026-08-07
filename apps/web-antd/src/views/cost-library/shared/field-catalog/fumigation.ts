import type { FieldCatalogEntry } from './types';

const f = (key: string) => `page.costLibrary.fumigationFields.${key}`;

export const FUMIGATION_FIELD_CATALOG: FieldCatalogEntry[] = [
  { field: 'region', labelKey: f('region'), minWidth: 110, width: 120 },
  { field: 'station', labelKey: f('station'), minWidth: 140, width: 160 },
  {
    align: 'right',
    field: 'outdoorNonOak',
    format: 'amount',
    labelKey: f('outdoorNonOak'),
    minWidth: 100,
    width: 110,
  },
  {
    align: 'right',
    field: 'outdoorOak',
    format: 'amount',
    labelKey: f('outdoorOak'),
    minWidth: 90,
    width: 100,
  },
  {
    field: 'outdoorValidity',
    labelKey: f('outdoorValidity'),
    minWidth: 150,
    width: 170,
  },
  {
    align: 'right',
    field: 'indoorNonOak',
    format: 'amount',
    labelKey: f('indoorNonOak'),
    minWidth: 100,
    width: 110,
  },
  {
    align: 'right',
    field: 'indoorOak',
    format: 'amount',
    labelKey: f('indoorOak'),
    minWidth: 90,
    width: 100,
  },
  {
    field: 'indoorValidity',
    labelKey: f('indoorValidity'),
    minWidth: 150,
    width: 170,
  },
  {
    className: 'col-remark',
    field: 'address',
    labelKey: f('address'),
    minWidth: 200,
    showOverflow: true,
  },
];
