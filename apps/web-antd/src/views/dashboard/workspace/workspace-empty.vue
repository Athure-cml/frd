<script lang="ts" setup>
import type { WorkspaceIllustrationKey } from './illustrations';

import { computed } from 'vue';

import { usePreferences } from '@vben/preferences';

import { resolveWorkspaceIllustration } from './illustrations';

const props = withDefaults(
  defineProps<{
    description: string;
    illustration?: WorkspaceIllustrationKey;
  }>(),
  {
    illustration: 'emptyTodos',
  },
);

const { isDark } = usePreferences();

const illustrationSrc = computed(() =>
  resolveWorkspaceIllustration(props.illustration, isDark.value),
);
</script>

<template>
  <div class="workspace-empty">
    <img
      :src="illustrationSrc"
      :alt="description"
      class="workspace-empty-illust"
      loading="lazy"
    />
    <p class="workspace-empty-text">{{ description }}</p>
  </div>
</template>
