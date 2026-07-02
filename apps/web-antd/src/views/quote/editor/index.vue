<script lang="ts" setup>
import type { LineDraft } from '../shared/cost-mapping';

import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';
import type { QuoteApi, QuoteStatus, QuoteTransportMode } from '#/api/quote';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, IconifyIcon, Plus, Save } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { fumigationCostApi, seaCostApi } from '#/api/cost';
import { getRoadCost } from '#/api/cost/road';
import { getBaseCurrencyCode, getEnabledCurrencyOptions } from '#/api/currency';
import { getCustomerList } from '#/api/customer';
import {
  createQuote,
  deleteQuote,
  getQuoteDetail,
  updateQuote,
} from '#/api/quote';
import { $t } from '#/locales';

import {
  formatQuoteAmount,
  getTransportModeOptions,
  statusTagOptions,
  transportModeLabel,
} from '../list/data';
import {
  applyFreightRefresh,
  applyFumigationRefresh,
  applyRoadRefresh,
  createManualLine,
  detailLineToDraft,
  isCostLine,
  isSnapshotStale,
  lineDraftToSave,
} from '../shared/cost-mapping';
import CostPickerDrawer from './cost-picker-drawer.vue';

import '../shared/quote.css';

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['quote:create']);
const canEdit = hasAccessByCodes(['quote:edit']);
const canDelete = hasAccessByCodes(['quote:delete']);

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const syncingKey = ref('');
const quoteId = ref<number>();
const quoteNo = ref('');
const status = ref<QuoteStatus>('DRAFT');
const customerId = ref<number>();
const customerName = ref('');
const customerOptions = ref<Array<{ label: string; value: number }>>([]);
const transportMode = ref<QuoteTransportMode>('ROAD');
const routeSummary = ref('');
const validUntil = ref<dayjs.Dayjs>();
const currency = ref('CNY');
const baseCurrency = ref('CNY');
const exchangeRate = ref<number>();
const currencyOptions = ref<Array<{ label: string; value: string }>>([]);
const remark = ref('');
const lines = ref<LineDraft[]>([]);
const costPickerRef = ref<InstanceType<typeof CostPickerDrawer>>();

const isCreate = computed(() => route.name === 'QuoteCreate');
const readOnly = computed(
  () => !isCreate.value && (status.value !== 'DRAFT' || !canEdit),
);
const canSave = computed(
  () =>
    (isCreate.value && canCreate) ||
    (!isCreate.value && canEdit && status.value === 'DRAFT'),
);
const canDeleteDraft = computed(
  () => !isCreate.value && status.value === 'DRAFT' && canDelete,
);
const pageTitle = computed(() => {
  if (isCreate.value) {
    return $t('page.quote.createTitle');
  }
  if (readOnly.value) {
    return $t('page.quote.viewTitle');
  }
  return $t('page.quote.editTitle');
});
const lineCount = computed(
  () => lines.value.filter((line) => line.itemName.trim()).length,
);
const transportModeOptions = computed(() => getTransportModeOptions());
const usedCostRefIds = computed(() =>
  lines.value
    .filter((line) => isCostLine(line) && line.costRefId != null)
    .map((line) => line.costRefId as number),
);
const hasCostLines = computed(() => lines.value.some(isCostLine));
const costViewPermission = computed(() => {
  const map = {
    RAIL: 'cost:fumigation:view',
    ROAD: 'cost:road:view',
    SEA: 'cost:sea:view',
  } as const;
  return map[transportMode.value];
});
const canPickCost = computed(() =>
  hasAccessByCodes([costViewPermission.value]),
);

const totalAmount = computed(() =>
  lines.value.reduce(
    (sum, line) => sum + formatQuoteAmount(line.quantity, line.unitPrice),
    0,
  ),
);

const baseAmountPreview = computed(() => {
  if (
    !exchangeRate.value ||
    currency.value === baseCurrency.value ||
    totalAmount.value <= 0
  ) {
    return null;
  }
  return totalAmount.value * exchangeRate.value;
});

