<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, nextTick, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Tabs, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import CostSnapshotGrid from './cost-snapshot-grid.vue';
import { orderCostSourceTypes } from './cost-source-types';

const props = withDefaults(
  defineProps<{
    canImport?: boolean;
    /** 按服务类型过滤展示的报价库 Tab；不传则展示全部三类 */
    costTypes?: QuoteCostType[];
    matches: QuoteApi.QuoteCostMatchItem[];
  }>(),
  {
    canImport: false,
    costTypes: undefined,
  },
);

const emit = defineEmits<{
  import: [type: QuoteCostType];
}>();

const visibleCostTypes = computed(() => {
  if (props.costTypes === undefined || props.costTypes === null) {
    return orderCostSourceTypes(['SEA', 'ROAD', 'FUMIGATION']);
  }
  return orderCostSourceTypes(props.costTypes);
});

const tabsKey = computed(() => visibleCostTypes.value.join('-') || 'none');

/** 始终指向当前可见 Tab，避免切换服务类型后 activeKey 失效导致内容空白 */
const activeTab = ref<QuoteCostType>(visibleCostTypes.value[0] ?? 'SEA');

async function syncActiveTab(preferFirst = false) {
  const types = visibleCostTypes.value;
  const first = types[0];
  if (!first) {
    return;
  }
  const next =
    !preferFirst && types.includes(activeTab.value) ? activeTab.value : first;
  activeTab.value = next;
  // Tabs 重挂载后再写一次，确保面板被选中
  await nextTick();
  if (visibleCostTypes.value.includes(next)) {
    activeTab.value = next;
  }
}

function tabLabel(type: QuoteCostType) {
  return $t(
    `page.quote.costTabs.${type === 'ROAD' ? 'road' : type === 'SEA' ? 'sea' : 'fumigation'}`,
  );
}

function latestByType(type: QuoteCostType) {
  return props.matches.find((item) => item.costType === type);
}

function listByType(type: QuoteCostType) {
  return props.matches.filter((item) => item.costType === type);
}

const sections = computed(() =>
  visibleCostTypes.value.map((type) => {
    if (type === 'SEA' || type === 'ROAD') {
      const typedMatches = listByType(type);
      return {
        match: typedMatches[0],
        matches: typedMatches,
        type,
      };
    }
    const match = latestByType(type);
    return {
      match,
      matches: match ? [match] : [],
      type,
    };
  }),
);

watch(
  tabsKey,
  () => {
    void syncActiveTab(true);
  },
  { immediate: true, flush: 'sync' },
);

function onImport(type: QuoteCostType) {
  emit('import', type);
}
</script>

<template>
  <div v-if="sections.length > 0" class="quote-cost-source">
    <Tabs
      :key="tabsKey"
      v-model:active-key="activeTab"
      destroy-inactive-tab-pane
    >
      <Tabs.TabPane
        v-for="section in sections"
        :key="section.type"
        :tab="tabLabel(section.type)"
      >
        <div class="quote-cost-source__pane">
          <div
            v-if="canImport || section.matches.length === 0"
            class="quote-cost-source__actions"
          >
            <Tag v-if="section.matches.length === 0" color="default">
              {{ $t('page.quote.message.noCostSnapshot') }}
            </Tag>
            <Button
              v-if="canImport"
              class="quote-cost-source__import-btn"
              size="small"
              @click="onImport(section.type)"
            >
              <IconifyIcon class="mr-1 size-3.5" icon="lucide:database" />
              {{ $t('page.quote.actions.importCostData') }}
            </Button>
          </div>
          <CostSnapshotGrid
            :empty-description="
              $t('page.quote.message.noCostImported', [tabLabel(section.type)])
            "
            :match="section.match"
            :matches="section.matches"
            :type="section.type"
          />
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.quote-cost-source :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.quote-cost-source__pane {
  /* 横向滚动交给内部 VXE，避免外层滚动导致 fixed 列失效 */
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-top: 0;
  border-radius: 0 0 calc(var(--radius) + 2px) calc(var(--radius) + 2px);
}

.quote-cost-source__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-height: 40px;
  padding: 8px 14px;
  background: color-mix(in srgb, hsl(var(--muted)) 22%, hsl(var(--card)));
  border-bottom: 1px solid hsl(var(--border));
}
</style>
