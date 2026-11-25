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
      <div class="ws-card-extra">
        <slot name="extra"></slot>
        <button
          v-if="showAction && actionLabel"
          type="button"
          class="ws-card-action"
          @click="emit('action')"
        >
          {{ actionLabel }}
        </button>
      </div>
    </header>
    <div class="ws-card-body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.ws-card-extra {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}
</style>
