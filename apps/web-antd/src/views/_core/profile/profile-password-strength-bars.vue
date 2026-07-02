<script setup lang="ts">
import { computed } from 'vue';

import { getPasswordStrengthColor } from './profile-utils';

const props = withDefaults(
  defineProps<{
    score?: number;
  }>(),
  {
    score: 0,
  },
);

const normalizedScore = computed(() =>
  Math.max(0, Math.min(5, props.score ?? 0)),
);
const barColor = computed(() =>
  getPasswordStrengthColor(normalizedScore.value),
);
</script>

<template>
  <div class="profile-password-strength-bars">
    <div
      v-for="index in 5"
      :key="index"
      class="profile-password-strength-bars__segment"
    >
      <span
        class="profile-password-strength-bars__fill"
        :style="{
          backgroundColor: barColor,
          width: normalizedScore >= index ? '100%' : '0',
        }"
      ></span>
    </div>
  </div>
</template>
