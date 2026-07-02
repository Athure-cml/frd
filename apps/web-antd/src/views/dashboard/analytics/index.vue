<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '#/locales';

import WorkspaceCard from '../workspace/workspace-card.vue';
import WorkspaceKpi from '../workspace/workspace-kpi.vue';
import { getWorkspaceMetrics } from '../workspace/workspace-mock';
import AnalyticsChartTabs from './analytics-chart-tabs.vue';
import AnalyticsVisitsData from './analytics-visits-data.vue';
import AnalyticsVisitsSales from './analytics-visits-sales.vue';
import AnalyticsVisitsSource from './analytics-visits-source.vue';
import { recentQuotes } from './mock-data';
import RecentQuotes from './recent-quotes.vue';

import './analytics.css';

const router = useRouter();

const metrics = computed(() => getWorkspaceMetrics());

function navToQuote(id: string) {
  router.push(`/quotes/${id}/edit`).catch(() => undefined);
}
</script>

<template>
  <div class="dashboard-shell analytics-page">
    <WorkspaceKpi :items="metrics" />

    <div class="analytics-section">
      <AnalyticsChartTabs />
    </div>

    <div class="analytics-section analytics-charts-grid">
      <WorkspaceCard :title="$t('page.analytics.transportMix')">
        <div class="dashboard-chart-area analytics-chart-area--sm">
          <AnalyticsVisitsSource />
        </div>
      </WorkspaceCard>
      <WorkspaceCard :title="$t('page.analytics.statusDistribution')">
        <div class="dashboard-chart-area analytics-chart-area--sm">
          <AnalyticsVisitsData />
        </div>
      </WorkspaceCard>
      <WorkspaceCard :title="$t('page.analytics.topRoutes')">
        <div class="dashboard-chart-area analytics-chart-area--sm">
          <AnalyticsVisitsSales />
        </div>
      </WorkspaceCard>
    </div>

    <div class="analytics-section">
      <WorkspaceCard :title="$t('page.analytics.recentQuotes')">
        <div class="analytics-table-wrap">
          <RecentQuotes
            clickable
            :data="recentQuotes"
            @row-click="navToQuote"
          />
        </div>
      </WorkspaceCard>
    </div>
  </div>
</template>