const lineColumns = computed(() => {
  const base: Array<Record<string, unknown>> = [
    {
      key: 'source',
      title: $t('page.quote.fields.source'),
      width: 120,
    },
    {
      dataIndex: 'itemName',
      key: 'itemName',
      title: $t('page.quote.fields.itemName'),
      width: 180,
    },
    {
      dataIndex: 'spec',
      key: 'spec',
      title: $t('page.quote.fields.spec'),
      width: 140,
    },
    {
      align: 'right',
      className: 'col-num',
      dataIndex: 'quantity',
      key: 'quantity',
      title: $t('page.quote.fields.quantity'),
      width: 100,
    },
    {
      dataIndex: 'unit',
      key: 'unit',
      title: $t('page.quote.fields.unit'),
      width: 80,
    },
    {
      align: 'right',
      className: 'col-num',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      title: $t('page.quote.fields.unitPrice'),
      width: 120,
    },
    {
      align: 'right',
      className: 'col-num',
      key: 'amount',
      title: $t('page.quote.fields.amount'),
      width: 120,
    },
  ];
  if (!readOnly.value) {
    base.push({
      fixed: 'right',
      key: 'action',
      title: $t('page.system.fields.operation'),
      width: 148,
    });
  }
  return base;
});

function costSourceLabel(costMode: LineDraft['costMode']) {
  return $t(`page.quote.costSource.${costMode}`);
}

function costSourceColor(costMode: LineDraft['costMode']) {
  const map = {
    MANUAL: 'default',
    RAIL_REF: 'purple',
    ROAD_REF: 'blue',
    SEA_REF: 'cyan',
  } as const;
  return map[costMode];
}

function addLine() {
  lines.value.push(createManualLine(lines.value.length));
}

function removeLine(key: string) {
  const next = lines.value.filter((line) => line.key !== key);
  lines.value = next.length > 0 ? next : [createManualLine(0)];
}

function goBack() {
  router.push({ name: 'QuoteList' });
}

async function handleDelete() {
  if (!quoteId.value || !quoteNo.value) {
    return;
  }
  deleting.value = true;
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [quoteNo.value]),
    duration: 0,
    key: 'quote_delete_msg',
  });
  try {
    await deleteQuote(quoteId.value);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [quoteNo.value]),
      key: 'quote_delete_msg',
    });
    goBack();
  } catch {
    hideLoading();
  } finally {
    deleting.value = false;
  }
}

function openCostPicker() {
  costPickerRef.value?.open();
}

function onCostPickerConfirm(newLines: LineDraft[]) {
  const usedSet = new Set(usedCostRefIds.value);
  const deduped = newLines.filter(
    (line) => line.costRefId == null || !usedSet.has(line.costRefId),
  );
  if (deduped.length === 0) {
    return;
  }
  const existing = lines.value.filter(
    (line) => line.itemName.trim() || isCostLine(line),
  );
  const offset = existing.length;
  const appended = deduped.map((line, index) => ({
    ...line,
    sort: offset + index,
  }));
  lines.value = [...existing, ...appended];
  void refreshStaleFlags();
}

async function fetchCostRecord(line: LineDraft) {
  if (!line.costRefId) {
    throw new Error('missing cost ref');
  }
  if (line.costMode === 'ROAD_REF') {
    return getRoadCost(line.costRefId);
  }
  if (line.costMode === 'RAIL_REF') {
    return fumigationCostApi.get(line.costRefId);
  }
  return seaCostApi.get(line.costRefId);
}

async function refreshStaleFlags() {
  await Promise.all(
    lines.value.map(async (line) => {
      if (!isCostLine(line)) {
        line.stale = false;
        return;
      }
      try {
        const record = await fetchCostRecord(line);
        line.stale = isSnapshotStale(
          line.extraJson?.costSnapshot?.updatedAt as string | undefined,
          record.updatedAt,
        );
      } catch {
        line.stale = true;
      }
    }),
  );
}

