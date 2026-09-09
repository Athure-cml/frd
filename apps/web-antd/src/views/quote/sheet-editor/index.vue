<script lang="ts" setup>
import type { SheetRuleField } from '../shared/quote-rule-hints';
import type { CostLibraryRecord } from '../shared/sheet-cost-import';

import type { GlobalPortNameOption } from '#/api/master-data/global-port';
import type { QuoteApi, QuoteCostType, QuoteStatus } from '#/api/quote';

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, Copy, IconifyIcon, Save } from '@vben/icons';

import { useDebounceFn } from '@vueuse/core';
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  message,
  Modal,
  Select,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { fumigationCostApi, getRoadCost, seaCostApi } from '#/api/cost';
import { getEnabledCurrencyOptions } from '#/api/currency';
import { getCustomerList } from '#/api/customer';
import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import {
  cancelQuoteApproval,
  createQuote,
  deleteQuote,
  generateQuoteSheet,
  getQuoteDetail,
  rejectQuote,
  sendQuote,
  submitQuote,
  updateQuote,
  voidQuote,
  wonQuote,
} from '#/api/quote';
import { getQuoteRuleList } from '#/api/quote-rule';
import { $t } from '#/locales';

import { statusTagOptions } from '../list/data';
import CostLibraryPickerModal from '../shared/cost-library-picker-modal.vue';
import CostSourceTables from '../shared/cost-source-tables.vue';
import {
  stashQuoteCopySource,
  takeQuoteCopySourceId,
} from '../shared/quote-copy';
import {
  buildQuoteRuleHintMap,
  hintForSheetField,
} from '../shared/quote-rule-hints';
import QuoteRuleLabel from '../shared/quote-rule-label.vue';
import QuoteSheetEditorSkeleton from '../shared/quote-sheet-editor-skeleton.vue';
import {
  normalizeUsdFieldValue,
  todayQuoteDate,
} from '../shared/quote-sheet-format';
import {
  canDraftCostActions,
  canShowQuoteVoid,
  isQuoteDeletable,
  isQuoteEditable,
  normalizeQuoteStatus,
} from '../shared/quote-status';
import {
  applyCostToSheet,
  isActiveCostRecord,
  recordToCostMatchItem,
} from '../shared/sheet-cost-import';

import '../shared/quote.css';

/** 美国林场→中国固定多式联运，后端字段保留默认值，前端不展示 */
const DEFAULT_TRANSPORT_MODE = 'SEA' as const;

type AiApplyPayload = {
  id: number;
  type: 'fumigation' | 'road' | 'sea';
};

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['quote:create']);
const canEdit = hasAccessByCodes(['quote:edit']);
const canSubmit = hasAccessByCodes(['quote:submit']);
const canApprove = hasAccessByCodes(['quote:approve']);
const canDelete = hasAccessByCodes(['quote:delete']);

const loading = ref(false);
const actionsReady = ref(false);
const saving = ref(false);
const generating = ref(false);
const costPickerRef = ref<InstanceType<typeof CostLibraryPickerModal>>();
const quoteId = ref<number>();
const quoteNo = ref('');
const operable = ref(false);
const status = ref<QuoteStatus>('DRAFT');
const customerId = ref<number>();
const customerName = ref('');
const customerOptions = ref<Array<{ label: string; value: number }>>([]);
const validUntil = ref<dayjs.Dayjs>();
const currency = ref('USD');
const currencyOptions = ref<Array<{ label: string; value: string }>>([]);
const remark = ref('');
const costMatches = ref<QuoteApi.QuoteCostMatchItem[]>([]);
const portOptions = ref<GlobalPortNameOption[]>([]);
const fumigationEnabled = ref(false);
const quoteDate = todayQuoteDate();
const ruleHintMap = ref<Record<string, string>>({});

const sheet = reactive<QuoteApi.QuoteSheetFields>({
  zipCode: '',
  city: '',
  state: '',
  pickUpAddress: '',
  por: '',
  pol: '',
  pod: '',
  oceanFreight: '',
  ssl: '',
  truckingFee: undefined,
  nsLift: undefined,
  chassis: undefined,
  waiting: undefined,
  redeliveryFee: undefined,
  truckRemark: '',
  fmNonOak: undefined,
  fmOak: undefined,
  docUsd: '',
  cargoInsurancePremium: '',
  cargoAgentFee: '',
  sheetRemark: '',
  cifAmount: undefined,
});

