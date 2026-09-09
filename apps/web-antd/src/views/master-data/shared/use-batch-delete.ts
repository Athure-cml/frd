import { message, Modal } from 'ant-design-vue';

import { $t } from '#/locales';

import { getGridSelectedIds } from '../../shared/export-params';

type GridApiLike = {
  grid?: {
    clearCheckboxReserve?: () => void;
    clearCheckboxRow?: () => void;
  };
  query: () => void;
};

export const masterDataCheckboxConfig = {
  highlight: true,
  reserve: true,
  showReserveStatus: true,
};

export function useMasterDataBatchDelete(options: {
  batchDelete: (ids: number[]) => Promise<unknown>;
  gridApi: GridApiLike;
}) {
  function clearSelection() {
    options.gridApi.grid?.clearCheckboxRow?.();
    options.gridApi.grid?.clearCheckboxReserve?.();
  }

  function onBatchDelete() {
    const ids = getGridSelectedIds(options.gridApi);
    if (ids.length === 0) {
      message.warning($t('page.masterData.hint.selectRows'));
      return;
    }
    Modal.confirm({
      content: $t('page.masterData.confirm.batchDelete', [ids.length]),
      onOk: async () => {
        await options.batchDelete(ids);
        message.success($t('ui.actionMessage.operationSuccess'));
        clearSelection();
        options.gridApi.query();
      },
      title: $t('common.prompt'),
    });
  }

  return { clearSelection, onBatchDelete };
}
