<script lang="ts" setup>
import type { QuoteApi, QuoteCostType, QuoteStatus } from '#/api/quote';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, IconifyIcon, Save } from '@vben/icons';

import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  message,
  Select,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getEnabledCurrencyOptions } from '#/api/currency';
import { getCustomerList } from '#/api/customer';
import { createQuote, getQuoteDetail, updateQuote } from '#/api/quote';
import { $t } from '#/locales';

import { statusTagOptions } from '../list/data';
import CostLibraryPickerModal from '../shared/cost-library-picker-modal.vue';
import CostSourceTables from '../shared/cost-source-tables.vue';
import { QUOTE_ROUTE_KEY_FIELDS } from '../shared/sheet-columns';
import {
  applyCostToSheet,
  type CostLibraryRecord,
  recordToCostMatchItem,
} from '../shared/sheet-cost-import';
import ZipCodeFields from '../shared/zip-code-fields.vue';

import '../shared/quote.css';

/** 美国林场→中国固定多式联运，后端字段保留默认值，前端不展示 */
const DEFAULT_TRANSPORT_MODE = 'SEA' as const;

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['quote:create']);
const canEdit = hasAccessByCodes(['quote:edit']);

const loading = ref(false);
const saving = ref(false);
const costPickerRef = ref<InstanceType<typeof CostLibraryPickerModal>>();
const quoteId = ref<number>();
const quoteNo = ref('');
const status = ref<QuoteStatus>('DRAFT');
const customerId = ref<number>();
const customerName = ref('');
const customerOptions = ref<Array<{ label: string; value: number }>>([]);
const validUntil = ref<dayjs.Dayjs>();
const currency = ref('USD');
const currencyOptions = ref<Array<{ label: string; value: string }>>([]);
const remark = ref('');
const costMatches = ref<QuoteApi.QuoteCostMatchItem[]>([]);

const sheet = reactive<QuoteApi.QuoteSheetFields>({
  zipCode: '',
  city: '',
  state: '',
  por: '',
  pol: '',
  pod: '',
  ofUsd: '',
  ssl: '',
  truckingNonOakUsd: undefined,
  truckingOakUsd: undefined,
  fmNonOak: undefined,
  fmOak: undefined,
  docUsd: '',
  cargoMaxWeightTon: '',
  sheetRemark: '',
});

const isCreate = computed(() => route.name === 'QuoteCreate');
const readOnly = computed(() => {
  if (isCreate.value) return false;
  if (!canEdit) return true;
  return !['DRAFT', 'EFFECTIVE', 'FOLLOWING'].includes(status.value);
});
const canSave = computed(
  () =>
    (isCreate.value && canCreate) ||
    (!isCreate.value && canEdit && !readOnly.value),
);

const pageTitle = computed(() =>
  isCreate.value ? $t('page.quote.createTitle') : $t('page.quote.editTitle'),
);

const backLabel = computed(() =>
  quoteId.value
    ? $t('page.quote.actions.backToDetail')
    : $t('page.quote.actions.backToList'),
);

const statusColor = computed(
  () =>
    statusTagOptions().find((item) => item.value === status.value)?.color ??
    'default',
);

const matchKeys = computed(() => ({
  zipCode: sheet.zipCode,
  city: sheet.city,
  state: sheet.state,
  por: sheet.por,
  pol: sheet.pol,
  pod: sheet.pod,
  ssl: sheet.ssl,
}));

const routeKeyFields = QUOTE_ROUTE_KEY_FIELDS;

const importMenuItems = computed(() => [
  { key: 'ROAD', label: $t('page.quote.actions.importCostRoad') },
  { key: 'SEA', label: $t('page.quote.actions.importCostSea') },
  { key: 'FUMIGATION', label: $t('page.quote.actions.importCostFumigation') },
]);

function statusLabel(value: string) {
  return (
    statusTagOptions().find((item) => item.value === value)?.label ?? value
  );
}

function mergeCostMatch(item: QuoteApi.QuoteCostMatchItem) {
  costMatches.value = [
    ...costMatches.value.filter((m) => m.costType !== item.costType),
    item,
  ];
}

