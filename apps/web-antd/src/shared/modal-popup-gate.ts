import type { ModalPopupGate } from '@vben/layouts';

import { provide, ref } from 'vue';

import { MODAL_POPUP_GATE_KEY } from '@vben/layouts';

/** 在 App 根组件调用，供版本更新检测与系统公告协调弹窗顺序 */
export function provideModalPopupGate(): ModalPopupGate {
  const versionUpdateModalOpen = ref(false);

  const gate: ModalPopupGate = {
    setVersionUpdateModalOpen(open: boolean) {
      versionUpdateModalOpen.value = open;
    },
    versionUpdateModalOpen,
  };

  provide(MODAL_POPUP_GATE_KEY, gate);
  return gate;
}
