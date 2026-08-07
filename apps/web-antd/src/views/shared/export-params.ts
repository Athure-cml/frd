/** 勾选优先；无勾选时按搜索条件导出。ids 以逗号串传给后端。 */
export function buildListExportParams(
  formValues: null | Record<string, any> | undefined,
  selectedIds: number[],
  extra?: Record<string, any>,
) {
  if (selectedIds.length > 0) {
    return {
      ...extra,
      ids: selectedIds.join(','),
    };
  }
  return {
    ...formValues,
    ...extra,
  };
}

/** 当前页勾选 + 跨页保留勾选 */
export function getGridSelectedIds(gridApi: {
  grid?: {
    getCheckboxRecords?: () => Array<{ id?: number }>;
    getCheckboxReserveRecords?: () => Array<{ id?: number }>;
  };
}) {
  const current = gridApi.grid?.getCheckboxRecords?.() ?? [];
  const reserved = gridApi.grid?.getCheckboxReserveRecords?.() ?? [];
  const ids = new Set<number>();
  for (const row of [...current, ...reserved]) {
    if (typeof row.id === 'number') {
      ids.add(row.id);
    }
  }
  return [...ids];
}
