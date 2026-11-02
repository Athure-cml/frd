<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Select } from 'ant-design-vue';

import { searchDestCityStateOptions } from '#/api/master-data/us-state-zip';
import { $t } from '#/locales';

/**
 * CITY 只能从系统主数据中选择（搜索可选，不接受自由输入）。
 * 选项仅来自所选 STATE。
 */
const props = defineProps<{
  disabled?: boolean;
  /** 所属州代码；为空时不可选城市（城市必须先由州限定） */
  state?: string;
}>();

const emit = defineEmits<{ select: [string] }>();

const city = defineModel<string>({ default: '' });

const cityOptions = ref<Array<{ label: string; value: string }>>([]);

const stateCode = computed(() => (props.state ?? '').trim());

const isDisabled = computed(() => Boolean(props.disabled) || !stateCode.value);

const placeholder = computed(() => {
  if (props.disabled) {
    return '—';
  }
  if (!stateCode.value) {
    return $t('page.quote.sheet.selectStateFirst');
  }
  return undefined;
});

const searchCity = useDebounceFn(async (keyword: string) => {
  const code = stateCode.value;
  if (!code) {
    cityOptions.value = [];
    return;
  }
  const rows = await searchDestCityStateOptions({
    keyword: keyword.trim() || undefined,
    limit: 50,
    stateCode: code,
  });
  cityOptions.value = rows.map((row) => ({ label: row.city, value: row.city }));
}, 280);

function onSearch(value: string) {
  void searchCity(value);
}

function onFocus() {
  if (stateCode.value) {
    void searchCity('');
  }
}

function onSelect(value: any) {
  const next = typeof value === 'string' ? value : String(value?.value ?? '');
  city.value = next;
  emit('select', next);
}

// 换州后旧州的城市选项立即失效
watch(stateCode, (next) => {
  cityOptions.value = [];
  if (next) {
    void searchCity('');
  }
});
</script>

<template>
  <Select
    v-model:value="city"
    allow-clear
    class="w-full"
    :disabled="isDisabled"
    :filter-option="false"
    :options="cityOptions"
    :placeholder="placeholder"
    show-search
    @focus="onFocus"
    @search="onSearch"
    @select="onSelect"
  />
</template>
