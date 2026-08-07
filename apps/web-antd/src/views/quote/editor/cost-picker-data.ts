import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostMode } from '#/api/cost';

import { $t } from '#/locales';

import { useFumigationSearchSchema } from '../../cost-library/fumigation/data';
import { useRoadSearchSchema } from '../../cost-library/road/data';
import { formatAmount } from '../../cost-library/road/formatters';
import { useSeaSearchSchema } from '../../cost-library/sea/data';
import { buildCostCheckboxColumn } from '../../cost-library/shared/columns';

const roadT = (key: string) => $t(`page.costLibrary.roadFields.${key}`);
const fumT = (key: string) => $t(`page.costLibrary.fumigationFields.${key}`);

export function costModeToPickerMode(
  transportMode: 'RAIL' | 'ROAD' | 'SEA',
): CostMode {
  const map = { RAIL: 'fumigation', ROAD: 'road', SEA: 'sea' } as const;
  return map[transportMode];
}

export function getCostPickerSearchSchema(mode: CostMode): VbenFormSchema[] {
  if (mode === 'road') {
    return useRoadSearchSchema();
  }
  if (mode === 'fumigation') {
    return useFumigationSearchSchema();
  }
  return useSeaSearchSchema();
}

function moneyFormatter({ cellValue }: { cellValue: number }) {
  if (
    cellValue === null ||
    cellValue === undefined ||
    Number.isNaN(Number(cellValue))
  ) {
    return '—';
  }
  return Number(cellValue).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function getCostPickerColumns(
  mode: CostMode,
): VxeTableGridOptions['columns'] {
  if (mode === 'road') {
    return [
      buildCostCheckboxColumn(),
      { field: 'zipCode', title: roadT('zipCode'), width: 100 },
      { field: 'city', title: roadT('city'), width: 110 },
      { field: 'state', title: roadT('state'), width: 80 },
      { field: 'por', title: roadT('por'), width: 120 },
      { field: 'pol', title: roadT('pol'), width: 110 },
      { field: 'supplier', minWidth: 140, title: roadT('supplier') },
      {
        align: 'right',
        field: 'allInNoFm',
        formatter: moneyFormatter,
        title: roadT('allInNoFm'),
        width: 130,
      },
      { field: 'validDate', title: roadT('validDate'), width: 110 },
    ];
  }

  if (mode === 'fumigation') {
    return [
      buildCostCheckboxColumn(),
      { field: 'region', minWidth: 110, title: fumT('region') },
      { field: 'station', minWidth: 140, title: fumT('station') },
      {
        align: 'right',
        field: 'outdoorNonOak',
        formatter: ({ cellValue }: { cellValue: number }) =>
          formatAmount(cellValue),
        title: `FM-OUTDOOR ${fumT('outdoorNonOak')}`,
        width: 130,
      },
      {
        align: 'right',
        field: 'outdoorOak',
        formatter: ({ cellValue }: { cellValue: number }) =>
          formatAmount(cellValue),
        title: `FM-OUTDOOR ${fumT('outdoorOak')}`,
        width: 120,
      },
      {
        field: 'outdoorValidity',
        title: `FM-OUTDOOR ${fumT('outdoorValidity')}`,
        width: 160,
      },
    ];
  }

  const freightT = (key: string) => $t(`page.costLibrary.seaFields.${key}`);
  return [
    buildCostCheckboxColumn(),
    { field: 'por', minWidth: 100, title: freightT('por') },
    { field: 'pol', minWidth: 110, title: freightT('pol') },
    { field: 'pod', minWidth: 120, title: freightT('pod') },
    { field: 'cnShortName', minWidth: 100, title: freightT('cnShortName') },
    { field: 'containerType', minWidth: 130, title: freightT('containerType') },
    {
      align: 'right',
      field: 'freight',
      formatter: moneyFormatter,
      title: freightT('freight'),
      width: 110,
    },
    {
      align: 'right',
      field: 'allIn',
      formatter: moneyFormatter,
      title: freightT('allIn'),
      width: 110,
    },
    { field: 'ssl', minWidth: 100, title: freightT('ssl') },
    {
      field: 'freightValidDate',
      title: freightT('freightValidDate'),
      width: 110,
    },
  ];
}
