<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Button, Dropdown, Menu } from 'ant-design-vue';

import { $t } from '#/locales';

import { useWorkspaceQuickNav } from './data';

defineProps<{
  dateLabel: string;
  greeting: string;
  subtitle: string;
}>();

const emit = defineEmits<{
  createQuote: [];
  nav: [url: string];
}>();

const quickNavItems = useWorkspaceQuickNav();

function onMenuClick({ key }: { key: string }) {
  emit('nav', key);
}
</script>

<template>
  <header class="workspace-banner">
    <div class="workspace-banner-content">
      <div class="workspace-banner-text">
        <p class="workspace-banner-date">{{ dateLabel }}</p>
        <h1 class="workspace-banner-title">
          {{ greeting }}
          <span aria-hidden="true">👋</span>
        </h1>
        <p class="workspace-banner-subtitle">{{ subtitle }}</p>
      </div>

      <div class="workspace-banner-actions">
        <Dropdown
          :trigger="['click']"
          overlay-class-name="workspace-quick-dropdown"
        >
          <Button class="workspace-create-btn" type="primary">
            <IconifyIcon icon="lucide:plus" class="size-4" />
            {{ $t('page.workspace.quickCreate') }}
            <IconifyIcon icon="lucide:chevron-down" class="size-4 opacity-80" />
          </Button>
          <template #overlay>
            <Menu class="workspace-quick-menu" @click="onMenuClick">
              <Menu.Item v-for="item in quickNavItems" :key="item.url">
                <span class="workspace-menu-item">
                  <IconifyIcon :icon="item.icon" class="size-4" />
                  {{ item.title }}
                </span>
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>
        <Button class="workspace-banner-secondary" @click="emit('createQuote')">
          {{ $t('page.workspace.createQuote') }}
        </Button>
      </div>
    </div>
  </header>
</template>
