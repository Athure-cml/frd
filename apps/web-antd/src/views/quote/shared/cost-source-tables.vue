<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed } from 'vue';

import { Empty, Table, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

const props = defineProps<{
  matches: QuoteApi.QuoteCostMatchItem[];
}>();

const COST_TYPES: QuoteCostType[] = ['ROAD', 'SEA', 'FUMIGATION'];

const TABLE_COLUMNS: Record<
  QuoteCostType,
  Array<{ dataIndex: string; title: string; width?: number }>
> = {
  ROAD: [
    { dataIndex: 'validDate', title: 'validDate', width: 100 },
    { dataIndex: 'city', title: 'City', width: 100 },
    { dataIndex: 'state', title: 'State', width: 72 },
    { dataIndex: 'por', title: 'POR', width: 88 },
    { dataIndex: 'pol', title: 'POL', width: 88 },
    { dataIndex: 'allInNonOak', title: 'ALL IN NON-OAK', width: 120 },
    { dataIndex: 'allInOak', title: 'ALL IN OAK', width: 110 },
    { dataIndex: 'fscFreight', title: 'FSC FREIGHT', width: 110 },
    { dataIndex: 'supplier', title: 'supplier', width: 100 },
  ],
  SEA: [
    { dataIndex: 'validDate', title: 'validDate', width: 100 },
    { dataIndex: 'pol', title: 'POL', width: 88 },
    { dataIndex: 'pod', title: 'POD', width: 88 },
    { dataIndex: 'ssl', title: 'SSL', width: 100 },
    { dataIndex: 'ofRateUsd', title: 'O/F RATE (USD)', width: 120 },
    { dataIndex: 'unitPrice', title: 'unitPrice', width: 90 },
    { dataIndex: 'spec', title: 'spec', width: 80 },
    { dataIndex: 'currency', title: 'currency', width: 80 },
  ],
  FUMIGATION: [
    { dataIndex: 'port', title: 'port', width: 88 },
    { dataIndex: 'station', title: 'station', width: 88 },
    { dataIndex: 'nonOakOutdoor', title: 'NON-OAK OUTDOOR', width: 130 },
    { dataIndex: 'nonOakIndoor', title: 'NON-OAK IN DOOR', width: 130 },
    { dataIndex: 'oakOutdoor', title: 'OAK OUTDOOR', width: 110 },
    { dataIndex: 'oakIndoor', title: 'OAK IN DOOR', width: 110 },
    { dataIndex: 'remark', title: 'REMARK', width: 160 },
  ],
};

function tabLabel(type: QuoteCostType) {
  return $t(
    `page.quote.costTabs.${type === 'ROAD' ? 'road' : type === 'SEA' ? 'sea' : 'fumigation'}`,
  );
}

function latestByType(type: QuoteCostType) {
  return props.matches.find((item) => item.costType === type);
}

const sections = computed(() =>
  COST_TYPES.map((type) => {
    const match = latestByType(type);
    const snapshot = match?.snapshot ?? {};
    return {
      columns: TABLE_COLUMNS[type],
      dataSource: match
        ? [
            {
              key: `${type}-${match.costRefId}`,
              costRefId: match.costRefId,
              costVersion: match.costVersion ?? '—',
              ...Object.fromEntries(
                Object.entries(snapshot).map(([k, v]) => [
                  k,
                  v === null || v === undefined || v === '' ? '—' : String(v),
                ]),
              ),
            },
          ]
        : [],
      match,
      type,
    };
  }),
);
</script>

<template>
  <div class="quote-cost-source">
    <div
      v-for="section in sections"
      :key="section.type"
      class="quote-cost-source__block"
    >
      <div class="quote-cost-source__head">
        <span class="quote-cost-source__title">{{
          tabLabel(section.type)
        }}</span>
        <template v-if="section.match">
          <Tag>ID {{ section.match.costRefId }}</Tag>
          <Tag v-if="section.match.costVersion" color="blue">
            {{ section.match.costVersion }}
          </Tag>
        </template>
        <Tag v-else color="default">
          {{ $t('page.quote.message.noCostSnapshot') }}
        </Tag>
      </div>
      <Table
        v-if="section.dataSource.length"
        bordered
        :columns="[
          { dataIndex: 'costRefId', title: 'costRefId', width: 88 },
          { dataIndex: 'costVersion', title: 'costVersion', width: 100 },
          ...section.columns,
        ]"
        :data-source="section.dataSource"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        size="small"
      />
      <Empty
        v-else
        :description="
          $t('page.quote.message.noCostImported', [tabLabel(section.type)])
        "
      />
    </div>
  </div>
</template>

<style scoped>
.quote-cost-source {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quote-cost-source__block {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--radius) + 2px);
}

.quote-cost-source__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  background: color-mix(in srgb, hsl(var(--muted)) 22%, hsl(var(--card)));
  border-bottom: 1px solid hsl(var(--border));
}

.quote-cost-source__title {
  margin-right: 4px;
}
</style>
