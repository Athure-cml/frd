<script lang="ts" setup>
import type { WorkspacePipelineView } from './map-workspace';

import { IconifyIcon } from '@vben/icons';

import { Progress } from 'ant-design-vue';

import { $t } from '#/locales';

import WorkspaceCard from './workspace-card.vue';

defineProps<{
  items: WorkspacePipelineView[];
}>();

const emit = defineEmits<{
  itemClick: [id: string];
  viewAll: [];
}>();
</script>

<template>
  <WorkspaceCard
    :action-label="$t('page.workspace.viewAll')"
    :show-action="true"
    :title="$t('page.workspace.pipeline.title')"
    @action="emit('viewAll')"
  >
    <ul class="workspace-pipeline-list">
      <li
        v-for="item in items"
        :key="item.id"
        class="workspace-pipeline-item"
        role="button"
        tabindex="0"
        @click="emit('itemClick', item.id)"
        @keydown.enter="emit('itemClick', item.id)"
      >
        <span class="workspace-pipeline-icon" aria-hidden="true">
          <IconifyIcon icon="lucide:file-text" class="size-4" />
        </span>
        <div class="workspace-pipeline-body">
          <div class="workspace-pipeline-top">
            <span class="workspace-pipeline-name">{{ item.title }}</span>
            <span
              class="workspace-pipeline-status"
              :class="
                item.status === 'done'
                  ? 'workspace-pipeline-status--done'
                  : 'workspace-pipeline-status--progress'
              "
            >
              {{
                item.status === 'done'
                  ? $t('page.workspace.pipeline.done')
                  : $t('page.workspace.pipeline.inProgress')
              }}
            </span>
          </div>
          <div class="workspace-pipeline-bar">
            <Progress
              :percent="item.progress"
              class="workspace-pipeline-progress"
              :class="
                item.status === 'done'
                  ? 'workspace-pipeline-progress--done'
                  : 'workspace-pipeline-progress--active'
              "
              :show-info="false"
              size="small"
            />
            <span class="workspace-pipeline-pct">{{ item.progress }}%</span>
          </div>
        </div>
      </li>
    </ul>
  </WorkspaceCard>
</template>
