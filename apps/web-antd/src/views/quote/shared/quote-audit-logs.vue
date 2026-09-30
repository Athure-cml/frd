<script lang="ts" setup>
import type { QuoteApi } from '#/api/quote';

import { computed, h, ref, watch } from 'vue';

import { Empty, Table, Tabs, Tag } from 'ant-design-vue';

import { getQuoteApprovalLogs, getQuoteOperationLogs } from '#/api/quote';
import { $t } from '#/locales';

const props = defineProps<{
  quoteId?: number;
}>();

const loading = ref(false);
const tabKey = ref('approval');
const approvalLogs = ref<QuoteApi.ApprovalHistoryItem[]>([]);
const operationLogs = ref<QuoteApi.OperationLogItem[]>([]);

function resultTagColor(record: QuoteApi.ApprovalHistoryItem) {
  if (record.action === 'SUBMIT' || record.result === '提交') {
    return 'blue';
  }
  if (record.action === 'ROLLBACK' || record.result === '撤回') {
    return 'warning';
  }
  if (record.action === 'REJECT' || record.result === '驳回') {
    return 'error';
  }
  if (record.action === 'APPROVE' || record.result === '同意') {
    return 'success';
  }
  return 'default';
}

const approvalColumns = computed(() => [
  {
    dataIndex: 'nodeTitle',
    title: $t('page.quote.audit.node'),
    width: 160,
  },
  {
    dataIndex: 'operatorName',
    title: $t('page.quote.audit.operator'),
    width: 100,
  },
  {
    dataIndex: 'operatedAt',
    title: $t('page.quote.audit.operatedAt'),
    width: 180,
  },
  {
    customRender: ({ record }: { record: QuoteApi.ApprovalHistoryItem }) =>
      h(Tag, { color: resultTagColor(record) }, () => record.result || '—'),
    dataIndex: 'result',
    title: $t('page.quote.audit.result'),
    width: 88,
  },
  {
    dataIndex: 'comment',
    ellipsis: true,
    title: $t('page.quote.audit.comment'),
  },
]);

const operationColumns = computed(() => [
  {
    dataIndex: 'createdAt',
    title: $t('page.quote.audit.operatedAt'),
    width: 180,
  },
  {
    dataIndex: 'realName',
    title: $t('page.quote.audit.operator'),
    width: 100,
  },
  {
    dataIndex: 'summary',
    ellipsis: true,
    title: $t('page.quote.audit.content'),
  },
]);

async function loadLogs() {
  if (!props.quoteId) {
    approvalLogs.value = [];
    operationLogs.value = [];
    return;
  }
  loading.value = true;
  try {
    const [approval, operations] = await Promise.all([
      getQuoteApprovalLogs(props.quoteId),
      getQuoteOperationLogs(props.quoteId, { page: 1, pageSize: 200 }),
    ]);
    approvalLogs.value = approval ?? [];
    operationLogs.value = operations.items ?? [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.quoteId,
  () => {
    void loadLogs();
  },
  { immediate: true },
);

defineExpose({ reload: loadLogs });
</script>

<template>
  <section v-if="quoteId" class="quote-editor-section">
    <div class="quote-editor-section__head">
      <span class="quote-editor-section__title">{{
        $t('page.quote.sections.auditLogs')
      }}</span>
    </div>
    <div class="quote-editor-section__body">
      <Tabs v-model:active-key="tabKey">
        <Tabs.TabPane key="approval" :tab="$t('page.quote.tabs.approvalLog')">
          <Table
            v-if="approvalLogs.length"
            :columns="approvalColumns"
            :data-source="approvalLogs"
            :loading="loading"
            :pagination="false"
            class="quote-log-table"
            row-key="id"
            size="small"
          />
          <Empty v-else :description="$t('common.noData')" />
        </Tabs.TabPane>
        <Tabs.TabPane key="ops" :tab="$t('page.quote.tabs.operationLog')">
          <Table
            v-if="operationLogs.length"
            :columns="operationColumns"
            :data-source="operationLogs"
            :loading="loading"
            :pagination="false"
            class="quote-log-table"
            row-key="id"
            size="small"
          />
          <Empty v-else :description="$t('common.noData')" />
        </Tabs.TabPane>
      </Tabs>
    </div>
  </section>
</template>
