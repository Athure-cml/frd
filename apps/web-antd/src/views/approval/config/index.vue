<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ApprovalApi } from '#/api/approval';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteApprovalConfig, getApprovalConfigList } from '#/api/approval';
import { $t } from '#/locales';

import {
  useApprovalConfigColumns,
  useApprovalConfigSearchSchema,
} from './data';
import FormModal from './modules/form.vue';

import '../../quote/shared/quote.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['approval:config:manage']);

const [FormModalHost, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData(undefined).open();
}

function onEdit(row: ApprovalApi.ConfigItem) {
  formModalApi.setData(row).open();
}

function onDelete(row: ApprovalApi.ConfigItem) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.configNo]),
    duration: 0,
    key: 'approval_config_delete_msg',
  });
  deleteApprovalConfig(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.configNo]),
        key: 'approval_config_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ApprovalApi.ConfigItem>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useApprovalConfigSearchSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useApprovalConfigColumns(onActionClick, canManage),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getApprovalConfigList({
            ...formValues,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
          return {
            items: result.items,
            total: result.total,
          };
        },
      },
    },
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<ApprovalApi.ConfigItem>,
});
</script>

<template>
  <Page :title="$t('page.approval.config')">
    <FormModalHost @success="gridApi.query()" />
    <Grid>
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.approval.actions.createConfig') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