const isCreate = computed(() => route.name === 'QuoteCreate');
const showToolbarActions = computed(() => actionsReady.value);
const canOperate = computed(
  () => showToolbarActions.value && (isCreate.value || operable.value),
);
const readOnly = computed(() => {
  if (isCreate.value) return false;
  if (!canEdit || !canOperate.value) return true;
  return !isQuoteEditable(status.value);
});
const canSave = computed(
  () =>
    canOperate.value &&
    ((isCreate.value && canCreate) ||
      (!isCreate.value && canEdit && !readOnly.value)),
);
const showWorkflowActions = computed(() => !isCreate.value && !!quoteId.value);
const workflowStatus = computed(() => normalizeQuoteStatus(status.value));
const isPendingApproval = computed(
  () => workflowStatus.value === 'PENDING_APPROVAL',
);
const canVoidAction = computed(
  () => canOperate.value && canApprove && canShowQuoteVoid(status.value),
);
const canDeleteAction = computed(
  () => canOperate.value && canDelete && isQuoteDeletable(status.value),
);
const canUseCostLibrary = computed(
  () => canOperate.value && canDraftCostActions(isCreate.value, status.value),
);
const canSubmitAction = computed(
  () => canOperate.value && canSubmit && workflowStatus.value === 'DRAFT',
);
const canCancelApprovalAction = computed(
  () => canOperate.value && canSubmit && isPendingApproval.value,
);

const pageTitle = computed(() => {
  if (isCreate.value) {
    return $t('page.quote.createTitle');
  }
  return readOnly.value
    ? $t('page.quote.viewTitle')
    : $t('page.quote.editTitle');
});

const backLabel = computed(() => $t('page.quote.actions.backToList'));

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

const portSelectOptions = computed(() =>
  portOptions.value.map((opt) => ({ label: opt.label, value: opt.value })),
);

const importMenuItems = computed(() => [
  { key: 'ROAD', label: $t('page.quote.actions.importCostRoad') },
  { key: 'SEA', label: $t('page.quote.actions.importCostSea') },
  { key: 'FUMIGATION', label: $t('page.quote.actions.importCostFumigation') },
]);

const fumigationEnabledOptions = computed(() => [
  { label: $t('page.quote.sheet.fumigationYes'), value: true },
  { label: $t('page.quote.sheet.fumigationNo'), value: false },
]);

const loadPortOptions = useDebounceFn(async (keyword?: string) => {
  portOptions.value = await searchGlobalPortNameOptions({
    keyword,
    limit: 50,
    portTypes: ['SEAPORT', 'RAIL', 'INLAND'],
  });
}, 280);

function ruleHint(field: SheetRuleField) {
  return hintForSheetField(ruleHintMap.value, field);
}

async function loadQuoteRuleHints() {
  try {
    const rules = await getQuoteRuleList({ status: 1 });
    ruleHintMap.value = buildQuoteRuleHintMap(rules);
  } catch {
    ruleHintMap.value = {};
  }
}

function onPorPolChange(value?: string) {
  sheet.por = value ?? '';
  sheet.pol = value ?? '';
}

function onFumigationEnabledChange(value: boolean) {
  fumigationEnabled.value = value;
  sheet.fumigationEnabled = value;
  if (!value) {
    sheet.fmNonOak = 0;
    sheet.fmOak = 0;
  }
}

function syncFumigationEnabledFromSheet() {
  if (sheet.fumigationEnabled === true || sheet.fumigationEnabled === false) {
    fumigationEnabled.value = sheet.fumigationEnabled;
    return;
  }
  fumigationEnabled.value =
    Number(sheet.fmNonOak ?? 0) > 0 || Number(sheet.fmOak ?? 0) > 0;
}

function normalizeSheetUsdFields() {
  const fields = [
    'oceanFreight',
    'ofUsd',
    'docUsd',
    'cargoInsurancePremium',
    'cargoAgentFee',
  ] as const;
  for (const field of fields) {
    const value = sheet[field];
    if (typeof value === 'string' && value.trim()) {
      sheet[field] = normalizeUsdFieldValue(value);
    }
  }
}

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

