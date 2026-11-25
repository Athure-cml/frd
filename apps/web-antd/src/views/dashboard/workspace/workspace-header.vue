<script lang="ts" setup>
defineProps<{
  dateLabel: string;
  greeting: string;
}>();
</script>

<template>
  <header class="workspace-banner">
    <div class="workspace-banner-text">
      <p class="workspace-banner-date">{{ dateLabel }}</p>
      <h1 class="workspace-banner-title">
        {{ greeting }}
        <span aria-hidden="true">👋</span>
      </h1>
    </div>
  </header>
</template>

<style scoped>
.workspace-banner {
  min-height: 0;
}
</style>
