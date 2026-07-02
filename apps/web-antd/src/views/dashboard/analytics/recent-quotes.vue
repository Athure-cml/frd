<script lang="ts" setup>
import type { RecentQuoteItem } from './mock-data';

import { computed } from 'vue';

import { Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

const props = withDefaults(
  defineProps<{
    clickable?: boolean;
    compact?: boolean;
    data: RecentQuoteItem[];
  }>(),
  {
    clickable: false,
    compact: false,
  },
);

const emit = defineEmits<{
  rowClick: [id: string];
}>();

const modeLabels: Record<RecentQuoteItem['mode'], string> = {
  fumigation: $t('page.costLibrary.fumigation'),
  road: $t('page.costLibrary.road'),
  sea: $t('page.costLibrary.sea'),
};

const statusColorMap: Record<RecentQuoteItem['status'], string> = {
  draft: 'default',
  expired: 'default',
  lost: 'error',
  sent: 'processing',
  won: 'success',
};

const allColumns = [
  {
    dataIndex: 'quoteNo',
    key: 'quoteNo',
    title: $t('page.analytics.quoteNo'),
    width: 140,
  },
  {
    dataIndex: 'customer',
    ellipsis: true,
    key: 'customer',
    title: $t('page.analytics.customer'),
  },
  {
    dataIndex: 'mode',
    key: 'mode',
    title: $t('page.analytics.transportMode'),
    width: 110,
  },
  {
    dataIndex: 'route',
    ellipsis: true,
    key: 'route',
    title: $t('page.analytics.route'),
  },
  {
    align: 'right' as const,
    dataIndex: 'amount',
    key: 'amount',
    title: $t('page.analytics.amount'),
    width: 110,
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: $t('page.analytics.quoteStatus'),
    width: 100,
  },
  {
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    title: $t('page.analytics.updatedAt'),
    width: 160,
  },
];

const columns = computed(() =>
  props.compact
    ? allColumns.filter((col) => !['mode', 'route'].includes(col.key))
    : allColumns,
);

function onRow(record: RecentQuoteItem) {
  if (!props.clickable && !props.compact) {
    return {};
  }
  return {
    onClick: () => emit('rowClick', record.id),
    style: { cursor: 'pointer' },
  };
}
</script>

<template>
  <Table
    :columns="columns"
    :custom-row="onRow"
    :data-source="data"
    :pagination="false"
    :row-key="(record: RecentQuoteItem) => record.id"
    size="middle"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'mode'">
        {{ modeLabels[(record as RecentQuoteItem).mode] }}
      </template>
      <template v-else-if="column.key === 'amount'">
        ${{ (record as RecentQuoteItem).amount.toLocaleString() }}
      </template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="statusColorMap[(record as RecentQuoteItem).status]">
          {{
            $t(`page.analytics.status.${(record as RecentQuoteItem).status}`)
          }}
        </Tag>
      </template>
    </template>
  </Table>
</template>
