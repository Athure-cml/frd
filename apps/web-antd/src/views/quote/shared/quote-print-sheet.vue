<script lang="ts" setup>
import type { SslRemarkLookup } from './quote-sea-ssl-remark';

import type { QuoteApi } from '#/api/quote';

import { computed, onMounted, ref } from 'vue';

import { getShippingLineList } from '#/api/shipping-line';
import { $t } from '#/locales';

import {
  buildQuotePrintFeeRows,
  formatPrintQuoteDate,
} from './quote-print-rows';
import { buildShippingLineRemarkLookup } from './quote-sea-ssl-remark';

const props = withDefaults(
  defineProps<{
    costSnapshots?: QuoteApi.QuoteCostMatchItem[];
    customerName?: string;
    quoteDate?: string;
    sheet: QuoteApi.QuoteSheetFields;
  }>(),
  {
    costSnapshots: () => [],
    customerName: '',
    quoteDate: '',
  },
);

const seaMatches = computed(() =>
  props.costSnapshots.filter((item) => item.costType === 'SEA'),
);

const sslRemarkByName = ref<SslRemarkLookup>(new Map());

const feeRows = computed(() =>
  buildQuotePrintFeeRows(
    props.sheet,
    seaMatches.value,
    $t,
    sslRemarkByName.value,
  ),
);

const displayDate = computed(() => formatPrintQuoteDate(props.quoteDate));
const pickUpAddress = computed(() => props.sheet.pickUpAddress?.trim() || '—');
const clientName = computed(() => props.customerName?.trim() || '—');
const por = computed(() => props.sheet.por?.trim() || '—');
const pod = computed(() => props.sheet.pod?.trim() || '—');
const sheetRemark = computed(() => props.sheet.sheetRemark?.trim() || '');

onMounted(async () => {
  try {
    const result = await getShippingLineList({
      page: 1,
      pageSize: 500,
      status: 1,
    });
    sslRemarkByName.value = buildShippingLineRemarkLookup(result.items);
  } catch {
    sslRemarkByName.value = new Map();
  }
});
</script>

<template>
  <div class="quote-print-sheet">
    <header class="quote-print-sheet__header">
      <div class="quote-print-sheet__brand">
        <img
          alt="FRD GLOBAL (SH) CO., LTD."
          class="quote-print-sheet__logo"
          src="/static/frd-quote-logo.jpg"
        />
      </div>
      <h1 class="quote-print-sheet__title">
        {{ $t('page.quote.sheet.title') }}
      </h1>
    </header>

    <table class="quote-print-sheet__info">
      <colgroup>
        <col class="quote-print-sheet__info-col" />
        <col class="quote-print-sheet__info-col" />
        <col class="quote-print-sheet__info-col" />
        <col class="quote-print-sheet__info-col" />
        <col class="quote-print-sheet__info-col" />
        <col class="quote-print-sheet__info-col" />
      </colgroup>
      <tbody>
        <tr>
          <th>{{ $t('page.quote.print.client') }}</th>
          <td colspan="2">{{ clientName }}</td>
          <th>{{ $t('page.quote.print.date') }}</th>
          <td colspan="2">{{ displayDate }}</td>
        </tr>
        <tr>
          <th>{{ $t('page.quote.print.por') }}</th>
          <td colspan="2">{{ por }}</td>
          <th>{{ $t('page.quote.print.pod') }}</th>
          <td colspan="2">{{ pod }}</td>
        </tr>
        <tr>
          <th class="quote-print-sheet__info-label--wrap">
            <span class="quote-print-sheet__info-label-line">
              {{ $t('page.quote.print.pickUpAddressLine1') }}
            </span>
            <span class="quote-print-sheet__info-label-line">
              {{ $t('page.quote.print.pickUpAddressLine2') }}
            </span>
          </th>
          <td colspan="5">{{ pickUpAddress }}</td>
        </tr>
      </tbody>
    </table>

    <table class="quote-print-sheet__fees">
      <thead>
        <tr>
          <th class="col-item">{{ $t('page.quote.print.item') }}</th>
          <th class="col-rate">{{ $t('page.quote.print.rate') }}</th>
          <th class="col-unit">{{ $t('page.quote.print.unit') }}</th>
          <th class="col-ssl">{{ $t('page.quote.print.ssl') }}</th>
          <th class="col-remark">{{ $t('page.quote.print.remark') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in feeRows" :key="index">
          <tr v-if="row.type === 'group'" class="quote-print-sheet__group-row">
            <td colspan="5">{{ row.label }}</td>
          </tr>
          <tr v-else class="quote-print-sheet__fee-row">
            <td class="col-item">{{ row.item }}</td>
            <template v-if="row.mergeRateMeta">
              <td class="col-rate-merged" colspan="4">
                {{ row.rate || '—' }}
              </td>
            </template>
            <template v-else>
              <td class="col-rate">{{ row.rate || '—' }}</td>
              <template v-if="row.mergeUnitMeta">
                <td class="col-unit-merged" colspan="3">
                  {{ row.unit || '—' }}
                </td>
              </template>
              <template v-else>
                <td class="col-unit">{{ row.unit || '—' }}</td>
                <td class="col-ssl">{{ row.ssl || '—' }}</td>
                <td class="col-remark">{{ row.remark || '—' }}</td>
              </template>
            </template>
          </tr>
        </template>
      </tbody>
    </table>

    <div class="quote-print-sheet__footer">
      <div class="quote-print-sheet__footer-label">
        {{ $t('page.quote.print.remark') }}
      </div>
      <div class="quote-print-sheet__remark">{{ sheetRemark }}</div>
    </div>
  </div>
</template>

<style src="./quote-print-sheet.css"></style>
