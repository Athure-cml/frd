<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteGlobalPort,
  downloadGlobalPortExport,
  exportGlobalPort,
  getGlobalPortList,
  importGlobalPort,
  waitForGlobalPortSync,
} from '#/api/master-data/global-port';
import { $t } from '#/locales';

import ImportModal from '../../cost-library/components/import-modal.vue';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  getGlobalPortRowName,
  useGlobalPortColumns,
  useGlobalPortSearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['md_global_port:manage']);

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const exporting = ref(false);
const syncing = ref(false);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: GlobalPortApi.GlobalPort) {
  formModalApi.setData(row).open();
}

function onDelete(row: GlobalPortApi.GlobalPort) {
  const name = getGlobalPortRowName(row);
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [name]),
    duration: 0,
    key: 'global_port_delete_msg',
  });
  deleteGlobalPort(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [name]),
        key: 'global_port_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<GlobalPortApi.GlobalPort>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

async function onExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.masterData.hint.exporting'),
    duration: 0,
    key: 'global_port_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportGlobalPort(formValues ?? {});
    await downloadGlobalPortExport(blob as Blob, 'global-port.xlsx');
    message.success({
      content: $t('page.masterData.hint.exportSuccess'),
      key: 'global_port_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

async function onSyncUnlocode() {
  syncing.value = true;
  message.loading({
    content: $t('page.masterData.hint.syncingUnlocode'),
    duration: 0,
    key: 'global_port_sync_msg',
  });
  try {
    const result = await waitForGlobalPortSync((phase) => {
      if (phase === 'LOADING') {
        message.loading({
          content: $t('page.masterData.hint.syncingUnlocodeLoading'),
          duration: 0,
          key: 'global_port_sync_msg',
        });
      } else if (phase === 'IMPORTING') {
        message.loading({
          content: $t('page.masterData.hint.syncingUnlocodeImporting'),
          duration: 0,
          key: 'global_port_sync_msg',
        });
      }
    });
    message.success({
      content: $t('page.masterData.hint.syncUnlocodeSuccess', [
        result.inserted,
        result.updated,
      ]),
      key: 'global_port_sync_msg',
    });
    gridApi.query();
  } catch (error: any) {
    message.error({
      content: error?.message ?? $t('page.masterData.hint.syncUnlocodeFailed'),
      key: 'global_port_sync_msg',
    });
  } finally {
    syncing.value = false;
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useGlobalPortSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useGlobalPortColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: { enabled: true },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getGlobalPortList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          return { items: result.items, total: result.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<GlobalPortApi.GlobalPort>,
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.masterData.hint.globalPort')"
  >
    <FormModal @success="gridApi.query()" />
    <ImportModal
      ref="importModalRef"
      :import-fn="importGlobalPort"
      :title="$t('page.masterData.actions.importGlobalPort')"
      @success="gridApi.query()"
    />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button
          v-if="canManage"
          :loading="syncing"
          class="mr-2"
          @click="onSyncUnlocode"
        >
          {{ $t('page.masterData.actions.syncUnlocode') }}
        </Button>
        <Button v-if="canManage" class="mr-2" @click="importModalRef?.open()">
          <ArrowUpToLine class="size-4" />
          {{ $t('page.masterData.actions.import') }}
        </Button>
        <Button :loading="exporting" class="mr-2" @click="onExport">
          <Download class="size-4" />
          {{ $t('page.masterData.actions.export') }}
        </Button>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.masterData.actions.createGlobalPort') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
