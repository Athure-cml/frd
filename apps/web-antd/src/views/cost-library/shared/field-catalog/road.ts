import type { FieldCatalogEntry } from './types';

const road = (key: string) => `page.costLibrary.roadFields.${key}`;

const amount = (
  field: string,
  group: FieldCatalogEntry['group'],
  minWidth = 100,
): FieldCatalogEntry => ({
  align: 'right',
  className: 'col-price',
  field,
  format: 'amount',
  group,
  labelKey: road(field),
  minWidth,
});

export const ROAD_FIELD_CATALOG: FieldCatalogEntry[] = [
  {
    field: 'zipCode',
    group: 'route',
    labelKey: road('zipCode'),
    minWidth: 100,
  },
  { field: 'city', group: 'route', labelKey: road('city'), minWidth: 110 },
  { field: 'state', group: 'route', labelKey: road('state'), minWidth: 80 },
  { field: 'por', group: 'route', labelKey: road('por'), minWidth: 120 },
  { field: 'pol', group: 'route', labelKey: road('pol'), minWidth: 110 },
  {
    field: 'supplier',
    group: 'route',
    labelKey: road('supplier'),
    minWidth: 150,
  },
  amount('baseFreight', 'route', 108),
  {
    align: 'right',
    className: 'col-price',
    field: 'fsc',
    format: 'percent',
    group: 'route',
    labelKey: road('fsc'),
    minWidth: 80,
  },
  amount('chassis', 'route', 88),
  amount('triTandemAxle', 'route', 130),
  amount('split', 'route', 80),
  amount('stopOff', 'route', 90),
  amount('allInNoFm', 'freight', 130),
  amount('allInFmOneWay', 'freight', 160),
  amount('allInFmRound', 'freight', 140),
  amount('waitingFee', 'extra', 100),
  amount('redelivery', 'extra', 100),
  amount('prepull', 'extra', 90),
  amount('nsLift', 'extra', 88),
  amount('otherFee', 'extra', 96),
  {
    className: 'col-remark',
    field: 'remark',
    group: 'extra',
    labelKey: road('remark'),
    minWidth: 160,
    showOverflow: true,
  },
  {
    field: 'validDate',
    group: 'meta',
    labelKey: road('validDate'),
    minWidth: 112,
  },
  {
    field: 'logYardNameAddress',
    group: 'meta',
    labelKey: road('logYardNameAddress'),
    minWidth: 200,
    showOverflow: true,
  },
];
