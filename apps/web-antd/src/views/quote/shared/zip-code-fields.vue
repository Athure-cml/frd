<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Select } from 'ant-design-vue';

import { lookupQuoteZip } from '#/api/quote';

interface ZipOption {
  label: string;
  row?: QuoteZipLookupRow;
  value: string;
}

export interface QuoteZipLookupRow {
  city: string;
  cityId: number;
  id: number;
  stateCode: string;
  stateId: number;
  zipCode: string;
}

/**
 * ZIP 只能从系统主数据中选择（搜索可选，不接受自由输入）。
 * 选项来源：City+State 命中的候选（1:N 时全部列出）+ 关键字远程搜索结果。
 */
const props = defineProps<{
  disabled?: boolean;
  /** 当前 City+State 对应的候选邮编（多个时供用户直接选） */
  suggestions?: string[];
}>();

const zipCode = defineModel<string>('zipCode', { default: '' });
const city = defineModel<string>('city', { default: '' });
const state = defineModel<string>('state', { default: '' });

const searched = ref<ZipOption[]>([]);
const rowByZip = ref<Map<string, QuoteZipLookupRow>>(new Map());
const keyword = ref('');

const suggestionOptions = computed<ZipOption[]>(() => {
  const seen = new Set<string>();
  const list: ZipOption[] = [];
  for (const zip of props.suggestions ?? []) {
    const key = String(zip);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    list.push({ label: key, value: key });
  }
  return list;
});

const options = computed<ZipOption[]>(() => {
  // 输入关键字时以远程搜索结果为准，避免 1:N 城市的几百个候选把结果挤到后面
  if (keyword.value.trim()) {
    return searched.value;
  }
  const merged = [...suggestionOptions.value];
  const seen = new Set(merged.map((item) => item.value));
  for (const option of searched.value) {
    if (!seen.has(option.value)) {
      seen.add(option.value);
      merged.push(option);
    }
  }
  return merged;
});

function formatLabel(row: QuoteZipLookupRow) {
  return `${row.zipCode} · ${row.city}, ${row.stateCode}`;
}

function applyRow(row: QuoteZipLookupRow) {
  zipCode.value = row.zipCode;
  city.value = row.city;
  state.value = row.stateCode;
}

const searchZip = useDebounceFn(async (keyword: string) => {
  const q = keyword.trim();
  if (!q) {
    searched.value = [];
    rowByZip.value = new Map();
    return;
  }
  const rows = await lookupQuoteZip(q, 20);
  const map = new Map<string, QuoteZipLookupRow>();
  searched.value = rows.map((row) => {
    map.set(row.zipCode, row);
    return {
      label: formatLabel(row),
      row,
      value: row.zipCode,
    };
  });
  rowByZip.value = map;
}, 280);

function onSearch(value: string) {
  keyword.value = value;
  void searchZip(value);
}

function onFocus() {
  // 有候选（City+State 命中）时直接展示；否则按当前值补一次搜索
  if ((props.suggestions ?? []).length > 0) {
    return;
  }
  if ((zipCode.value ?? '').trim()) {
    void searchZip(zipCode.value);
  }
}

function onBlur() {
  keyword.value = '';
  searched.value = [];
}

function onSelect(value: number | Record<string, any> | string) {
  const zip = String(value);
  keyword.value = '';
  const row =
    rowByZip.value.get(zip) ?? options.value.find((o) => o.value === zip)?.row;
  if (row) {
    applyRow(row);
  }
}

watch(
  () => zipCode.value,
  (value) => {
    if (!value) {
      // ZIP 被清空时只重置搜索状态。
      // 不联动清空 City/State：换 City 会程序性清空 ZIP，联动清空会把刚选的 City 一起清掉。
      searched.value = [];
      keyword.value = '';
    }
  },
);
</script>

<template>
  <Select
    v-model:value="zipCode"
    allow-clear
    class="w-full"
    :disabled="disabled"
    :filter-option="false"
    :options="options"
    show-search
    @blur="onBlur"
    @focus="onFocus"
    @search="onSearch"
    @select="onSelect"
  />
</template>
