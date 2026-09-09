import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** 成本库列表「仅看常用」筛选 */
export function createHighlightOnlySearchField(): VbenFormSchema {
  return {
    component: 'Checkbox',
    componentProps: {
      class: 'mt-1',
    },
    defaultValue: false,
    fieldName: 'highlightOnly',
    label: $t('page.costLibrary.highlight.onlyFavorites'),
  };
}
