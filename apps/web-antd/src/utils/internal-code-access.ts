import { computed } from 'vue';

import { useAccess } from '@vben/access';

/** 可查看系统内部编码（客户编码、模板编码等） */
export const INTERNAL_CODE_VIEWER_ROLES = ['super_admin'] as const;

export function useInternalCodeVisibility() {
  const { hasAccessByRoles } = useAccess();
  const canViewInternalCodes = computed(() =>
    hasAccessByRoles([...INTERNAL_CODE_VIEWER_ROLES]),
  );
  return { canViewInternalCodes };
}
