import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** 成本库列表「是否生成报价」筛选（已入报价库 / 未入报价库） */
export function createInQuoteLibrarySearchField(): VbenFormSchema {
  return {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: [
        {
          label: $t('page.costLibrary.relation.quoteGenerated'),
          value: true,
        },
        {
          label: $t('page.costLibrary.relation.quoteNotGenerated'),
          value: false,
        },
      ],
      placeholder: $t('page.costLibrary.quoteGeneratedFilterAll'),
    },
    fieldName: 'inQuoteLibrary',
    label: $t('page.costLibrary.fields.quoteGenerated'),
  };
}
