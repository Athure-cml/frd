import type { InjectionKey, Ref } from 'vue';

/** 全局弹窗协调：版本更新弹窗打开时，其它登录弹窗（如系统公告）应暂停 */
export interface ModalPopupGate {
  setVersionUpdateModalOpen: (open: boolean) => void;
  versionUpdateModalOpen: Ref<boolean>;
}

export const MODAL_POPUP_GATE_KEY: InjectionKey<ModalPopupGate> =
  Symbol('vbenModalPopupGate');
