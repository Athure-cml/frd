import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** 成本库/报价库/引入弹窗通用「状态」筛选（多选：未生效 / 生效中 / 已过期） */
export function createCostStatusSearchField(): VbenFormSchema {
  return {
    component: 'Select',
    componentProps: {
      allowClear: true,
      class: 'w-full cost-select-multiple-wrap',
      maxTagCount: 'responsive',
      mode: 'multiple',
      options: [
        {
          label: $t('page.costLibrary.status.pending'),
          value: 'pending',
        },
        {
          label: $t('page.costLibrary.status.active'),
          value: 'active',
        },
        {
          label: $t('page.costLibrary.status.expired'),
          value: 'expired',
        },
      ],
      optionFilterProp: 'label',
      placeholder: $t('page.costLibrary.statusFilterAll'),
      showSearch: true,
    },
    fieldName: 'status',
    label: $t('page.costLibrary.fields.status'),
  };
}

/** 状态多选 → 后端逗号分隔（如 active,pending） */
export function normalizeCostStatusSearchParam(
  status: unknown,
): string | undefined {
  if (Array.isArray(status)) {
    const parts = status
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(',') : undefined;
  }
  if (typeof status === 'string' && status.trim()) {
    return status.trim();
  }
  return undefined;
}
