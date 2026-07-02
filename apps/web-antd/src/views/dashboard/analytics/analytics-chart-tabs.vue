<script lang="ts" setup>
import { ref } from 'vue';

import { $t } from '#/locales';

import WorkspaceCard from '../workspace/workspace-card.vue';
import AnalyticsTrends from './analytics-trends.vue';
import AnalyticsVisits from './analytics-visits.vue';

type ChartTab = 'trends' | 'volume';

const activeTab = ref<ChartTab>('trends');

const tabs: { key: ChartTab; label: string }[] = [
  { key: 'trends', label: $t('page.analytics.tabs.amountTrend') },
  { key: 'volume', label: $t('page.analytics.tabs.monthlyVolume') },
];
</script>

<template>
  <WorkspaceCard :title="$t('page.workspace.quoteStats')">
    <div class="analytics-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="analytics-tab"
        :class="{ 'analytics-tab--active': activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="dashboard-chart-area">
      <AnalyticsTrends v-if="activeTab === 'trends'" />
      <AnalyticsVisits v-else />
    </div>
  </WorkspaceCard>
</template>
