<script lang="ts" setup>
import { $t } from '#/locales';

import AnalyticsTrends from '../analytics/analytics-trends.vue';
import WorkspaceCard from './workspace-card.vue';
</script>

<template>
  <WorkspaceCard :title="$t('page.workspace.quoteStats')">
    <div class="workspace-chart-toolbar">
      <span class="workspace-chart-filter">{{
        $t('page.workspace.thisMonth')
      }}</span>
    </div>
    <div class="workspace-chart-area">
      <AnalyticsTrends />
    </div>
  </WorkspaceCard>
</template>
