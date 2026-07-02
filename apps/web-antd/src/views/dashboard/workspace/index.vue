<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useI18n } from '@vben/locales';
import { useUserStore } from '@vben/stores';

import { $t } from '#/locales';

import { formatWorkspaceDate, resolveGreetingKey } from './data';
import WorkspaceHeader from './workspace-header.vue';
import WorkspaceKpi from './workspace-kpi.vue';
import {
  getWorkspaceMetrics,
  getWorkspaceNotices,
  getWorkspacePipeline,
  getWorkspaceTodos,
  getWorkspaceTopRoutes,
} from './workspace-mock';
import WorkspaceNoticeCard from './workspace-notice-card.vue';
import WorkspacePipelineCard from './workspace-pipeline-card.vue';
import WorkspaceRoutesCard from './workspace-routes-card.vue';
import WorkspaceTodoCard from './workspace-todo-card.vue';
import WorkspaceTrendCard from './workspace-trend-card.vue';

import './workspace.css';

const userStore = useUserStore();
const router = useRouter();
const { locale } = useI18n();

const metrics = computed(() => getWorkspaceMetrics());
const todos = computed(() => getWorkspaceTodos());
const pipeline = computed(() => getWorkspacePipeline());
const notices = computed(() => getWorkspaceNotices());
const topRoutes = computed(() => getWorkspaceTopRoutes());

const userName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '',
);

const greeting = computed(() => $t(resolveGreetingKey(), [userName.value]));

const dateLabel = computed(() =>
  formatWorkspaceDate(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'),
);

function navTo(url: string) {
  if (url.startsWith('/')) {
    router.push(url).catch(() => undefined);
  }
}
</script>

<template>
  <div class="dashboard-shell workspace-page">
    <WorkspaceHeader
      :date-label="dateLabel"
      :greeting="greeting"
      :subtitle="$t('page.workspace.subtitle')"
      @create-quote="navTo('/quotes/create')"
      @nav="navTo"
    />

    <WorkspaceKpi :items="metrics" />

    <div class="workspace-mid-grid">
      <WorkspaceTrendCard />
      <WorkspaceTodoCard
        :items="todos"
        @item-click="(id) => navTo(`/quotes/${id}/edit`)"
        @view-all="navTo('/quotes/list')"
      />
    </div>

    <div class="workspace-bottom-grid">
      <WorkspacePipelineCard
        :items="pipeline"
        @item-click="(id) => navTo(`/quotes/${id}/edit`)"
        @view-all="navTo('/quotes/list')"
      />
      <WorkspaceRoutesCard :items="topRoutes" @view-all="navTo('/analytics')" />
      <WorkspaceNoticeCard :items="notices" @view-all="navTo('/analytics')" />
    </div>
  </div>
</template>
