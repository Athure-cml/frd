<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { AnnouncementApi } from '#/api/system/announcement';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  copyAnnouncement,
  deleteAnnouncement,
  disableAnnouncement,
  getAnnouncementList,
} from '#/api/system/announcement';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  getAnnouncementStatusColor,
  getAnnouncementStatusLabel,
  normalizeAnnouncementSearchValues,
  shouldShowReadStats,
  useAnnouncementColumns,
  useAnnouncementSearchSchema,
} from './data';
import FormModal from './modules/form.vue';

import '../shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['sys:announcement:manage']);

const [FormModalHost, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData(undefined).open();
}

function onEdit(row: AnnouncementApi.Announcement) {
  formModalApi.setData(row).open();
}

async function onCopy(row: AnnouncementApi.Announcement) {
  const hideLoading = message.loading({
    content: $t('page.system.announcementPage.copying', [row.title]),
    duration: 0,
    key: 'announcement_copy_msg',
  });
  try {
    await copyAnnouncement(row.id);
    message.success({
      content: $t('page.system.announcementPage.copySuccess'),
      key: 'announcement_copy_msg',
    });
    await gridApi.query();
  } catch {
    hideLoading();
    message.error($t('page.system.announcementPage.copyFailed'));
  }
}

function onDisable(row: AnnouncementApi.Announcement) {
  Modal.confirm({
    content: $t('page.system.announcementPage.disableConfirm', [row.title]),
    okText: $t('page.system.announcementPage.actions.disable'),
    onOk: async () => {
      try {
        await disableAnnouncement(row.id);
        message.success($t('page.system.announcementPage.disableSuccess'));
        await gridApi.query();
      } catch {
        message.error($t('page.system.announcementPage.disableFailed'));
        throw new Error('disable failed');
      }
    },
    title: $t('common.prompt'),
  });
}

function onDelete(row: AnnouncementApi.Announcement) {
  Modal.confirm({
    content: $t('page.system.announcementPage.deleteConfirm', [row.title]),
    okButtonProps: { danger: true },
    okText: $t('common.delete'),
    onOk: async () => {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [row.title]),
        duration: 0,
        key: 'announcement_delete_msg',
      });
      try {
        await deleteAnnouncement(row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [row.title]),
          key: 'announcement_delete_msg',
        });
        await gridApi.query();
      } catch {
        hideLoading();
        message.error($t('page.system.announcementPage.deleteFailed'));
      }
    },
    title: $t('common.prompt'),
  });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<AnnouncementApi.Announcement>) {
  switch (code) {
    case 'copy': {
      onCopy(row).catch(() => undefined);
      break;
    }
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'disable': {
      onDisable(row);
      break;
    }
    case 'edit': {
      onEdit(row);
      break;
    }
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useAnnouncementSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    id: 'system-announcement-list',
    columns: useAnnouncementColumns(onActionClick, canManage),
    emptyText: $t('page.system.announcementPage.emptyList'),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const items = await getAnnouncementList(
            normalizeAnnouncementSearchValues(formValues),
          );
          return { items, total: items.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<AnnouncementApi.Announcement>,
});
</script>

<template>
  <Page auto-content-height :description="$t('page.system.hint.announcement')">
    <FormModalHost @success="gridApi.query()" />
    <Grid
      class="system-grid system-announcement-grid"
      :form-options="searchFormOptions"
    >
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.system.announcementPage.actions.create') }}
        </Button>
      </template>
      <template #readStats="{ row }">
        <span
          v-if="!shouldShowReadStats(row.status)"
          class="text-muted-foreground"
        >
          —
        </span>
        <span v-else class="sys-announcement-read-stats sys-code">
          {{
            $t('page.system.announcementPage.readStats', [
              row.readCount ?? 0,
              row.unreadCount ?? 0,
            ])
          }}
        </span>
      </template>
      <template #status="{ row }">
        <Tag class="m-0" :color="getAnnouncementStatusColor(row.status)">
          {{ getAnnouncementStatusLabel(row.status) }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>
