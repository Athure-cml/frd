<script lang="ts" setup>
defineProps<{
  actionLabel?: string;
  showAction?: boolean;
  title: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <section class="ws-card">
    <header class="ws-card-head">
      <h2 class="ws-card-title">{{ title }}</h2>
      <button
        v-if="showAction && actionLabel"
        type="button"
        class="ws-card-action"
        @click="emit('action')"
      >
        {{ actionLabel }}
      </button>
    </header>
    <div class="ws-card-body">
      <slot></slot>
    </div>
  </section>
</template>
