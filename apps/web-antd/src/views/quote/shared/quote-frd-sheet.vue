<script lang="ts" setup>
/* eslint-disable vue/no-mutating-props -- sheet 为父级 reactive 共享对象 */
import type { FmSelection } from './quote-sheet-format';

import type { GlobalPortNameOption } from '#/api/master-data/global-port';
import type { QuoteApi } from '#/api/quote';

import { computed, onMounted, ref, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Checkbox, Input, InputNumber, Select } from 'ant-design-vue';

import { getCustomerList } from '#/api/customer';
import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import { $t } from '#/locales';

import {
  applyFmSelection,
  formatPorPolDisplay,
  todayQuoteDate,
} from './quote-sheet-format';

const props = defineProps<{
  customerId?: number;
  readOnly?: boolean;
  sheet: QuoteApi.QuoteSheetFields;
}>();

const emit = defineEmits<{
  'update:customerId': [value?: number];
}>();

const quoteDate = todayQuoteDate();
const customerOptions = ref<Array<{ label: string; value: number }>>([]);
const portOptions = ref<GlobalPortNameOption[]>([]);
const porPol = ref('');
const fmSelection = ref<FmSelection>('none');

const loadPortOptions = useDebounceFn(async (keyword?: string) => {
  portOptions.value = await searchGlobalPortNameOptions({
    keyword,
    limit: 50,
    portTypes: ['SEAPORT', 'RAIL', 'INLAND'],
  });
}, 280);

async function loadCustomers() {
  const result = await getCustomerList({ page: 1, pageSize: 200, status: 1 });
  customerOptions.value = result.items.map((item) => ({
    label: item.name,
    value: item.id,
  }));
}

onMounted(async () => {
  await Promise.all([loadCustomers(), loadPortOptions()]);
});

watch(
  () => [props.sheet.por, props.sheet.pol] as const,
  () => {
    porPol.value = formatPorPolDisplay(props.sheet);
  },
  { immediate: true },
);

watch(
  () => [props.sheet.fmNonOak, props.sheet.fmOak] as const,
  () => {
    if (props.sheet.fmOak && Number(props.sheet.fmOak) > 0) {
      fmSelection.value = 'oak';
      return;
    }
    if (props.sheet.fmNonOak && Number(props.sheet.fmNonOak) > 0) {
      fmSelection.value = 'nonOak';
      return;
    }
    fmSelection.value = 'none';
  },
  { immediate: true },
);

function onPorPolChange(value?: string) {
  porPol.value = value ?? '';
  props.sheet.por = value ?? '';
  props.sheet.pol = value ?? '';
}

function onPodChange(value?: string) {
  props.sheet.pod = value ?? '';
}

function onFmChange(type: FmSelection, checked: boolean) {
  if (props.readOnly) {
    return;
  }
  fmSelection.value = checked ? type : 'none';
  applyFmSelection(props.sheet, fmSelection.value);
}

