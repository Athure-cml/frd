import type { VbenFormProps } from '#/adapter/form';

import { computed, type ComputedRef } from 'vue';

import { useI18n } from '@vben/locales';

/**
 * 随语言切换重新计算 formOptions（避免 data.ts 模块加载时 $t 结果被固化）。
 */
export function useI18nFormOptions<
  P extends Record<string, any> = Record<never, never>,
>(factory: () => VbenFormProps<any, P>): ComputedRef<VbenFormProps<any, P>> {
  const { locale } = useI18n();
  return computed(() => {
    void locale.value;
    return factory();
  });
}
