<script lang="ts" setup>
import type { RoadPriceField } from '../shared/cost-mapping';

import type { RoadCostRecord } from '#/api/cost';

import { computed, ref } from 'vue';

import { Form, Modal, Radio } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  DEFAULT_ROAD_PRICE_FIELD,
  ROAD_PRICE_FIELD_OPTIONS,
} from '../shared/cost-mapping';

import '../shared/quote.css';

const props = defineProps<{
  records: RoadCostRecord[];
}>();

const emit = defineEmits<{
  confirm: [priceField: RoadPriceField];
}>();

const open = defineModel<boolean>('open', { default: false });

const priceField = ref<RoadPriceField>(DEFAULT_ROAD_PRICE_FIELD);

const summary = computed(() => {
  if (props.records.length === 0) {
    return '';
  }
  if (props.records.length === 1) {
    const row = props.records[0]!;
    return [row.supplier, row.city, row.pol].filter(Boolean).join(' / ');
  }
  return $t('page.quote.costPicker.roadBatchSummary', [props.records.length]);
});

function roadFieldLabel(key: string) {
  return $t(`page.costLibrary.roadFields.${key}`);
}

function handleOk() {
  emit('confirm', priceField.value);
  open.value = false;
}

function handleOpen() {
  priceField.value = DEFAULT_ROAD_PRICE_FIELD;
}
</script>

<template>
  <Modal
    v-model:open="open"
    class="quote-road-price-modal"
    :ok-text="$t('common.confirm')"
    :title="$t('page.quote.costPicker.roadPriceTitle')"
    @after-open-change="(visible) => visible && handleOpen()"
    @ok="handleOk"
  >
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.quote.costPicker.roadPriceHint') }}
    </p>
    <p v-if="summary" class="quote-road-price-summary">
      {{ summary }}
    </p>
    <Form layout="vertical">
      <Form.Item :label="$t('page.quote.costPicker.priceField')">
        <Radio.Group v-model:value="priceField">
          <div class="grid gap-2 sm:grid-cols-2">
            <Radio
              v-for="option in ROAD_PRICE_FIELD_OPTIONS"
              :key="option.field"
              :value="option.field"
            >
              {{ roadFieldLabel(option.labelKey) }}
            </Radio>
          </div>
        </Radio.Group>
      </Form.Item>
    </Form>
  </Modal>
</template>