async function syncLinePrice(line: LineDraft) {
  if (!isCostLine(line)) {
    return;
  }
  syncingKey.value = line.key;
  try {
    const record = await fetchCostRecord(line);
    if (line.costMode === 'ROAD_REF') {
      applyRoadRefresh(line, record as RoadCostRecord);
    } else if (line.costMode === 'RAIL_REF') {
      applyFumigationRefresh(line, record as FumigationCostRecord);
    } else {
      applyFreightRefresh(line, record as FreightCostRecord);
    }
    message.success($t('page.quote.actions.syncSuccess'));
  } catch {
    message.error($t('page.quote.actions.syncFailed'));
  } finally {
    syncingKey.value = '';
  }
}

function statusLabel(value: string) {
  return (
    statusTagOptions().find((item) => item.value === value)?.label ?? value
  );
}

function statusColor(value: string) {
  return statusTagOptions().find((item) => item.value === value)?.color;
}

function displayText(value: null | number | string | undefined, empty = '—') {
  if (value === undefined || value === null || value === '') {
    return empty;
  }
  return String(value);
}

function formatNum(value: null | number | undefined, fractionDigits = 4) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

async function loadCustomerOptions() {
  const result = await getCustomerList({ page: 1, pageSize: 200, status: 1 });
  customerOptions.value = result.items.map((item) => ({
    label: item.name,
    value: item.id,
  }));
}

async function loadCurrencyOptions() {
  const [options, base] = await Promise.all([
    getEnabledCurrencyOptions(),
    getBaseCurrencyCode(),
  ]);
  currencyOptions.value = options;
  baseCurrency.value = base;
}

function filterCustomerOption(
  input: string,
  option: { label: string; value: number },
) {
  return option.label.toLowerCase().includes(input.trim().toLowerCase());
}

function onCustomerChange(value: number | undefined) {
  if (!value) {
    customerName.value = '';
    return;
  }
  const option = customerOptions.value.find((item) => item.value === value);
  customerName.value = option?.label ?? '';
}

function syncCustomerSelectionFromName() {
  if (customerId.value || !customerName.value.trim()) {
    return;
  }
  const match = customerOptions.value.find(
    (item) => item.label === customerName.value.trim(),
  );
  if (match) {
    customerId.value = match.value;
  }
}

async function loadDetail(id: number) {
  loading.value = true;
  try {
    const detail = await getQuoteDetail(id);
    quoteId.value = detail.id;
    quoteNo.value = detail.quoteNo;
    status.value = detail.status;
    customerId.value = detail.customerId;
    customerName.value = detail.customerName;
    syncCustomerSelectionFromName();
    transportMode.value = detail.transportMode;
    routeSummary.value = detail.routeSummary ?? '';
    validUntil.value = detail.validUntil ? dayjs(detail.validUntil) : undefined;
    currency.value = detail.currency || 'CNY';
    baseCurrency.value = detail.baseCurrency || 'CNY';
    exchangeRate.value = detail.exchangeRate;
    remark.value = detail.remark ?? '';
    lines.value =
      detail.lines?.length > 0
        ? detail.lines.map((line, index) => detailLineToDraft(line, index))
        : [createManualLine(0)];
    await refreshStaleFlags();
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!customerId.value) {
    message.warning($t('page.quote.validation.customerRequired'));
    return;
  }

  const payload: QuoteApi.QuoteSave = {
    currency: currency.value,
    customerId: customerId.value,
    customerName: customerName.value.trim(),
    lines: lines.value
      .filter((line) => line.itemName.trim())
      .map((line, index) => lineDraftToSave(line, index)),
    remark: remark.value.trim() || undefined,
    routeSummary: routeSummary.value.trim() || undefined,
    transportMode: transportMode.value,
    validUntil: validUntil.value
      ? validUntil.value.format('YYYY-MM-DD')
      : undefined,
  };

  saving.value = true;
  try {
    if (isCreate.value) {
      const created = await createQuote(payload);
      message.success($t('ui.actionMessage.operationSuccess'));
      await router.replace({ name: 'QuoteEdit', params: { id: created.id } });
      await loadDetail(created.id);
      return;
    }
    if (quoteId.value) {
      await updateQuote(quoteId.value, payload);
      message.success($t('ui.actionMessage.operationSuccess'));
      await loadDetail(quoteId.value);
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadCustomerOptions(), loadCurrencyOptions()]);
  if (isCreate.value) {
    currency.value = baseCurrency.value;
    lines.value = [createManualLine(0)];
    return;
  }
  const id = Number(route.params.id);
  if (!Number.isFinite(id)) {
    goBack();
    return;
  }
  await loadDetail(id);
});
</script>

