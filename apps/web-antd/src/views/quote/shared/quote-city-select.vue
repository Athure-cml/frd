<script lang="ts" setup>
import { ref } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { AutoComplete } from 'ant-design-vue';

import { searchDestCityNameOptions } from '#/api/master-data/us-state-zip';

defineProps<{
  disabled?: boolean;
}>();

const city = defineModel<string>({ default: '' });

const cityOptions = ref<Array<{ label: string; value: string }>>([]);

const searchCity = useDebounceFn(async (keyword: string) => {
  const q = keyword.trim();
  if (!q) {
    cityOptions.value = [];
    return;
  }
  cityOptions.value = await searchDestCityNameOptions({
    keyword: q,
    limit: 50,
  });
}, 280);

function onSearch(value: string) {
  city.value = value;
  searchCity(value);
}

function onFocus() {
  if (city.value) {
    searchCity(city.value);
  }
}

function onSelect(value: string) {
  city.value = value;
}
</script>

<template>
  <AutoComplete
    v-model:value="city"
    class="w-full"
    :disabled="disabled"
    :options="cityOptions"
    @focus="onFocus"
    @search="onSearch"
    @select="onSelect"
  />
</template>
