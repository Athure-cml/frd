import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../../system/shared/columns';
import { statusTagOptions } from '../../list/data';
import { sheetCellValue } from '../../shared/sheet-columns';

export type QuoteLibraryMode = 'fumigation' | 'road' | 'sea';

export interface QuoteLibraryColumnDef {
  field: 'porPol' | 'quoteDate' | keyof QuoteApi.QuoteSheetFields;
  listSource?: 'row' | 'sheet';
  title: string;
  type?: 'date' | 'money' | 'text';
  width?: number;
}

/** 卡车报价库：前置地址/供应商列 */
export const QUOTE_LIBRARY_ROAD_PREFIX_COLUMNS: QuoteLibraryColumnDef[] = [
  { field: 'zipCode', title: 'ZIP CODE', width: 100 },
  { field: 'city', title: 'CITY', width: 110 },
  { field: 'state', title: 'STATE', width: 80 },
  { field: 'por', title: 'POR', width: 96 },
  { field: 'supplier', title: 'SUPPLIER', width: 140 },
];

/** 卡车报价库：报价单「卡车费 + 卡车额外费」字段 */
export const QUOTE_LIBRARY_ROAD_COLUMNS: QuoteLibraryColumnDef[] = [
  {
    field: 'truckingFee',
    title: 'ALL IN',
    type: 'money',
    width: 120,
  },
  {
    field: 'truckingNonOakUsd',
    title: 'ALL IN FM NON OAK',
    type: 'money',
    width: 148,
  },
  {
    field: 'truckingOakUsd',
    title: 'ALL IN FM OAK',
    type: 'money',
    width: 136,
  },
  { field: 'nsLift', title: 'NS LIFT', type: 'money', width: 96 },
  { field: 'chassis', title: 'CHASSIS', type: 'money', width: 96 },
  { field: 'waiting', title: 'WAITING', type: 'money', width: 96 },
  {
    field: 'redeliveryFee',
    title: 'REDELIVERY',
    type: 'money',
    width: 120,
  },
  { field: 'pickUpAddress', title: 'PICK UP ADDRESS', width: 180 },
  { field: 'sheetRemark', title: '备注', width: 200 },
];

/** 海运报价库：报价单海运费相关字段 */
export const QUOTE_LIBRARY_SEA_COLUMNS: QuoteLibraryColumnDef[] = [
  { field: 'por', title: 'POR', width: 96 },
  { field: 'pol', title: 'POL', width: 96 },
  { field: 'pod', title: 'POD', width: 96 },
  { field: 'ssl', title: 'SSL', width: 120 },
  { field: 'oceanFreight', title: 'OCEAN FREIGHT', width: 140 },
];

/** 熏蒸报价库：报价单熏蒸费相关字段 */
export const QUOTE_LIBRARY_FUMIGATION_COLUMNS: QuoteLibraryColumnDef[] = [
  { field: 'fumigationPoint', title: 'STATION', width: 120 },
  { field: 'por', title: 'POR', width: 96 },
  { field: 'pol', title: 'POL', width: 96 },
  { field: 'pod', title: 'POD', width: 96 },
  { field: 'fmNonOak', title: 'FM (NON-OAK)', type: 'money', width: 120 },
  { field: 'fmOak', title: 'FM (OAK)', type: 'money', width: 110 },
];

const LIBRARY_COLUMN_MAP: Record<QuoteLibraryMode, QuoteLibraryColumnDef[]> = {
  fumigation: QUOTE_LIBRARY_FUMIGATION_COLUMNS,
  road: QUOTE_LIBRARY_ROAD_COLUMNS,
  sea: QUOTE_LIBRARY_SEA_COLUMNS,
};

function formatLibraryCell(
  row: QuoteApi.QuoteListItem,
  col: QuoteLibraryColumnDef,
) {
  return sheetCellValue(
    row.sheet,
    col.field as 'porPol' | keyof QuoteApi.QuoteSheetFields,
  );
}

function buildLibrarySheetColumns(cols: QuoteLibraryColumnDef[]) {
  return cols.map((col) => ({
    field: col.listSource === 'row' ? col.field : `sheet.${String(col.field)}`,
    formatter: ({ row }: { row: QuoteApi.QuoteListItem }) =>
      formatLibraryCell(row, col),
    minWidth: col.width ?? 100,
    showOverflow: true,
    title: col.title,
  }));
}

export function useQuoteLibraryColumns(
  mode: QuoteLibraryMode,
  onActionClick: OnActionClickFn<QuoteApi.QuoteListItem>,
): VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] {
  const prefixCols =
    mode === 'road'
      ? buildLibrarySheetColumns(QUOTE_LIBRARY_ROAD_PREFIX_COLUMNS)
      : [];
  const feeCols = buildLibrarySheetColumns(LIBRARY_COLUMN_MAP[mode]);

  const operationColumn = buildOperationColumn(true, onActionClick, {
    nameField: 'quoteNo',
    nameTitle: 'QUOTE NO',
    operationOptions: [{ code: 'view', text: $t('page.quote.actions.view') }],
  });

  const columns: VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] = [
    {
      field: 'quoteNo',
      fixed: 'left',
      minWidth: 130,
      slots: { default: 'quoteNo' },
      title: 'QUOTE NO',
    },
    ...prefixCols,
    ...feeCols,
    {
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: statusTagOptions(),
      },
      field: 'status',
      fixed: 'right',
      title: '状态',
      width: 96,
    },
  ];

  if (operationColumn) {
    operationColumn.minWidth = 100;
    operationColumn.width = 100;
    operationColumn.fixed = 'right';
    columns.push(operationColumn);
  }

  return columns;
}