<template>
  <Page
    auto-content-height
    class="quote-editor-page"
    :description="
      readOnly ? $t('page.quote.hint.readonly') : $t('page.quote.hint.editor')
    "
    :title="pageTitle"
  >
    <Card class="quote-editor-card" :loading="loading">
      <div class="quote-editor-toolbar">
        <div class="quote-editor-meta">
          <Button @click="goBack">
            <ArrowLeft class="size-4" />
            {{ $t('common.back') }}
          </Button>
          <Tag v-if="quoteNo" class="quote-no-badge" color="processing">
            {{ quoteNo }}
          </Tag>
          <Tag v-if="!isCreate" :color="statusColor(status)">
            {{ statusLabel(status) }}
          </Tag>
        </div>
        <div v-if="canSave || canDeleteDraft" class="quote-editor-actions">
          <div v-if="canDeleteDraft" class="quote-editor-actions__group">
            <Popconfirm
              :cancel-text="$t('common.cancel')"
              :disabled="saving || deleting"
              :ok-button-props="{ danger: true }"
              :ok-text="$t('common.confirm')"
              overlay-class-name="quote-delete-popconfirm"
              placement="bottomRight"
              :title="
                $t('ui.actionTitle.delete', [$t('page.quote.fields.quoteNo')])
              "
              @confirm="handleDelete"
            >
              <template #description>
                <div class="quote-delete-confirm">
                  {{ $t('page.quote.confirm.deletePrefix') }}
                  <span class="quote-delete-confirm__no">{{ quoteNo }}</span>
                  {{ $t('page.quote.confirm.deleteSuffix') }}
                </div>
              </template>
              <Button
                class="quote-editor-delete-btn"
                danger
                :disabled="saving"
                :loading="deleting"
              >
                <template #icon>
                  <IconifyIcon class="size-4" icon="lucide:trash-2" />
                </template>
                {{ $t('common.delete') }}
              </Button>
            </Popconfirm>
          </div>
          <div
            v-if="canDeleteDraft && canSave"
            aria-hidden="true"
            class="quote-editor-actions__divider"
          ></div>
          <div v-if="canSave" class="quote-editor-actions__group">
            <Button
              :disabled="deleting"
              :loading="saving"
              type="primary"
              @click="handleSave"
            >
              <Save class="size-4" />
              {{ $t('page.quote.actions.save') }}
            </Button>
          </div>
        </div>
      </div>

      <div class="quote-editor-body">
        <div class="quote-editor-section">
          <div class="quote-editor-section__head">
            <span class="quote-editor-section__title">
              {{ $t('page.quote.sections.basic') }}
            </span>
          </div>
          <div class="quote-editor-section__body">
            <Form layout="vertical">
              <div class="grid gap-4 md:grid-cols-2">
                <Form.Item
                  :label="$t('page.quote.fields.customerName')"
                  required
                >
                  <Select
                    v-if="!readOnly"
                    v-model:value="customerId"
                    allow-clear
                    class="w-full"
                    :filter-option="filterCustomerOption"
                    :options="customerOptions"
                    :placeholder="$t('page.quote.placeholders.customer')"
                    show-search
                    @change="onCustomerChange"
                  />
                  <span
                    v-else
                    class="quote-field-value"
                    :class="{
                      'quote-field-value--empty': !customerName.trim(),
                    }"
                  >
                    {{ displayText(customerName.trim()) }}
                  </span>
                </Form.Item>
                <Form.Item
                  :label="$t('page.quote.fields.transportMode')"
                  required
                >
                  <Select
                    v-if="!readOnly"
                    v-model:value="transportMode"
                    class="w-full"
                    :disabled="hasCostLines"
                    :options="transportModeOptions"
                  />
                  <Tag
                    v-else
                    :color="
                      costSourceColor(
                        transportMode === 'ROAD'
                          ? 'ROAD_REF'
                          : transportMode === 'SEA'
                            ? 'SEA_REF'
                            : 'RAIL_REF',
                      )
                    "
                  >
                    {{ transportModeLabel(transportMode) }}
                  </Tag>
                </Form.Item>
                <Form.Item :label="$t('page.quote.fields.routeSummary')">
                  <Input
                    v-if="!readOnly"
                    v-model:value="routeSummary"
                    :maxlength="256"
                    :placeholder="$t('page.quote.placeholders.routeSummary')"
                  />
                  <span
                    v-else
                    class="quote-field-value"
                    :class="{
                      'quote-field-value--empty': !routeSummary.trim(),
                    }"
                  >
                    {{ displayText(routeSummary.trim()) }}
                  </span>
                </Form.Item>
                <Form.Item :label="$t('page.quote.fields.validUntil')">
                  <DatePicker
                    v-if="!readOnly"
                    v-model:value="validUntil"
                    class="w-full"
                  />
                  <span
                    v-else
                    class="quote-field-value"
                    :class="{ 'quote-field-value--empty': !validUntil }"
                  >
                    {{ validUntil ? validUntil.format('YYYY-MM-DD') : '—' }}
                  </span>
                </Form.Item>
                <Form.Item :label="$t('page.quote.fields.currency')">
                  <Select
                    v-if="!readOnly"
                    v-model:value="currency"
                    class="w-full"
                    :options="currencyOptions"
                  />
                  <span v-else class="quote-field-value">
                    {{ displayText(currency) }}
                  </span>
                </Form.Item>
                <Form.Item
                  v-if="
                    currency !== baseCurrency && (exchangeRate || !readOnly)
                  "
                  :label="$t('page.quote.fields.exchangeRate')"
                >
                  <span
                    v-if="readOnly && exchangeRate"
                    class="quote-field-value"
                  >
                    1 {{ currency }} = {{ exchangeRate }} {{ baseCurrency }}
                  </span>
                  <span
                    v-else-if="!readOnly"
                    class="text-sm text-muted-foreground"
                  >
                    {{ $t('page.masterData.hint.exchangeRate') }}
                  </span>
                  <span v-else class="text-muted-foreground">—</span>
                </Form.Item>
                <Form.Item
                  class="md:col-span-2"
                  :label="$t('page.quote.fields.remark')"
                >
                  <Input.TextArea
                    v-if="!readOnly"
                    v-model:value="remark"
                    :maxlength="512"
                    :rows="2"
                  />
                  <span
                    v-else
                    class="quote-field-value quote-field-value--remark"
                    :class="{ 'quote-field-value--empty': !remark.trim() }"
                  >
                    {{ displayText(remark.trim()) }}
                  </span>
                </Form.Item>
              </div>
            </Form>
          </div>
        </div>

        <div class="quote-editor-section">
          <div class="quote-editor-section__head">
            <span class="quote-editor-section__title">
              {{ $t('page.quote.sections.lines') }}
              <span v-if="lineCount > 0" class="quote-editor-section__count">
                {{ lineCount }}
              </span>
            </span>
            <div v-if="!readOnly" class="quote-editor-section__actions">
              <Button v-if="canPickCost" size="small" @click="openCostPicker">
                <IconifyIcon class="size-4" icon="lucide:database" />
                {{ $t('page.quote.actions.pickFromCost') }}
              </Button>
              <Button size="small" @click="addLine">
                <Plus class="size-4" />
                {{ $t('page.quote.actions.addLine') }}
              </Button>
            </div>
          </div>
          <div
            class="quote-editor-section__body quote-editor-section__body--flush"
          >
            <Table
              class="quote-line-table"
              :columns="lineColumns"
              :data-source="lines"
              :pagination="false"
              :scroll="{ x: 1080 }"
              row-key="key"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'source'">
                  <div class="flex flex-col items-start gap-1">
                    <Tag class="m-0" :color="costSourceColor(record.costMode)">
                      {{ costSourceLabel(record.costMode) }}
                    </Tag>
                    <Tag v-if="record.stale" class="m-0" color="warning">
                      {{ $t('page.quote.costSource.stale') }}
                    </Tag>
                  </div>
                </template>
                <template v-else-if="column.key === 'itemName'">
                  <Input
                    v-if="!readOnly"
                    v-model:value="record.itemName"
                    :maxlength="128"
                  />
                  <span
                    v-else
                    class="quote-field-value"
                    :class="{
                      'quote-field-value--empty': !record.itemName.trim(),
                    }"
                  >
                    {{ displayText(record.itemName.trim()) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'spec'">
                  <Input
                    v-if="!readOnly"
                    v-model:value="record.spec"
                    :maxlength="256"
                  />
                  <span
                    v-else
                    class="quote-field-value"
                    :class="{
                      'quote-field-value--empty': !record.spec?.trim(),
                    }"
                  >
                    {{ displayText(record.spec?.trim()) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'quantity'">
                  <InputNumber
                    v-if="!readOnly"
                    v-model:value="record.quantity"
                    :min="0"
                    :precision="4"
                  />
                  <span v-else class="quote-line-num">
                    {{ formatNum(record.quantity) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'unit'">
                  <Input
                    v-if="!readOnly"
                    v-model:value="record.unit"
                    :maxlength="16"
                  />
                  <span
                    v-else
                    class="quote-field-value"
                    :class="{
                      'quote-field-value--empty': !record.unit?.trim(),
                    }"
                  >
                    {{ displayText(record.unit?.trim()) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  <InputNumber
                    v-if="!readOnly"
                    v-model:value="record.unitPrice"
                    :min="0"
                    :precision="4"
                  />
                  <span v-else class="quote-line-num">
                    {{ formatNum(record.unitPrice) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'amount'">
                  <span class="quote-line-amount">
                    {{
                      formatMoney(
                        formatQuoteAmount(record.quantity, record.unitPrice),
                      )
                    }}
                  </span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <div class="quote-line-actions">
                    <Button
                      v-if="isCostLine(record)"
                      class="quote-line-action-btn"
                      :loading="syncingKey === record.key"
                      size="small"
                      type="link"
                      @click="syncLinePrice(record)"
                    >
                      {{ $t('page.quote.actions.syncPrice') }}
                    </Button>
                    <Button
                      class="quote-line-action-btn"
                      danger
                      size="small"
                      type="link"
                      @click="removeLine(record.key)"
                    >
                      {{ $t('common.delete') }}
                    </Button>
                  </div>
                </template>
              </template>
            </Table>
            <div class="quote-total-row">
              <span class="quote-total-row__label">
                {{ $t('page.quote.fields.totalAmount') }}
              </span>
              <span class="quote-total-row__value">
                {{ formatMoney(totalAmount) }}
              </span>
              <span class="quote-total-row__currency">
                {{ currency }}
              </span>
              <span
                v-if="baseAmountPreview != null"
                class="quote-total-row__base text-sm text-muted-foreground"
              >
                ≈ {{ formatMoney(baseAmountPreview) }} {{ baseCurrency }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <CostPickerDrawer
      :key="transportMode"
      ref="costPickerRef"
      :transport-mode="transportMode"
      :used-cost-ref-ids="usedCostRefIds"
      @confirm="onCostPickerConfirm"
    />
  </Page>
</template>
