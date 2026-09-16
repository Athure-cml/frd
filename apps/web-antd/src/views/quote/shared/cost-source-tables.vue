<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import CostSnapshotGrid from './cost-snapshot-grid.vue';

const props = withDefaults(
  defineProps<{
    canImport?: boolean;
    matches: QuoteApi.QuoteCostMatchItem[];
  }>(),
  {
    canImport: false,
  },
);

const emit = defineEmits<{
  import: [type: QuoteCostType];
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

function listByType(type: QuoteCostType) {
  return props.matches.filter((item) => item.costType === type);
}

const sections = computed(() =>
  COST_TYPES.map((type) => {
    if (type === 'SEA') {
      const seaMatches = listByType('SEA');
      return {
        match: seaMatches[0],
        matches: seaMatches,
        type,
      };
    }
    const match = latestByType(type);
    return {
      match,
      matches: match ? [match] : [],
      type,
    };
  }),
);

function onImport(type: QuoteCostType) {
  emit('import', type);
}
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
        <div class="quote-cost-source__actions">
          <Tag v-if="section.matches.length === 0" color="default">
            {{ $t('page.quote.message.noCostSnapshot') }}
          </Tag>
          <Button
            v-if="canImport"
            class="quote-cost-source__import-btn"
            size="small"
            @click="onImport(section.type)"
          >
            <IconifyIcon class="mr-1 size-3.5" icon="lucide:database" />
            {{ $t('page.quote.actions.importCostData') }}
          </Button>
        </div>
      </div>
      <CostSnapshotGrid
        :empty-description="
          $t('page.quote.message.noCostImported', [tabLabel(section.type)])
        "
        :match="section.match"
        :matches="section.matches"
        :type="section.type"
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
  overflow: auto visible;
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--radius) + 2px);
}

.quote-cost-source__head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: color-mix(in srgb, hsl(var(--muted)) 22%, hsl(var(--card)));
  border-bottom: 1px solid hsl(var(--border));
}

.quote-cost-source__title {
  font-size: 13px;
  font-weight: 600;
}

.quote-cost-source__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
