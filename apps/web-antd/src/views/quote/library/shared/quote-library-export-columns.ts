import type { QuoteLibraryMode } from './quote-library-columns';

import { $t } from '#/locales';

import {
  QUOTE_LIBRARY_ROAD_COLUMNS,
  QUOTE_LIBRARY_SEA_COLUMNS,
} from './quote-library-columns';

export type QuoteLibraryExportColumn = {
  field: string;
  title: string;
};

const SKIP_FIELDS = new Set(['operation', 'relationLink']);
const SKIP_TYPES = new Set(['checkbox', 'seq']);

type GridColumnLike = {
  children?: GridColumnLike[];
  field?: string;
  title?: string;
  type?: string;
  visible?: boolean;
};

export function resolveExportFieldKey(field?: string) {
  if (!field) {
    return '';
  }
  const prefix = 'extraFields.';
  return field.startsWith(prefix) ? field.slice(prefix.length) : field;
}

export function collectQuoteLibraryExportColumns(
  grid:
    | null
    | undefined
    | {
        getTableColumn?: () => { fullColumn?: GridColumnLike[] };
      },
): QuoteLibraryExportColumn[] {
  const columns = grid?.getTableColumn?.()?.fullColumn ?? [];
  const result: QuoteLibraryExportColumn[] = [];
  for (const column of columns) {
    if (column.children?.length) {
      for (const child of column.children) {
        pushExportColumn(result, child);
      }
      continue;
    }
    pushExportColumn(result, column);
  }
  return result;
}

function pushExportColumn(
  result: QuoteLibraryExportColumn[],
  column: GridColumnLike,
) {
  if (column.visible === false) {
    return;
  }
  if (column.type && SKIP_TYPES.has(column.type)) {
    return;
  }
  const field = resolveExportFieldKey(column.field);
  if (!field || SKIP_FIELDS.has(field)) {
    return;
  }
  const title =
    typeof column.title === 'string' && column.title.trim()
      ? column.title.trim()
      : field;
  result.push({ field, title });
}

export function fallbackQuoteLibraryExportColumns(
  mode: QuoteLibraryMode,
): QuoteLibraryExportColumn[] {
  if (mode === 'road') {
    return [
      ...QUOTE_LIBRARY_ROAD_COLUMNS.map((column) => ({
        field: column.field,
        title: column.title,
      })),
      { field: 'status', title: $t('page.costLibrary.fields.status') },
    ];
  }
  if (mode === 'sea') {
    return [
      ...QUOTE_LIBRARY_SEA_COLUMNS.map((column) => ({
        field: column.field,
        title: column.title,
      })),
      { field: 'status', title: $t('page.costLibrary.fields.status') },
    ];
  }
  return [];
}
