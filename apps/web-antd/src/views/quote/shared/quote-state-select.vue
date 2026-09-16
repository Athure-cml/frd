<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Select } from 'ant-design-vue';

import { getUsStateList } from '#/api/master-data/us-state';

defineProps<{
  disabled?: boolean;
}>();

const state = defineModel<string>({ default: '' });
const stateOptions = ref<Array<{ label: string; value: string }>>([]);

onMounted(async () => {
  const states = await getUsStateList();
  stateOptions.value = states.map((item) => ({
    label: `${item.code} · ${item.nameZh}`,
    value: item.code,
  }));
});
</script>

<template>
  <Select
    v-model:value="state"
    allow-clear
    class="w-full"
    :disabled="disabled"
    :options="stateOptions"
    option-filter-prop="label"
    show-search
  />
</template>
