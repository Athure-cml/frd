<script lang="ts" setup>
import type { WorkspaceMetricView } from './map-workspace';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

defineProps<{
  items: WorkspaceMetricView[];
}>();
</script>

<template>
  <div class="workspace-kpi-grid">
    <article
      v-for="item in items"
      :key="item.title"
      class="workspace-kpi-card"
      :aria-label="item.title"
    >
      <div class="workspace-kpi-main">
        <span class="workspace-kpi-label">{{ item.title }}</span>
        <p class="workspace-kpi-value">{{ item.value.toLocaleString() }}</p>
        <p
          class="workspace-kpi-trend"
          :class="
            item.trend >= 0
              ? 'workspace-kpi-trend--up'
              : 'workspace-kpi-trend--down'
          "
        >
          {{ $t('page.workspace.vsYesterday') }}
          <IconifyIcon
            :icon="item.trend >= 0 ? 'lucide:arrow-up' : 'lucide:arrow-down'"
            class="size-3"
          />
          {{ Math.abs(item.trend) }}
        </p>
      </div>
      <span
        class="workspace-kpi-icon"
        :class="`workspace-kpi-icon--${item.iconTone}`"
        aria-hidden="true"
      >
        <IconifyIcon :icon="item.icon" class="size-5" />
      </span>
    </article>
  </div>
</template>