async function applyDetailToForm(
  detail: QuoteApi.QuoteDetail,
  options?: { includeIdentity?: boolean },
) {
  const includeIdentity = options?.includeIdentity ?? true;
  if (includeIdentity) {
    quoteId.value = detail.id;
    quoteNo.value = detail.quoteNo;
    status.value = detail.status;
    operable.value = detail.operable;
  } else {
    quoteId.value = undefined;
    quoteNo.value = '';
    status.value = 'DRAFT';
  }
  customerId.value = detail.customerId;
  customerName.value = detail.customerName;
  validUntil.value = detail.validUntil ? dayjs(detail.validUntil) : undefined;
  currency.value = detail.currency;
  remark.value = detail.remark ?? '';
  Object.assign(sheet, detail.sheet ?? {});
  if (!sheet.oceanFreight && sheet.ofUsd) {
    sheet.oceanFreight = sheet.ofUsd;
  }
  if (
    sheet.truckingFee === undefined &&
    sheet.truckingNonOakUsd !== undefined
  ) {
    sheet.truckingFee = sheet.truckingNonOakUsd;
  }
  if (!sheet.pickUpAddress && (sheet.zipCode || sheet.city || sheet.state)) {
    sheet.pickUpAddress = [sheet.zipCode, sheet.city, sheet.state]
      .filter(Boolean)
      .join(', ');
  }
  normalizeSheetUsdFields();
  syncFumigationEnabledFromSheet();
  costMatches.value = dedupeLatestPerType(detail.costSnapshots ?? []);
}

async function loadDetail() {
  if (isCreate.value) {
    return;
  }
  const id = Number(route.params.id);
  if (!id) {
    return;
  }
  actionsReady.value = false;
  loading.value = true;
  try {
    const detail = await getQuoteDetail(id);
    await applyDetailToForm(detail);
  } finally {
    loading.value = false;
    actionsReady.value = true;
  }
}

