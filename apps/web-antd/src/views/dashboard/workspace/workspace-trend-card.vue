<script lang="ts" setup>
import type { WorkspaceQuoteStatsView } from './map-workspace';

import { computed, ref } from 'vue';

import { Radio } from 'ant-design-vue';

import { $t } from '#/locales';

import AnalyticsTrends from '../analytics/analytics-trends.vue';
import WorkspaceCard from './workspace-card.vue';

const props = withDefaults(
  defineProps<{
    stats?: WorkspaceQuoteStatsView;
  }>(),
  {
    stats: () => ({
      inquiries: [],
      months: [],
      quoted: [],
      yearInquiries: [],
      yearQuoted: [],
      years: [],
    }),
  },
);

const period = ref<'month' | 'year'>('month');

const chartMonths = computed(() =>
  period.value === 'year' ? props.stats.years : props.stats.months,
);
const chartInquiries = computed(() =>
  period.value === 'year' ? props.stats.yearInquiries : props.stats.inquiries,
);
const chartQuoted = computed(() =>
  period.value === 'year' ? props.stats.yearQuoted : props.stats.quoted,
);
</script>

<template>
  <WorkspaceCard :title="$t('page.workspace.quoteStats')">
    <template #extra>
      <Radio.Group
        v-model:value="period"
        class="quote-stats-switch"
        size="small"
        button-style="solid"
      >
        <Radio.Button value="month">
          {{ $t('page.workspace.statsByMonth') }}
        </Radio.Button>
        <Radio.Button value="year">
          {{ $t('page.workspace.statsByYear') }}
        </Radio.Button>
      </Radio.Group>
    </template>
    <div class="workspace-chart-area">
      <AnalyticsTrends
        :inquiries="chartInquiries"
        :months="chartMonths"
        :quoted="chartQuoted"
      />
    </div>
  </WorkspaceCard>
</template>

<style scoped>
.quote-stats-switch {
  display: inline-flex;
}

.quote-stats-switch :deep(.ant-radio-button-wrapper) {
  height: 28px;
  padding-inline: 10px;
  line-height: 26px;
}
</style>
