<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { InlandPorApi } from '#/api/master-data/inland-por';

import { ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteInlandPor,
  downloadInlandPorExport,
  exportInlandPor,
  getInlandPorList,
  importInlandPor,
} from '#/api/master-data/inland-por';
import { $t } from '#/locales';

import ImportModal from '../../cost-library/components/import-modal.vue';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  getInlandPorRowName,
  useInlandPorColumns,
  useInlandPorSearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['md_inland_por:manage']);

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const exporting = ref(false);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: InlandPorApi.InlandPor) {
  formModalApi.setData(row).open();
}

function onDelete(row: InlandPorApi.InlandPor) {
  const name = getInlandPorRowName(row);
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [name]),
    duration: 0,
    key: 'inland_por_delete_msg',
  });
  deleteInlandPor(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [name]),
        key: 'inland_por_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<InlandPorApi.InlandPor>) {
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
    key: 'inland_por_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportInlandPor(formValues ?? {});
    await downloadInlandPorExport(blob as Blob, 'inland-por.xlsx');
    message.success({
      content: $t('page.masterData.hint.exportSuccess'),
      key: 'inland_por_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useInlandPorSearchSchema(),
  showCollapseButton: false,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useInlandPorColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: { enabled: true },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getInlandPorList({
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
  } as VxeTableGridOptions<InlandPorApi.InlandPor>,
});
</script>

<template>
  <Page auto-content-height :description="$t('page.masterData.hint.inlandPor')">
    <FormModal @success="gridApi.query()" />
    <ImportModal
      ref="importModalRef"
      :import-fn="importInlandPor"
      :title="$t('page.masterData.actions.importInlandPor')"
      @success="gridApi.query()"
    />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
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
          {{ $t('page.masterData.actions.createInlandPor') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
