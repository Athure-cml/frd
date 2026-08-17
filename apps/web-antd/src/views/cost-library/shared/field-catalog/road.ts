import type { FieldCatalogEntry } from './types';

const road = (key: string) => `page.costLibrary.roadFields.${key}`;

const amount = (
  field: string,
  group: FieldCatalogEntry['group'],
): FieldCatalogEntry => ({
  align: 'right',
  className: 'col-price',
  field,
  format: 'amount',
  group,
  labelKey: road(field),
});

/** 列宽由 column-width 按表头估算，目录只描述字段语义 */
export const ROAD_FIELD_CATALOG: FieldCatalogEntry[] = [
  { field: 'zipCode', group: 'route', labelKey: road('zipCode') },
  { field: 'city', group: 'route', labelKey: road('city') },
  { field: 'state', group: 'route', labelKey: road('state') },
  { field: 'por', group: 'route', labelKey: road('por') },
  { field: 'pol', group: 'route', labelKey: road('pol') },
  {
    field: 'supplier',
    group: 'route',
    labelKey: road('supplier'),
    showOverflow: true,
  },
  amount('baseFreight', 'route'),
  {
    align: 'right',
    className: 'col-price',
    field: 'fsc',
    format: 'percent',
    group: 'route',
    labelKey: road('fsc'),
  },
  amount('chassis', 'route'),
  amount('triTandemAxle', 'route'),
  amount('split', 'route'),
  amount('stopOff', 'route'),
  amount('allInNoFm', 'freight'),
  amount('allInFmOneWay', 'freight'),
  amount('allInFmRound', 'freight'),
  amount('waitingFee', 'extra'),
  amount('redelivery', 'extra'),
  amount('prepull', 'extra'),
  amount('nsLift', 'extra'),
  amount('otherFee', 'extra'),
  {
    className: 'col-remark',
    field: 'remark',
    group: 'extra',
    labelKey: road('remark'),
    showOverflow: true,
  },
  { field: 'validDate', group: 'meta', labelKey: road('validDate') },
  {
    field: 'logYardNameAddress',
    group: 'meta',
    labelKey: road('logYardNameAddress'),
    showOverflow: true,
  },
];
