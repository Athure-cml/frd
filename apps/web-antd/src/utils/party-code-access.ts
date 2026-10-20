import { computed } from 'vue';

import { useAccess } from '@vben/access';

/**
 * 客商管理：有导入权限时可查看系统内部分配编码（与导入按钮一致）。
 */
export function usePartyCodeVisibility(importPermission: string) {
  const { hasAccessByCodes } = useAccess();
  const canViewPartyCode = computed(() => hasAccessByCodes([importPermission]));
  return { canViewPartyCode };
}
