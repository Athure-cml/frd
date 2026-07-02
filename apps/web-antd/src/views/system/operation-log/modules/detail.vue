<script lang="ts" setup>
import type { OperationLogApi } from '#/api/system/operation-log';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Descriptions, Spin } from 'ant-design-vue';

import { getOperationLogDetail } from '#/api/system/operation-log';
import { $t } from '#/locales';

import {
  getOperationLogActionLabel,
  getOperationLogModuleLabel,
} from '../data';

const detail = ref<null | OperationLogApi.OperationLog>(null);
const loading = ref(false);

const t = (key: string) => $t(`page.system.operationLogPage.${key}`);

const [Drawer, drawerApi] = useVbenDrawer({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = null;
      return;
    }
    const row = drawerApi.getData<OperationLogApi.OperationLog>();
    if (!row?.id) {
      return;
    }
    loading.value = true;
    try {
      detail.value = await getOperationLogDetail(row.id);
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Drawer :title="t('detailTitle')">
    <Spin :spinning="loading">
      <Descriptions v-if="detail" :column="1" bordered size="small">
        <Descriptions.Item :label="t('fields.createdAt')">
          {{ detail.createdAt }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.realName')">
          {{ detail.realName || '—' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.username')">
          {{ detail.username || '—' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.module')">
          {{ getOperationLogModuleLabel(detail.module) }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.action')">
          {{ getOperationLogActionLabel(detail.action) }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.summary')">
          {{ detail.summary || '—' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.requestMethod')">
          {{ detail.requestMethod || '—' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.requestUri')">
          {{ detail.requestUri || '—' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.ipAddress')">
          {{ detail.ipAddress || '—' }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.success')">
          {{
            detail.success
              ? $t('page.system.operationLogPage.status.success')
              : $t('page.system.operationLogPage.status.failed')
          }}
        </Descriptions.Item>
        <Descriptions.Item
          v-if="detail.errorMessage"
          :label="t('fields.errorMessage')"
        >
          {{ detail.errorMessage }}
        </Descriptions.Item>
        <Descriptions.Item :label="t('fields.requestBody')">
          <pre
            class="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs"
            >{{ detail.requestBody || '—' }}</pre>
        </Descriptions.Item>
      </Descriptions>
    </Spin>
  </Drawer>
</template>
