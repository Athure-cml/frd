<script lang="ts" setup>
import { CircleHelp } from '@vben/icons';

import { Tooltip } from 'ant-design-vue';

defineProps<{
  hint?: string;
  label: string;
}>();
</script>

<template>
  <span class="quote-rule-label">
    <span>{{ label }}</span>
    <Tooltip
      v-if="hint"
      :title="hint"
      overlay-class-name="quote-rule-hint-tooltip"
    >
      <CircleHelp
        class="quote-rule-label__icon text-foreground/80 hover:text-foreground inline-flex size-3.5 cursor-help"
      />
    </Tooltip>
  </span>
</template>
