import type { SupplierApi } from '#/api/supplier';

import { getSupplierList } from '#/api/supplier';

let cachePromise: null | Promise<SupplierApi.Supplier[]> = null;
let byFullName = new Map<string, SupplierApi.Supplier>();

function rebuildIndex(items: SupplierApi.Supplier[]) {
  byFullName = new Map();
  for (const item of items) {
    const name = item.name?.trim();
    if (name) {
      byFullName.set(name, item);
    }
  }
}

/** 加载熏蒸供应商档案（表单下拉、表格简称展示共用）。 */
export function loadFumigationSupplierCache() {
  if (!cachePromise) {
    cachePromise = getSupplierList({
      category: 'FUMIGATION',
      page: 1,
      pageSize: 500,
      status: 1,
    })
      .then((result) => {
        const items = result.items ?? [];
        rebuildIndex(items);
        return items;
      })
      .catch((error) => {
        cachePromise = null;
        throw error;
      });
  }
  return cachePromise;
}

export function createFumigationStationSelectProps() {
  return {
    allowClear: true,
    api: async () => {
      const items = await loadFumigationSupplierCache();
      return items.map((item) => ({
        label: item.name,
        value: item.name,
      }));
    },
    class: 'w-full',
    showSearch: true,
  };
}

/** 成本库表格 STATION 列：有简称显示简称，否则显示全称。 */
export function formatFumigationStationShort(fullName?: null | string) {
  const name = fullName?.trim();
  if (!name) {
    return '';
  }
  const supplier = byFullName.get(name);
  const shortName = supplier?.shortName?.trim();
  return shortName || name;
}
