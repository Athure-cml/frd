<script lang="ts" setup>
import type { WorkspaceQuoteStatsView } from './map-workspace';

import { $t } from '#/locales';

import AnalyticsTrends from '../analytics/analytics-trends.vue';
import WorkspaceCard from './workspace-card.vue';

withDefaults(
  defineProps<{
    stats?: WorkspaceQuoteStatsView;
  }>(),
  {
    stats: () => ({ inquiries: [], months: [], quoted: [] }),
  },
);
</script>

<template>
  <WorkspaceCard :title="$t('page.workspace.quoteStats')">
    <div class="workspace-chart-toolbar">
      <span class="workspace-chart-filter">{{
        $t('page.workspace.last12Months')
      }}</span>
    </div>
    <div class="workspace-chart-area">
      <AnalyticsTrends
        :inquiries="stats.inquiries"
        :months="stats.months"
        :quoted="stats.quoted"
      />
    </div>
  </WorkspaceCard>
</template>
