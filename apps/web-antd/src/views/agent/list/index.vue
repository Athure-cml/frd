<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { AgentApi } from '#/api/agent';

import { ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteAgent,
  deleteAgent,
  downloadAgentExport,
  exportAgent,
  getAgentList,
  importAgent,
  pinAgent,
  reorderAgent,
  unpinAgent,
} from '#/api/agent';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import ImportModal from '../../cost-library/components/import-modal.vue';
import {
  buildListExportParams,
  getGridSelectedIds,
} from '../../shared/export-params';
import {
  buildPartyRowDragGridOptions,
  collectGridRowIds,
} from '../../shared/party-row-drag';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { buildAgentSearchSchema, useAgentColumns } from './data';
import Form from './modules/form.vue';

import '../../customer/shared/customer.css';

const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();
const canCreate = hasAccessByCodes(['agent:create']);
const canEdit = hasAccessByCodes(['agent:edit']);
const canDelete = hasAccessByCodes(['agent:delete']);
const canView = hasAccessByCodes(['agent:view']);

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const exporting = ref(false);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: AgentApi.Agent) {
  formModalApi.setData(row).open();
}

function onDelete(row: AgentApi.Agent) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'agent_delete_msg',
  });
  deleteAgent(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'agent_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function clearSelection() {
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
}

function onBatchDelete() {
  const ids = getGridSelectedIds(gridApi);
  if (ids.length === 0) {
    message.warning($t('page.agent.hint.selectRows'));
    return;
  }
  Modal.confirm({
    content: $t('page.agent.confirm.batchDelete', [ids.length]),
    onOk: async () => {
      await batchDeleteAgent(ids);
      message.success($t('ui.actionMessage.operationSuccess'));
      clearSelection();
      gridApi.query();
    },
    title: $t('common.prompt'),
  });
}

function onTogglePin(row: AgentApi.Agent, pinned: boolean) {
  const key = 'agent_pin_msg';
  const hideLoading = message.loading({
    content: pinned
      ? $t('page.agent.hint.pinning')
      : $t('page.agent.hint.unpinning'),
    duration: 0,
    key,
  });
  const request = pinned ? pinAgent(row.id) : unpinAgent(row.id);
  request
    .then(() => {
      message.success({
        content: pinned
          ? $t('page.agent.hint.pinSuccess', [row.name])
          : $t('page.agent.hint.unpinSuccess', [row.name]),
        key,
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({ code, row }: OnActionClickParams<AgentApi.Agent>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
  if (code === 'pin') {
    onTogglePin(row, true);
  }
  if (code === 'unpin') {
    onTogglePin(row, false);
  }
}

async function onExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.agent.hint.exporting'),
    duration: 0,
    key: 'agent_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportAgent(
      buildListExportParams(formValues, getGridSelectedIds(gridApi)),
    );
    await downloadAgentExport(blob as Blob, '代理—xlsx');
    message.success({
      content: $t('page.agent.hint.exportSuccess'),
      key: 'agent_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

async function onRowDragend() {
  if (!canEdit) {
    return;
  }
  const ids = collectGridRowIds(gridApi.grid);
  if (ids.length === 0) {
    return;
  }
  const key = 'agent_reorder_msg';
  const hideLoading = message.loading({
    content: $t('page.agent.hint.reordering'),
    duration: 0,
    key,
  });
  try {
    await reorderAgent(ids);
    message.success({
      content: $t('page.agent.hint.reorderSuccess'),
      key,
    });
  } catch {
    hideLoading();
  } finally {
    gridApi.query();
  }
}

function buildColumns() {
  return useAgentColumns(
    onActionClick,
    canEdit,
    canDelete,
    canViewInternalCodes.value,
  );
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: buildAgentSearchSchema(canViewInternalCodes.value),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    rowDragend: onRowDragend,
  },
  gridOptions: {
    id: 'agent-list',
    checkboxConfig: {
      highlight: true,
      reserve: true,
      showReserveStatus: true,
    },
    columns: buildColumns(),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getAgentList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    ...buildPartyRowDragGridOptions(canEdit, 'page.agent'),
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<AgentApi.Agent>,
});

watch(canViewInternalCodes, () => {
  gridApi.setGridOptions({ columns: buildColumns() });
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.agent.hint.list')"
    :title="$t('page.agent.list')"
  >
    <FormModal @success="onRefresh" />
    <ImportModal
      ref="importModalRef"
      :import-fn="importAgent"
      :title="$t('page.agent.actions.import')"
      @success="onRefresh"
    />
    <Grid class="customer-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canCreate" class="mr-2" @click="importModalRef?.open()">
          <ArrowUpToLine class="size-4" />
          {{ $t('page.agent.actions.import') }}
        </Button>
        <Button
          v-if="canView"
          :loading="exporting"
          class="mr-2"
          @click="onExport"
        >
          <Download class="size-4" />
          {{ $t('page.agent.actions.export') }}
        </Button>
        <Button v-if="canDelete" class="mr-2" danger @click="onBatchDelete">
          {{ $t('page.agent.actions.batchDelete') }}
        </Button>
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.agent.actions.create') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="customer-code">{{ row.code }}</span>
      </template>
      <template #name="{ row }">
        <span class="party-name-cell">
          <span class="party-name-text" :title="row.name">{{ row.name }}</span>
          <Tag v-if="row.pinnedAt" class="party-pin-tag" color="processing">
            {{ $t('page.agent.badge.pinned') }}
          </Tag>
        </span>
      </template>
    </Grid>
  </Page>
</template>
