<script lang="ts" setup>
import type { WorkspaceIllustrationKey } from './illustrations';

import { WORKSPACE_ILLUSTRATIONS } from './illustrations';

withDefaults(
  defineProps<{
    description: string;
    illustration?: WorkspaceIllustrationKey;
  }>(),
  {
    illustration: 'emptyTodos',
  },
);
</script>

<template>
  <div class="workspace-empty">
    <img
      :src="WORKSPACE_ILLUSTRATIONS[illustration]"
      :alt="description"
      class="workspace-empty-illust"
      loading="lazy"
    />
    <p class="workspace-empty-text">{{ description }}</p>
  </div>
</template>