async function loadCustomers() {
  const result = await getCustomerList({ page: 1, pageSize: 200, status: 1 });
  customerOptions.value = result.items.map((item) => ({
    label: item.name,
    value: item.id,
  }));
}

async function loadCurrencies() {
  currencyOptions.value = await getEnabledCurrencyOptions();
}

async function loadDetail() {
  if (isCreate.value) {
    return;
  }
  const id = Number(route.params.id);
  if (!id) {
    return;
  }
  loading.value = true;
  try {
    const detail = await getQuoteDetail(id);
    quoteId.value = detail.id;
    quoteNo.value = detail.quoteNo;
    status.value = detail.status;
    customerId.value = detail.customerId;
    customerName.value = detail.customerName;
    validUntil.value = detail.validUntil ? dayjs(detail.validUntil) : undefined;
    currency.value = detail.currency;
    remark.value = detail.remark ?? '';
    Object.assign(sheet, detail.sheet ?? {});
    costMatches.value = dedupeLatestPerType(detail.costSnapshots ?? []);
  } finally {
    loading.value = false;
  }
}

function dedupeLatestPerType(items: QuoteApi.QuoteCostMatchItem[]) {
  const map = new Map<QuoteCostType, QuoteApi.QuoteCostMatchItem>();
  for (const item of items) {
    if (!map.has(item.costType)) {
      map.set(item.costType, item);
    }
  }
  return [...map.values()];
}

function onImportCostType({ key }: { key: string }) {
  costPickerRef.value?.open(key as QuoteCostType, matchKeys.value);
}

function onCostPicked(type: QuoteCostType, record: CostLibraryRecord) {
  const label =
    importMenuItems.value.find((item) => item.key === type)?.label ?? type;
  mergeCostMatch(recordToCostMatchItem(type, record, matchKeys.value));
  applyCostToSheet(sheet, type, record);
  message.success($t('page.quote.message.costImportedType', [label]));
}

function buildPayload(): QuoteApi.QuoteSave {
  const customer = customerOptions.value.find(
    (c) => c.value === customerId.value,
  );
  return {
    customerId: customerId.value,
    customerName: customer?.label ?? customerName.value,
    transportMode: DEFAULT_TRANSPORT_MODE,
    currency: currency.value,
    validUntil: validUntil.value?.format('YYYY-MM-DD'),
    remark: remark.value,
    costMatches: costMatches.value,
    lines: [],
    ...sheet,
  };
}

async function onSave() {
  if (!customerId.value) {
    message.error($t('page.quote.validation.customerRequired'));
    return;
  }
  saving.value = true;
  try {
    if (isCreate.value) {
      const created = await createQuote(buildPayload());
      message.success($t('ui.actionMessage.createSuccess', [created.quoteNo]));
      router.replace({ name: 'QuoteDetail', params: { id: created.id } });
      return;
    }
    const updated = await updateQuote(quoteId.value!, buildPayload());
    message.success($t('ui.actionMessage.updateSuccess', [updated.quoteNo]));
    await loadDetail();
  } finally {
    saving.value = false;
  }
}

function goBack() {
  if (quoteId.value) {
    router.push({ name: 'QuoteDetail', params: { id: quoteId.value } });
    return;
  }
  router.push({ name: 'QuoteList' });
}

onMounted(async () => {
  await Promise.all([loadCustomers(), loadCurrencies(), loadDetail()]);
});
</script>

