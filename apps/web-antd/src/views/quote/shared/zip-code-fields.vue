<script lang="ts" setup>
import { ref, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { AutoComplete } from 'ant-design-vue';

import { lookupQuoteZip } from '#/api/quote';

interface ZipOption {
  label: string;
  row: QuoteZipLookupRow;
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

defineProps<{
  disabled?: boolean;
}>();
const zipCode = defineModel<string>('zipCode', { default: '' });
const city = defineModel<string>('city', { default: '' });
const state = defineModel<string>('state', { default: '' });

const options = ref<ZipOption[]>([]);
const rowByZip = ref<Map<string, QuoteZipLookupRow>>(new Map());

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
    options.value = [];
    rowByZip.value = new Map();
    return;
  }
  const rows = await lookupQuoteZip(q, 20);
  const map = new Map<string, QuoteZipLookupRow>();
  options.value = rows.map((row) => {
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
  zipCode.value = value;
  searchZip(value);
}

function onSelect(value: number | Record<string, any> | string) {
  const zip = String(value);
  const row =
    rowByZip.value.get(zip) ?? options.value.find((o) => o.value === zip)?.row;
  if (row) {
    applyRow(row);
  }
}

async function tryResolveExactZip() {
  const q = zipCode.value?.trim();
  if (!q || q.length < 3) {
    return;
  }
  const cached = rowByZip.value.get(q);
  if (cached) {
    applyRow(cached);
    return;
  }
  const rows = await lookupQuoteZip(q, 10);
  const exact =
    rows.find((row) => row.zipCode === q) ??
    (rows.length === 1 ? rows[0] : null);
  if (exact) {
    applyRow(exact);
  }
}

watch(
  () => zipCode.value,
  (value, oldValue) => {
    if (!value) {
      city.value = '';
      state.value = '';
      options.value = [];
      return;
    }
    if (value !== oldValue && !options.value.some((o) => o.value === value)) {
      searchZip(value);
    }
  },
);
</script>

<template>
  <AutoComplete
    v-model:value="zipCode"
    class="w-full"
    :disabled="disabled"
    :options="options"
    @blur="tryResolveExactZip"
    @search="onSearch"
    @select="onSelect"
  />
</template>
