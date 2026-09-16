<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Select } from 'ant-design-vue';

import { getFumigationStationList } from '#/api/quote';
import { $t } from '#/locales';

defineProps<{
  disabled?: boolean;
}>();

const station = defineModel<string>({ default: '' });
const stationOptions = ref<Array<{ label: string; value: string }>>([]);

onMounted(async () => {
  const stations = await getFumigationStationList();
  stationOptions.value = stations.map((item) => ({
    label: item,
    value: item,
  }));
});
</script>

<template>
  <Select
    v-model:value="station"
    allow-clear
    class="w-full"
    :disabled="disabled"
    :options="stationOptions"
    option-filter-prop="label"
    show-search
    :placeholder="$t('page.quote.sheet.selectFumigationStation')"
  />
</template>
