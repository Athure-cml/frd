import { computed } from 'vue';

import { useAccess } from '@vben/access';

/** 客商管理：有编辑（写入）权限时可查看系统内部分配编码 */
export function usePartyCodeVisibility(editPermission: string) {
  const { hasAccessByCodes } = useAccess();
  const canViewPartyCode = computed(() => hasAccessByCodes([editPermission]));
  return { canViewPartyCode };
}
