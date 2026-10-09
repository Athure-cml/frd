import type { SupplierAllInFormulas } from './formula-eval';

import type { SupplierApi } from '#/api/supplier';

import { getSupplierList } from '#/api/supplier';

let cachePromise: null | Promise<SupplierApi.Supplier[]> = null;
let byFullName = new Map<string, SupplierApi.Supplier>();
const supplierFormulaCache = new Map<string, SupplierAllInFormulas>();

function rebuildIndex(items: SupplierApi.Supplier[]) {
  byFullName = new Map();
  supplierFormulaCache.clear();
  for (const item of items) {
    const name = item.name?.trim();
    if (!name) {
      continue;
    }
    byFullName.set(name, item);
    supplierFormulaCache.set(name, {
      fumigationNonOakPackageFormula: item.fumigationNonOakPackageFormula,
      fumigationOakPackageFormula: item.fumigationOakPackageFormula,
      nonFumigationPackageFormula: item.nonFumigationPackageFormula,
    });
  }
}

function toSelectOption(item: SupplierApi.Supplier) {
  const name = item.name.trim();
  const shortName = item.shortName?.trim() || name;
  return {
    // 下拉：简称 · 全称，便于搜索；选中后只展示简称
    label: shortName === name ? name : `${shortName} · ${name}`,
    shortLabel: shortName,
    value: name,
  };
}

/** 加载卡车供应商档案（搜索多选、表单下拉、简称展示共用）。 */
export function loadTruckSupplierCache() {
  if (!cachePromise) {
    cachePromise = getSupplierList({
      category: 'TRUCK',
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

/** 与历史 loadSupplierFormulaCache 兼容：刷新缓存并返回列表。 */
export async function loadSupplierFormulaCache() {
  cachePromise = null;
  return loadTruckSupplierCache();
}

export function getTruckSupplierFormulas(
  name: unknown,
): SupplierAllInFormulas | undefined {
  if (typeof name !== 'string' || !name.trim()) {
    return undefined;
  }
  return supplierFormulaCache.get(name.trim());
}

export function createTruckSupplierSearchProps() {
  return {
    allowClear: true,
    api: async () => {
      const items = await loadTruckSupplierCache();
      return items.map((item) => toSelectOption(item));
    },
    class: 'w-full cost-select-multiple-wrap',
    maxTagCount: 'responsive' as const,
    mode: 'multiple' as const,
    optionFilterProp: 'label',
    // 选中 tag 只展示简称，避免全称过长
    optionLabelProp: 'shortLabel',
    showSearch: true,
  };
}

export function createTruckSupplierFormSelectProps() {
  return {
    allowClear: true,
    api: async () => {
      const items = await loadSupplierFormulaCache();
      return items.map((item) => toSelectOption(item));
    },
    class: 'w-full',
    optionFilterProp: 'label',
    optionLabelProp: 'shortLabel',
    showSearch: true,
  };
}

/** 成本库表格 SUPPLIER 列：有简称显示简称，否则全称。 */
export function formatTruckSupplierShort(fullName?: null | string) {
  const name = fullName?.trim();
  if (!name) {
    return '';
  }
  const supplier = byFullName.get(name);
  const shortName = supplier?.shortName?.trim();
  return shortName || name;
}
