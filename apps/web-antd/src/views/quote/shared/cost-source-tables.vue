<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed } from 'vue';

import { Empty, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import CostSnapshotGrid from './cost-snapshot-grid.vue';

const props = defineProps<{
  matches: QuoteApi.QuoteCostMatchItem[];
}>();

const COST_TYPES: QuoteCostType[] = ['ROAD', 'SEA', 'FUMIGATION'];

function tabLabel(type: QuoteCostType) {
  return $t(
    `page.quote.costTabs.${type === 'ROAD' ? 'road' : type === 'SEA' ? 'sea' : 'fumigation'}`,
  );
}

function latestByType(type: QuoteCostType) {
  return props.matches.find((item) => item.costType === type);
}

const sections = computed(() =>
  COST_TYPES.map((type) => ({
    match: latestByType(type),
    type,
  })),
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
      <CostSnapshotGrid
        v-if="section.match"
        :key="`${section.type}-${section.match.costRefId}`"
        :match="section.match"
        :type="section.type"
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