async function consumeCopyFromStorage() {
  if (!isCreate.value) {
    return;
  }
  const sourceId = takeQuoteCopySourceId();
  if (!sourceId) {
    return;
  }
  loading.value = true;
  try {
    const detail = await getQuoteDetail(sourceId);
    await applyDetailToForm(detail, { includeIdentity: false });
    message.success($t('page.quote.message.copyPrefilled'));
  } catch {
    message.error($t('page.ai.requestFailed'));
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
  if (!canUseCostLibrary.value) {
    return;
  }
  costPickerRef.value?.open(key as QuoteCostType, matchKeys.value);
}

function onCostPicked(type: QuoteCostType, record: CostLibraryRecord) {
  if (!canUseCostLibrary.value) {
    return;
  }
  if (!isActiveCostRecord(type, record as unknown as Record<string, unknown>)) {
    message.error($t('page.quote.message.costExpired'));
    return;
  }
  const label =
    importMenuItems.value.find((item) => item.key === type)?.label ?? type;
  mergeCostMatch(recordToCostMatchItem(type, record, matchKeys.value));
  applyCostToSheet(sheet, type, record);
  message.success($t('page.quote.message.costImportedType', [label]));
}

async function applyAiCitedCost(payload: AiApplyPayload) {
  if (!canUseCostLibrary.value) {
    return;
  }
  try {
    if (payload.type === 'road') {
      const record = await getRoadCost(payload.id);
      onCostPicked('ROAD', record);
      return;
    }
    if (payload.type === 'sea') {
      const record = await seaCostApi.get(payload.id);
      onCostPicked('SEA', record);
      return;
    }
    const record = await fumigationCostApi.get(payload.id);
    onCostPicked('FUMIGATION', record);
  } catch {
    message.error($t('page.ai.requestFailed'));
  }
}

function onAiApplyEvent(event: Event) {
  const detail = (event as CustomEvent<AiApplyPayload>).detail;
  if (!detail?.id || !detail.type) {
    return;
  }
  void applyAiCitedCost(detail);
}

function consumeAiApplyFromStorage() {
  const raw = sessionStorage.getItem('ai-apply-cost');
  if (!raw) {
    return;
  }
  sessionStorage.removeItem('ai-apply-cost');
  try {
    const payload = JSON.parse(raw) as AiApplyPayload;
    if (payload?.id && payload.type) {
      void applyAiCitedCost(payload);
    }
  } catch {
    // ignore
  }
}

function buildPayload(): QuoteApi.QuoteSave {
  const customer = customerOptions.value.find(
    (c) => c.value === customerId.value,
  );
  const payload: QuoteApi.QuoteSave = {
    customerId: customerId.value,
    customerName: customer?.label ?? customerName.value,
    transportMode: DEFAULT_TRANSPORT_MODE,
    currency: currency.value,
    validUntil: validUntil.value?.format('YYYY-MM-DD'),
    remark: remark.value,
    lines: [],
    ...sheet,
    fumigationEnabled: fumigationEnabled.value,
  };
  if (canUseCostLibrary.value) {
    payload.costMatches = costMatches.value;
  }
  return payload;
}

function validateBasicSheetFields(): boolean {
  const porPol = sheet.por?.trim() || sheet.pol?.trim();
  if (!porPol) {
    message.error($t('page.quote.validation.porPolRequired'));
    return false;
  }
  if (!sheet.pod?.trim()) {
    message.error($t('page.quote.validation.podRequired'));
    return false;
  }
  return true;
}

async function onGenerateSheet() {
  if (!canUseCostLibrary.value) {
    return;
  }
  if (!validateBasicSheetFields()) {
    return;
  }

  generating.value = true;
  try {
    const keepFumigationEnabled = fumigationEnabled.value;
    const result = await generateQuoteSheet({
      por: sheet.por,
      pol: sheet.pol,
      pod: sheet.pod,
      pickUpAddress: sheet.pickUpAddress,
      cifAmount: sheet.cifAmount,
      fumigationEnabled: keepFumigationEnabled,
    });
    Object.assign(sheet, result.sheet);
    if (!sheet.oceanFreight && sheet.ofUsd) {
      sheet.oceanFreight = sheet.ofUsd;
    }
    normalizeSheetUsdFields();
    fumigationEnabled.value = keepFumigationEnabled;
    sheet.fumigationEnabled = keepFumigationEnabled;
    if (!keepFumigationEnabled) {
      sheet.fmNonOak = 0;
      sheet.fmOak = 0;
    }
    costMatches.value = dedupeLatestPerType(result.costMatches ?? []);
    message.success($t('page.quote.message.sheetGenerated'));
  } catch (error: any) {
    message.error(error?.message ?? $t('page.ai.requestFailed'));
  } finally {
    generating.value = false;
  }
}

async function onSave() {
  if (!validateBasicSheetFields()) {
    return;
  }
  saving.value = true;
  try {
    if (isCreate.value) {
      const created = await createQuote(buildPayload());
      message.success(
        $t('page.quote.message.createSuccess', [created.quoteNo]),
      );
      await router.replace({
        name: 'QuoteEdit',
        params: { id: created.id },
      });
      await loadDetail();
      return;
    }
    const id = quoteId.value;
    if (!id) {
      return;
    }
    const updated = await updateQuote(id, buildPayload());
    message.success($t('page.quote.message.saveSuccess', [updated.quoteNo]));
    await loadDetail();
  } finally {
    saving.value = false;
  }
}

async function onSubmit() {
  const id = quoteId.value;
  if (!id) return;
  await submitQuote(id);
  message.success($t('page.quote.message.submitSuccess'));
  await loadDetail();
}

async function onSend() {
  const id = quoteId.value;
  if (!id) return;
  await sendQuote(id);
  message.success($t('page.quote.message.sendSuccess'));
  await loadDetail();
}

async function onCancelApproval() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    title: $t('page.quote.actions.cancelApproval'),
    content: $t('page.quote.confirm.cancelApproval', [quoteNo.value]),
    onOk: async () => {
      await cancelQuoteApproval(id);
      message.success($t('page.quote.message.cancelApprovalSuccess'));
      await loadDetail();
    },
  });
}

async function onReject() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    title: $t('page.quote.actions.reject'),
    content: $t('page.quote.confirm.reject', [quoteNo.value]),
    okType: 'danger',
    onOk: async () => {
      await rejectQuote(id);
      message.success($t('page.quote.message.rejectSuccess'));
      await loadDetail();
    },
  });
}

async function onWon() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    title: $t('page.quote.actions.won'),
    content: $t('page.quote.confirm.won'),
    onOk: async () => {
      await wonQuote(id);
      message.success($t('page.quote.message.wonSuccess'));
      await loadDetail();
    },
  });
}

async function onVoid() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    title: $t('page.quote.actions.void'),
    content: $t('page.quote.confirm.void', [quoteNo.value]),
    okType: 'danger',
    onOk: async () => {
      await voidQuote(id);
      message.success($t('page.quote.message.voidSuccess'));
      await loadDetail();
    },
  });
}

async function onDelete() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    title: $t('common.delete'),
    content: $t('page.quote.confirm.delete', [quoteNo.value]),
    okType: 'danger',
    onOk: async () => {
      await deleteQuote(id);
      message.success($t('page.quote.message.deleteSuccess', [quoteNo.value]));
      router.push({ name: 'QuoteList' });
    },
  });
}

