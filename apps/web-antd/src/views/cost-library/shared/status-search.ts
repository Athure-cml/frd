import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** 成本库列表通用「状态」筛选（按有效期推算：生效中 / 已过期） */
export function createCostStatusSearchField(): VbenFormSchema {
  return {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [
        {
          label: $t('page.costLibrary.status.active'),
          value: 'active',
        },
        {
          label: $t('page.costLibrary.status.expired'),
          value: 'expired',
        },
      ],
      placeholder: $t('page.costLibrary.statusFilterAll'),
    },
    fieldName: 'status',
    label: $t('page.costLibrary.fields.status'),
  };
}
