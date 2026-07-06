<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { UsStateZipApi } from '#/api/master-data/us-state-zip';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';
import { useI18n } from '@vben/locales';

import { Alert, Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getUsStateList } from '#/api/master-data/us-state';
import {
  deleteUsStateZip,
  downloadUsStateZipExport,
  exportUsStateZip,
  getUsStateZipList,
  importUsStateZipFile,
} from '#/api/master-data/us-state-zip';
import { $t } from '#/locales';

import MasterDataImportModal from '../components/import-modal.vue';
import { useUsStateZipSearchSchema } from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const t = (key: string) => $t(`page.masterData.actions.${key}`);
const h = (key: string) => $t(`page.masterData.hint.${key}`);

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['md_dest_address:manage']);

const importModalRef = ref<InstanceType<typeof MasterDataImportModal>>();
const exporting = ref(false);
const isEmpty = ref(false);
const stateOptions = ref<{ label: string; value: string }[]>([]);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

async function loadStateOptions() {
  const states = await getUsStateList();
  stateOptions.value = states.map((item) => ({
    label: item.code,
    value: item.code,
  }));
}

onMounted(() => {
  loadStateOptions().catch(() => undefined);
});

function onCreateCity() {
  formModalApi.setData({ mode: 'createCity' }).open();
}

function onCreateZip() {
  formModalApi.setData({ mode: 'createZip' }).open();
}

function onEdit(row: UsStateZipApi.Row) {
  formModalApi
    .setData({
      city: row.city,
      cityId: row.cityId,
      mode: 'editZip',
      stateCode: row.stateCode,
      zipCode: row.zipCode,
      zipId: row.id,
    })
    .open();
}

async function onDelete(row: UsStateZipApi.Row) {
  const label = row.zipCode;
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [label]),
    duration: 0,
    key: 'us_state_zip_delete_msg',
  });
  try {
    await deleteUsStateZip(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [label]),
      key: 'us_state_zip_delete_msg',
    });
    await gridApi.query();
  } catch {
    hideLoading();
  }
}

async function onExport() {
  exporting.value = true;
  try {
    const blob = await exportUsStateZip();
    await downloadUsStateZipExport(blob as Blob, 'us-state-zip.xlsx');
    message.success(h('exportSuccess'));
  } finally {
    exporting.value = false;
  }
}

const { locale } = useI18n();
const searchFormOptions = computed(() => {
  void locale.value;
  return {
    collapsed: false,
    schema: useUsStateZipSearchSchema(stateOptions.value),
    showCollapseButton: false,
    submitOnChange: true,
  };
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: [
      {
        field: 'stateCode',
        minWidth: 100,
        title: 'State',
        width: 120,
      },
      {
        field: 'city',
        minWidth: 180,
        title: 'City',
      },
      {
        field: 'zipCode',
        minWidth: 120,
        title: 'Zip code',
        width: 140,
      },
      {
        align: 'center',
        field: 'operation',
        fixed: 'right',
        slots: { default: 'operation' },
        title: '操作',
        width: 140,
      },
    ],
    height: 'auto',
    pagerConfig: { enabled: true },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getUsStateZipList({
            keyword: formValues?.keyword,
            page: page.currentPage,
            pageSize: page.pageSize,
            stateCode: formValues?.stateCode,
          });
          isEmpty.value = result.total === 0;
          return { items: result.items, total: result.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<UsStateZipApi.Row>,
});
</script>

<template>
  <Page auto-content-height :description="h('usStateZip')">
    <FormModal @success="gridApi.query()" />
    <MasterDataImportModal
      ref="importModalRef"
      accept=".xlsx,.xls,.txt"
      hint-key="usStateZipImport"
      :import-fn="importUsStateZipFile"
      :title="$t('page.masterData.actions.importUsStateZip')"
      @success="gridApi.query()"
    />

    <Alert
      v-if="isEmpty"
      class="mb-3"
      show-icon
      type="info"
      :message="h('usStateZipEmpty')"
    />

    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #operation="{ row }">
        <template v-if="canManage">
          <Button size="small" type="link" @click="onEdit(row)">
            {{ $t('common.edit') }}
          </Button>
          <Popconfirm
            :title="$t('ui.actionMessage.deleteConfirm', [row.zipCode])"
            @confirm="onDelete(row)"
          >
            <Button danger size="small" type="link">
              {{ $t('common.delete') }}
            </Button>
          </Popconfirm>
        </template>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #toolbar-tools>
        <Button v-if="canManage" class="mr-2" @click="onCreateCity">
          <Plus class="size-4" />
          {{ t('addCity') }}
        </Button>
        <Button v-if="canManage" class="mr-2" @click="onCreateZip">
          <Plus class="size-4" />
          {{ t('addZip') }}
        </Button>
        <Button v-if="canManage" class="mr-2" @click="importModalRef?.open()">
          <ArrowUpToLine class="size-4" />
          {{ t('import') }}
        </Button>
        <Button :loading="exporting" @click="onExport">
          <Download class="size-4" />
          {{ t('export') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