function onCopy() {
  const id = quoteId.value;
  if (!id) {
    return;
  }
  stashQuoteCopySource(id);
  router.push({ name: 'QuoteCreate' });
}

function goBack() {
  router.push({ name: 'QuoteList' });
}

onMounted(async () => {
  window.addEventListener('ai-apply-cost', onAiApplyEvent);
  await Promise.all([
    loadCustomers(),
    loadCurrencies(),
    loadDetail(),
    loadPortOptions(),
    loadQuoteRuleHints(),
  ]);
  consumeAiApplyFromStorage();
  await consumeCopyFromStorage();
  if (isCreate.value) {
    actionsReady.value = true;
  }
});

watch(
  () => route.name,
  async (name) => {
    if (name === 'QuoteCreate') {
      actionsReady.value = false;
      await consumeCopyFromStorage();
      actionsReady.value = true;
      return;
    }
    if (name === 'QuoteEdit') {
      await loadDetail();
    }
  },
);

onUnmounted(() => {
  window.removeEventListener('ai-apply-cost', onAiApplyEvent);
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
                v-if="quoteNo && (isCreate || actionsReady)"
                class="quote-editor-nav__quote-no"
                color="processing"
              >
                {{ quoteNo }}
              </Tag>
              <Tag v-if="!isCreate && actionsReady" :color="statusColor">
                {{ statusLabel(status) }}
              </Tag>
            </div>
          </div>
          <div
            v-if="showToolbarActions"
            class="quote-editor-nav__actions quote-editor-actions"
          >
            <Button
              v-if="canUseCostLibrary"
              class="quote-action-btn quote-action-btn--generate"
              :loading="generating"
              @click="onGenerateSheet"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:file-spreadsheet" />
              {{ $t('page.quote.actions.generateSheet') }}
            </Button>
            <Dropdown v-if="canUseCostLibrary" :trigger="['click']">
              <Button class="quote-action-btn quote-action-btn--import">
                <IconifyIcon class="mr-1 size-4" icon="lucide:database" />
                {{ $t('page.quote.actions.importCost') }}
              </Button>
              <template #overlay>
                <Menu :items="importMenuItems" @click="onImportCostType" />
              </template>
            </Dropdown>
            <Button
              v-if="showWorkflowActions && canCreate"
              class="quote-action-btn quote-action-btn--copy"
              @click="onCopy"
            >
              <Copy class="mr-1 size-4" />
              {{ $t('page.quote.actions.copy') }}
            </Button>
            <Button
              v-if="showWorkflowActions && canSubmitAction"
              class="quote-action-btn quote-action-btn--submit"
              @click="onSubmit"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:send" />
              {{ $t('page.quote.actions.submit') }}
            </Button>
            <Button
              v-if="showWorkflowActions && canCancelApprovalAction"
              class="quote-action-btn quote-action-btn--cancel-approval"
              @click="onCancelApproval"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:undo-2" />
              {{ $t('page.quote.actions.cancelApproval') }}
            </Button>
            <Button
              v-if="
                showWorkflowActions && workflowStatus === 'SENT' && canApprove
              "
              class="quote-action-btn quote-action-btn--reject"
              @click="onReject"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:circle-x" />
              {{ $t('page.quote.actions.reject') }}
            </Button>
            <Button
              v-if="
                showWorkflowActions && workflowStatus === 'SENT' && canApprove
              "
              class="quote-action-btn quote-action-btn--won"
              @click="onWon"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:circle-check-big" />
              {{ $t('page.quote.actions.won') }}
            </Button>
            <Button
              v-if="showWorkflowActions && canVoidAction"
              class="quote-action-btn quote-action-btn--void"
              @click="onVoid"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:ban" />
              {{ $t('page.quote.actions.void') }}
            </Button>
            <Button
              v-if="showWorkflowActions && canDeleteAction"
              class="quote-action-btn quote-action-btn--delete"
              danger
              type="primary"
              @click="onDelete"
            >
              {{ $t('common.delete') }}
            </Button>
            <Button
              v-if="canSave"
              class="quote-action-btn quote-action-btn--save"
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

      <Card class="quote-editor-card quote-card">
        <QuoteSheetEditorSkeleton v-if="loading" />
        <div v-else class="quote-editor-body">
          <!-- 1. 基础信息区 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.basic')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item :label="$t('page.quote.sheet.client')">
                    <Select
                      v-model:value="customerId"
                      :disabled="readOnly"
                      :options="customerOptions"
                      :placeholder="$t('page.quote.placeholders.customer')"
                      allow-clear
                      class="w-full"
                      show-search
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.porPol')" required>
                    <Select
                      :disabled="readOnly"
                      :filter-option="false"
                      :options="portSelectOptions"
                      :show-search="true"
                      :value="sheet.por || sheet.pol || undefined"
                      allow-clear
                      class="w-full"
                      option-label-prop="value"
                      :placeholder="$t('page.quote.sheet.selectPort')"
                      @search="loadPortOptions"
                      @update:value="
                        onPorPolChange($event as string | undefined)
                      "
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.pod')" required>
                    <Select
                      v-model:value="sheet.pod"
                      :disabled="readOnly"
                      :filter-option="false"
                      :options="portSelectOptions"
                      :show-search="true"
                      allow-clear
                      class="w-full"
                      option-label-prop="value"
                      :placeholder="$t('page.quote.sheet.selectPort')"
                      @search="loadPortOptions"
                    />
                  </Form.Item>
                  <Form.Item
                    class="quote-sheet-field--full"
                    :label="$t('page.quote.sheet.pickUpAddress')"
                  >
                    <Input.TextArea
                      v-model:value="sheet.pickUpAddress"
                      class="w-full"
                      :disabled="readOnly"
                      :rows="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.date')">
                    <Input class="w-full" readonly :value="quoteDate" />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.fumigationEnabled')">
                    <Select
                      v-model:value="fumigationEnabled"
                      class="w-full"
                      :disabled="readOnly"
                      :options="fumigationEnabledOptions"
                      @change="onFumigationEnabledChange"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 2. SERVICE FEES — 主费用列表 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.serviceFees')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('oceanFreight')"
                        :label="$t('page.quote.sheet.oceanFreight')"
                      />
                    </template>
                    <Input
                      v-model:value="sheet.oceanFreight"
                      class="w-full"
                      :disabled="readOnly"
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('truckingFee')"
                        :label="$t('page.quote.sheet.truckingFee')"
                      />
                    </template>
                    <InputNumber
                      v-model:value="sheet.truckingFee"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 3. 卡车额外费用 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.truckExtras')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item :label="$t('page.quote.sheet.nsLift')">
                    <InputNumber
                      v-model:value="sheet.nsLift"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.chassis')">
                    <InputNumber
                      v-model:value="sheet.chassis"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.waiting')">
                    <InputNumber
                      v-model:value="sheet.waiting"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.redelivery')">
                    <InputNumber
                      v-model:value="sheet.redeliveryFee"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item
                    class="quote-sheet-field--full"
                    :label="$t('page.quote.sheet.truckRemark')"
                  >
                    <Input.TextArea
                      v-model:value="sheet.truckRemark"
                      class="w-full"
                      :disabled="readOnly"
                      :rows="2"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 4. 熏蒸费 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.fumigation')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('fmNonOak')"
                        :label="$t('page.quote.sheet.fmNonOak')"
                      />
                    </template>
                    <InputNumber
                      v-model:value="sheet.fmNonOak"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('fmOak')"
                        :label="$t('page.quote.sheet.fmOak')"
                      />
                    </template>
                    <InputNumber
                      v-model:value="sheet.fmOak"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 5. 单证、保险、代理费用 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.docInsuranceAgent')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('docUsd')"
                        :label="$t('page.quote.sheet.docFee')"
                      />
                    </template>
                    <Input
                      v-model:value="sheet.docUsd"
                      class="w-full"
                      :disabled="readOnly"
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('cargoInsurancePremium')"
                        :label="$t('page.quote.sheet.cargoInsurance')"
                      />
                    </template>
                    <Input
                      v-model:value="sheet.cargoInsurancePremium"
                      class="w-full"
                      :disabled="readOnly"
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('cargoAgentFee')"
                        :label="$t('page.quote.sheet.cargoAgent')"
                      />
                    </template>
                    <Input
                      v-model:value="sheet.cargoAgentFee"
                      class="w-full"
                      :disabled="readOnly"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 6. 底部备注 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.sheetRemark')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item
                    class="quote-sheet-field--full"
                    :label="$t('page.quote.sheet.remark')"
                  >
                    <Input.TextArea
                      v-model:value="sheet.sheetRemark"
                      class="w-full"
                      :disabled="readOnly"
                      :rows="4"
                    />
                  </Form.Item>
                </div>
              </Form>
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
