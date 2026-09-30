<script lang="ts" setup>
defineProps<{
  dateLabel: string;
  greeting: string;
  subtitle: string;
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
      <p class="workspace-banner-subtitle">{{ subtitle }}</p>
    </div>
  </header>
</template>