const feeRows = computed(() => [
  { group: true, item: $t('page.quote.sheet.serviceFees') },
  {
    field: 'oceanFreight' as const,
    item: $t('page.quote.sheet.oceanFreight'),
    rateType: 'text' as const,
    unit: $t('page.quote.sheet.unitPerContainer'),
  },
  {
    field: 'truckingFee' as const,
    item: $t('page.quote.sheet.truckingFee'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitPerContainer'),
  },
  { group: true, item: $t('page.quote.sheet.truckExtras') },
  {
    field: 'nsLift' as const,
    item: $t('page.quote.sheet.nsLift'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitNsLift'),
  },
  {
    field: 'chassis' as const,
    item: $t('page.quote.sheet.chassis'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitChassis'),
  },
  {
    field: 'waiting' as const,
    item: $t('page.quote.sheet.waiting'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitWaiting'),
  },
  {
    field: 'redeliveryFee' as const,
    item: $t('page.quote.sheet.redelivery'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitPerContainer'),
  },
  {
    field: 'truckRemark' as const,
    item: $t('page.quote.sheet.truckRemark'),
    rateType: 'remark' as const,
    unit: '',
  },
  { group: true, item: $t('page.quote.sheet.fumigation') },
  {
    fm: 'nonOak' as const,
    field: 'fmNonOak' as const,
    item: $t('page.quote.sheet.fmNonOak'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitPerContainer'),
  },
  {
    fm: 'oak' as const,
    field: 'fmOak' as const,
    item: $t('page.quote.sheet.fmOak'),
    rateType: 'money' as const,
    unit: $t('page.quote.sheet.unitPerContainer'),
  },
  { group: true, item: $t('page.quote.sheet.docInsuranceAgent') },
  {
    field: 'docUsd' as const,
    item: $t('page.quote.sheet.docFee'),
    rateType: 'text' as const,
    unit: $t('page.quote.sheet.unitPerBill'),
  },
  {
    field: 'cargoInsurancePremium' as const,
    item: $t('page.quote.sheet.cargoInsurance'),
    rateType: 'text' as const,
    unit: $t('page.quote.sheet.unitPerCif'),
  },
  {
    field: 'cargoAgentFee' as const,
    item: $t('page.quote.sheet.cargoAgent'),
    rateType: 'text' as const,
    unit: $t('page.quote.sheet.unitBankFee'),
  },
]);

defineExpose({ fmSelection, quoteDate });
</script>

<template>
  <div class="frd-quote-sheet">
    <header class="frd-quote-sheet__header">
      <div class="frd-quote-sheet__brand">
        <div class="frd-quote-sheet__logo">FRD</div>
        <div class="frd-quote-sheet__company">FRD GLOBAL (SH) CO., LTD.</div>
      </div>
      <h1 class="frd-quote-sheet__title">{{ $t('page.quote.sheet.title') }}</h1>
    </header>

    <table class="frd-quote-sheet__info">
      <tbody>
        <tr>
          <th>{{ $t('page.quote.sheet.date') }}</th>
          <td class="frd-quote-sheet__readonly">{{ quoteDate }}</td>
          <th>{{ $t('page.quote.sheet.client') }}</th>
          <td>
            <Select
              :disabled="readOnly"
              :options="customerOptions"
              :value="customerId"
              allow-clear
              class="frd-quote-sheet__input"
              :placeholder="$t('page.quote.placeholders.customer')"
              show-search
              @update:value="
                emit('update:customerId', $event as number | undefined)
              "
            />
          </td>
        </tr>
        <tr>
          <th>{{ $t('page.quote.sheet.pickUpAddress') }}</th>
          <td colspan="3">
            <Input
              v-model:value="sheet.pickUpAddress"
              :disabled="readOnly"
              class="frd-quote-sheet__input"
            />
          </td>
        </tr>
        <tr>
          <th>{{ $t('page.quote.sheet.porPol') }}</th>
          <td>
            <Select
              :disabled="readOnly"
              :filter-option="false"
              :options="
                portOptions.map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                }))
              "
              :show-search="true"
              :value="porPol || undefined"
              allow-clear
              class="frd-quote-sheet__input"
              option-label-prop="value"
              :placeholder="$t('page.quote.sheet.selectPort')"
              @search="loadPortOptions"
              @update:value="onPorPolChange($event as string | undefined)"
            />
          </td>
          <th>{{ $t('page.quote.sheet.pod') }}</th>
          <td>
            <Select
              :disabled="readOnly"
              :filter-option="false"
              :options="
                portOptions.map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                }))
              "
              :show-search="true"
              :value="sheet.pod || undefined"
              allow-clear
              class="frd-quote-sheet__input"
              option-label-prop="value"
              :placeholder="$t('page.quote.sheet.selectPort')"
              @search="loadPortOptions"
              @update:value="onPodChange($event as string | undefined)"
            />
          </td>
        </tr>
        <tr>
          <th>{{ $t('page.quote.sheet.cifAmount') }}</th>
          <td colspan="3">
            <InputNumber
              v-model:value="sheet.cifAmount"
              :disabled="readOnly"
              :min="0"
              :precision="2"
              class="frd-quote-sheet__input frd-quote-sheet__input--number"
              :placeholder="$t('page.quote.sheet.cifPlaceholder')"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <table class="frd-quote-sheet__fees">
      <thead>
        <tr>
          <th class="col-item">ITEM</th>
          <th class="col-rate">RATE</th>
          <th class="col-unit">UNIT</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in feeRows" :key="index">
          <tr v-if="row.group" class="frd-quote-sheet__group-row">
            <td colspan="3">{{ row.item }}</td>
          </tr>
          <tr v-else class="frd-quote-sheet__fee-row">
            <td class="col-item">
              <div class="frd-quote-sheet__item-cell">
                <Checkbox
                  v-if="row.fm"
                  :checked="fmSelection === row.fm"
                  :disabled="readOnly"
                  @update:checked="onFmChange(row.fm, $event as boolean)"
                />
                <span>{{ row.item }}</span>
              </div>
            </td>
            <td class="col-rate">
              <Input
                v-if="row.rateType === 'text'"
                v-model:value="sheet[row.field!]"
                :disabled="readOnly"
                class="frd-quote-sheet__rate-input"
              />
              <InputNumber
                v-else-if="row.rateType === 'money'"
                v-model:value="sheet[row.field!]"
                :disabled="readOnly || (row.fm && fmSelection !== row.fm)"
                :min="0"
                :precision="2"
                class="frd-quote-sheet__rate-input frd-quote-sheet__rate-input--number"
              />
              <Input.TextArea
                v-else
                v-model:value="sheet.truckRemark"
                :disabled="readOnly"
                :rows="1"
                class="frd-quote-sheet__rate-input"
              />
            </td>
            <td class="col-unit">{{ row.unit }}</td>
          </tr>
        </template>
      </tbody>
    </table>

    <div class="frd-quote-sheet__footer">
      <label>{{ $t('page.quote.sheet.remark') }}</label>
      <Input.TextArea
        v-model:value="sheet.sheetRemark"
        :disabled="readOnly"
        :rows="3"
        class="frd-quote-sheet__remark"
      />
    </div>
  </div>
</template>

<style scoped src="./quote-frd-sheet.css"></style>
