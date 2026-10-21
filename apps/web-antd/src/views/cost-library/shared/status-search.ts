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

/** 报价库「状态」筛选：待确认 + 未生效 / 生效中 / 已过期 */
export function createQuoteLibraryStatusSearchField(): VbenFormSchema {
  const base = createCostStatusSearchField();
  return {
    ...base,
    componentProps: {
      ...base.componentProps,
      options: [
        {
          label: $t('page.quote.library.confirmStatus.pendingConfirm'),
          value: 'pendingConfirm',
        },
        ...(
          base.componentProps as {
            options: Array<{ label: string; value: string }>;
          }
        ).options,
      ],
    },
  };
}

/**
 * 报价库状态筛选拆分：
 * - pendingConfirm → confirmStatus
 * - active/pending/expired → status；若未选待确认则仅查已确认，保证列展示与筛选项一致
 */
export function normalizeQuoteLibraryStatusSearchParams(status: unknown): {
  confirmStatus?: string;
  status?: string;
} {
  const raw = normalizeCostStatusSearchParam(status);
  if (!raw) {
    return {};
  }
  const parts = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const hasPendingConfirm = parts.includes('pendingConfirm');
  const costParts = parts.filter((item) => item !== 'pendingConfirm');
  if (hasPendingConfirm && costParts.length === 0) {
    return { confirmStatus: 'pendingConfirm' };
  }
  if (!hasPendingConfirm && costParts.length > 0) {
    return {
      confirmStatus: 'confirmed',
      status: costParts.join(','),
    };
  }
  return {
    status: costParts.join(','),
  };
}
