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
  if (cellValue == null || Number.isNaN(Number(cellValue))) {
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
      { field: 'supplier', minWidth: 140, title: roadT('supplier') },
      { field: 'city', title: roadT('city'), width: 100 },
      { field: 'state', title: roadT('state'), width: 72 },
      { field: 'pol', title: roadT('pol'), width: 100 },
      {
        align: 'right',
        field: 'allIn',
        formatter: moneyFormatter,
        title: roadT('allIn'),
        width: 110,
      },
      { field: 'validDate', title: roadT('validDate'), width: 110 },
    ];
  }

  if (mode === 'fumigation') {
    return [
      buildCostCheckboxColumn(),
      { field: 'port', minWidth: 110, title: fumT('port') },
      { field: 'station', minWidth: 100, title: fumT('station') },
      {
        align: 'right',
        field: 'nonOakOutdoor',
        formatter: ({ cellValue }: { cellValue: number }) =>
          formatAmount(cellValue),
        title: `NON-OAK ${fumT('nonOakOutdoor')}`,
        width: 120,
      },
      {
        field: 'nonOakQuoteSummer',
        title: `NON-OAK ${fumT('nonOakQuoteSummer')}`,
        width: 130,
      },
      {
        align: 'right',
        field: 'oakOutdoor',
        formatter: ({ cellValue }: { cellValue: number }) =>
          formatAmount(cellValue),
        title: `OAK ${fumT('oakOutdoor')}`,
        width: 120,
      },
      {
        field: 'oakQuoteSummer',
        title: `OAK ${fumT('oakQuoteSummer')}`,
        width: 130,
      },
    ];
  }

  const freightT = (key: string) => $t(`page.costLibrary.fields.${key}`);
  return [
    buildCostCheckboxColumn(),
    { field: 'origin', minWidth: 120, title: freightT('pol') },
    { field: 'destination', minWidth: 120, title: freightT('pod') },
    { field: 'carrier', minWidth: 120, title: freightT('carrier') },
    { field: 'spec', title: freightT('spec'), width: 100 },
    { field: 'unit', title: freightT('unit'), width: 72 },
    {
      align: 'right',
      field: 'unitPrice',
      formatter: moneyFormatter,
      title: freightT('unitPrice'),
      width: 110,
    },
    { field: 'currency', title: freightT('currency'), width: 72 },
    { field: 'validFrom', title: freightT('validFrom'), width: 110 },
    { field: 'validTo', title: freightT('validTo'), width: 110 },
  ];
}