<template>
  <Page
    auto-content-height
    class="quote-editor-page"
    content-class="quote-editor-page__content"
  >
    <div class="quote-editor-shell">
      <header class="quote-editor-nav quote-card">
        <div class="quote-editor-nav__top">
          <div class="quote-editor-nav__leading">
            <Button class="quote-editor-nav__back" @click="goBack">
              <ArrowLeft class="size-4" />
              {{ backLabel }}
            </Button>
            <div class="quote-editor-nav__heading">
              <h2 class="quote-editor-nav__title">{{ pageTitle }}</h2>
              <Tag
                v-if="quoteNo"
                class="quote-editor-nav__quote-no"
                color="processing"
              >
                {{ quoteNo }}
              </Tag>
              <Tag v-if="!isCreate" :color="statusColor">
                {{ statusLabel(status) }}
              </Tag>
            </div>
          </div>
          <div class="quote-editor-nav__actions">
            <Dropdown v-if="!readOnly" :trigger="['click']">
              <Button>
                <IconifyIcon class="mr-1 size-4" icon="lucide:database" />
                {{ $t('page.quote.actions.importCost') }}
              </Button>
              <template #overlay>
                <Menu :items="importMenuItems" @click="onImportCostType" />
              </template>
            </Dropdown>
            <Button
              v-if="canSave"
              :loading="saving"
              type="primary"
              @click="onSave"
            >
              <template #icon>
                <Save class="size-4" />
              </template>
              {{ $t('page.quote.actions.save') }}
            </Button>
          </div>
        </div>
      </header>

      <Card :loading="loading" class="quote-editor-card quote-card">
        <div class="quote-editor-body">
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.basic')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Form.Item
                    :label="$t('page.quote.fields.customerName')"
                    required
                  >
                    <Select
                      v-model:value="customerId"
                      :disabled="readOnly"
                      :options="customerOptions"
                      :placeholder="$t('page.quote.placeholders.customer')"
                      show-search
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.fields.currency')">
                    <Select
                      v-model:value="currency"
                      :disabled="readOnly"
                      :options="currencyOptions"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.fields.validUntil')">
                    <DatePicker
                      v-model:value="validUntil"
                      class="w-full"
                      :disabled="readOnly"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.routeKeys')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Form.Item label="Zip code">
                  <ZipCodeFields
                    v-model:city="sheet.city"
                    v-model:state="sheet.state"
                    v-model:zip-code="sheet.zipCode"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item label="City">
                  <Input v-model:value="sheet.city" :disabled="readOnly" />
                </Form.Item>
                <Form.Item label="State">
                  <Input v-model:value="sheet.state" :disabled="readOnly" />
                </Form.Item>
                <Form.Item
                  v-for="col in routeKeyFields"
                  :key="col.field"
                  :label="col.title"
                >
                  <Input
                    v-model:value="sheet[col.field]"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item label="SSL">
                  <Input v-model:value="sheet.ssl" :disabled="readOnly" />
                </Form.Item>
              </div>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.fees')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
                <Form.Item label="O/F (USD)">
                  <Input v-model:value="sheet.ofUsd" :disabled="readOnly" />
                </Form.Item>
                <Form.Item label="TRUCKING NON OAK (USD)">
                  <InputNumber
                    v-model:value="sheet.truckingNonOakUsd"
                    class="w-full"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item label="TRUCKING OAK (USD)">
                  <InputNumber
                    v-model:value="sheet.truckingOakUsd"
                    class="w-full"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item label="FM NON OAK">
                  <InputNumber
                    v-model:value="sheet.fmNonOak"
                    class="w-full"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item label="FM OAK">
                  <InputNumber
                    v-model:value="sheet.fmOak"
                    class="w-full"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item label="DOC (USD)">
                  <Input v-model:value="sheet.docUsd" :disabled="readOnly" />
                </Form.Item>
                <Form.Item label="CARGO Max weight (ton)">
                  <Input
                    v-model:value="sheet.cargoMaxWeightTon"
                    :disabled="readOnly"
                  />
                </Form.Item>
                <Form.Item class="md:col-span-3" label="REMARK">
                  <Input.TextArea
                    v-model:value="sheet.sheetRemark"
                    :disabled="readOnly"
                    :rows="3"
                  />
                </Form.Item>
              </div>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.dataSource')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <CostSourceTables :matches="costMatches" />
            </div>
          </section>
        </div>
      </Card>
      <CostLibraryPickerModal ref="costPickerRef" @confirm="onCostPicked" />
    </div>
  </Page>
</template>
