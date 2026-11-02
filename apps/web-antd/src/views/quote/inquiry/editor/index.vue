<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { QuoteOakType, QuoteServiceType } from '#/api/quote';
import type { InquiryApi } from '#/api/quote/inquiry';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, IconifyIcon, Save } from '@vben/icons';

import { useDebounceFn } from '@vueuse/core';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getCustomerList } from '#/api/customer';
import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import {
  createInquiry,
  deleteInquiry,
  getInquiryDetail,
  submitInquiry,
  updateInquiry,
} from '#/api/quote/inquiry';
import { $t } from '#/locales';

import { getServiceTypeOptions } from '../../list/data';
import {
  stashInquiryCopySource,
  takeInquiryCopySourceId,
} from '../../shared/inquiry-copy';
import { markQuoteListForceRefresh } from '../../shared/list-cache';
import QuoteAddressRow from '../../shared/quote-address-row.vue';
import QuoteFumigationStationSelect from '../../shared/quote-fumigation-station-select.vue';
import QuoteSheetEditorSkeleton from '../../shared/quote-sheet-editor-skeleton.vue';
import { parseQuoteDate } from '../../shared/sheet-columns';
import { resolveInquiryStatusTag } from '../list/data';

import '../../shared/quote.css';

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();

const canCreate = hasAccessByCodes(['inquiry:create']);
const canEdit = hasAccessByCodes(['inquiry:edit']);
const canSubmit = hasAccessByCodes(['inquiry:submit']);
const canDelete = hasAccessByCodes(['inquiry:delete']);

const saving = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const actionsReady = ref(false);
/** 非新建默认进入加载态，避免接口返回前闪出按钮/表单 */
const loading = ref(route.name !== 'InquiryCreate');

const inquiryId = computed(() => {
  const raw = route.params.id;
  const n = typeof raw === 'string' ? Number(raw) : Number(raw?.[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
});
const isCreate = computed(() => route.name === 'InquiryCreate');
/** 与报价单一致：接口就绪后再展示工具栏按钮 */
const showToolbarActions = computed(() => actionsReady.value);
const showBodySkeleton = computed(
  () => loading.value || (!isCreate.value && !actionsReady.value),
);

const inquiryNo = ref('');
const status = ref<InquiryApi.Detail['status']>('PENDING_SUBMIT');
const quoteId = ref<null | number>(null);
const quoteNo = ref('');

const serviceTypes = ref<QuoteServiceType[]>([]);
const customerId = ref<number>();
const customerName = ref('');
const transportMode = ref<'RAIL' | 'ROAD' | 'SEA'>('SEA');
/** 仅「新建询价」自动带入当天；详情/编辑用接口日期，绝不回落到今天 */
const quoteDate = ref<Dayjs>();
const validUntil = ref<Dayjs | null>(null);
const oakType = ref<QuoteOakType | undefined>();
const fumigationEnabled = ref(false);
const sheet = ref({
  city: '',
  fumigationPoint: '',
  pickUpAddress: '',
  pod: '',
  pol: '',
  por: '',
  state: '',
  zipCode: '',
});

const customerOptions = ref<Array<{ label: string; value: number }>>([]);
const portSelectOptions = ref<Array<{ label: string; value: string }>>([]);
const serviceTypeOptions = getServiceTypeOptions();
const oakTypeOptions = [
  { label: 'OAK', value: 'OAK' },
  { label: 'NON-OAK', value: 'NON_OAK' },
];

const showFumigationFees = computed(() =>
  serviceTypes.value.includes('FUMIGATION'),
);

const readOnly = computed(() => {
  if (isCreate.value) return false;
  if (status.value !== 'PENDING_SUBMIT') return true;
  return !canEdit;
});

const canSave = computed(
  () =>
    (isCreate.value && canCreate) ||
    (!isCreate.value && canEdit && status.value === 'PENDING_SUBMIT'),
);

const canSubmitAction = computed(
  () =>
    !isCreate.value &&
    !!inquiryId.value &&
    canSubmit &&
    status.value === 'PENDING_SUBMIT',
);

/** 仅待递交可删除 */
const canDeleteAction = computed(
  () =>
    !isCreate.value &&
    !!inquiryId.value &&
    canDelete &&
    status.value === 'PENDING_SUBMIT',
);

const headerStatusTag = computed(() => resolveInquiryStatusTag(status.value));

const pageTitle = computed(() => {
  if (isCreate.value) return $t('page.inquiry.createTitle');
  // 加载完成前不根据默认状态误判「编辑/查看」
  if (!actionsReady.value) return $t('page.inquiry.viewTitle');
  return readOnly.value
    ? $t('page.inquiry.viewTitle')
    : $t('page.inquiry.editTitle');
});

const backLabel = computed(() => $t('page.inquiry.actions.backToList'));

watch(showFumigationFees, (enabled) => {
  fumigationEnabled.value = enabled;
  if (!enabled) {
    sheet.value.fumigationPoint = '';
    oakType.value = undefined;
  }
});

watch(customerId, (id) => {
  if (id === null || id === undefined) {
    customerName.value = '';
    return;
  }
  const matched = customerOptions.value.find((item) => item.value === id);
  if (matched) {
    customerName.value = matched.label;
  }
});

const loadCustomers = useDebounceFn(async (keyword?: string) => {
  const result = await getCustomerList({
    name: keyword?.trim() || undefined,
    page: 1,
    pageSize: 50,
    status: 1,
  });
  const next = result.items.map((item) => ({
    label: item.name,
    value: item.id,
  }));
  const selectedId = customerId.value;
  if (
    selectedId !== null &&
    selectedId !== undefined &&
    !next.some((item) => item.value === selectedId) &&
    customerName.value.trim()
  ) {
    next.unshift({ label: customerName.value.trim(), value: selectedId });
  }
  customerOptions.value = next;
}, 280);

const loadPortOptions = useDebounceFn(async (keyword = '') => {
  portSelectOptions.value = await searchGlobalPortNameOptions({
    keyword,
    limit: 50,
    portTypes: ['SEAPORT', 'RAIL', 'INLAND'],
  });
}, 280);

function buildPayload(): InquiryApi.SaveRequest {
  const customer =
    customerOptions.value.find((item) => item.value === customerId.value)
      ?.label ?? customerName.value;
  return {
    city: sheet.value.city || undefined,
    customerId: customerId.value ?? null,
    customerName: customer || undefined,
    fumigationEnabled: fumigationEnabled.value,
    fumigationPoint: sheet.value.fumigationPoint || undefined,
    oakType: oakType.value ?? null,
    pickUpAddress: sheet.value.pickUpAddress || undefined,
    pod: sheet.value.pod || undefined,
    pol: sheet.value.pol || undefined,
    por: sheet.value.por || undefined,
    quoteDate: quoteDate.value?.format('YYYY-MM-DD'),
    serviceTypes: serviceTypes.value,
    state: sheet.value.state || undefined,
    transportMode: transportMode.value,
    validUntil: validUntil.value
      ? validUntil.value.format('YYYY-MM-DD')
      : undefined,
    zipCode: sheet.value.zipCode || undefined,
  };
}

function applyDetail(
  detail: InquiryApi.Detail,
  options?: { asCopy?: boolean },
) {
  const asCopy = options?.asCopy === true;
  if (asCopy) {
    inquiryNo.value = '';
    status.value = 'PENDING_SUBMIT';
    quoteId.value = null;
    quoteNo.value = '';
    // 复制新建：日期重新带入当天
    quoteDate.value = dayjs();
  } else {
    inquiryNo.value = detail.inquiryNo;
    status.value = detail.status;
    quoteId.value = detail.quoteId ?? null;
    quoteNo.value = detail.quoteNo ?? '';
    quoteDate.value = parseQuoteDate(detail.quoteDate, detail.createdAt);
  }
  serviceTypes.value = (detail.serviceTypes ?? []) as QuoteServiceType[];
  customerId.value = detail.customerId ?? undefined;
  customerName.value = detail.customerName ?? '';
  transportMode.value = detail.transportMode ?? 'SEA';
  validUntil.value = detail.validUntil ? dayjs(detail.validUntil) : null;
  oakType.value = detail.oakType;
  fumigationEnabled.value = detail.fumigationEnabled === true;
  sheet.value = {
    city: detail.city ?? '',
    fumigationPoint: detail.fumigationPoint ?? '',
    pickUpAddress: detail.pickUpAddress ?? '',
    pod: detail.pod ?? '',
    pol: detail.pol ?? '',
    por: detail.por ?? '',
    state: detail.state ?? '',
    zipCode: detail.zipCode ?? '',
  };
  if (customerId.value && customerName.value) {
    customerOptions.value = [
      { label: customerName.value, value: customerId.value },
    ];
  }
  const ports = [detail.por, detail.pol, detail.pod].filter(
    Boolean,
  ) as string[];
  if (ports.length > 0) {
    portSelectOptions.value = ports.map((code) => ({
      label: code,
      value: code,
    }));
  }
}

async function consumeCopyFromStorage() {
  if (!isCreate.value) {
    return;
  }
  const sourceId = takeInquiryCopySourceId();
  if (!sourceId) {
    return;
  }
  loading.value = true;
  try {
    applyDetail(await getInquiryDetail(sourceId), { asCopy: true });
    message.success($t('page.inquiry.message.copyPrefilled'));
  } catch {
    message.error($t('ui.actionMessage.operationFailed'));
  } finally {
    loading.value = false;
  }
}

function onCopy() {
  const id = inquiryId.value;
  if (!id || !canCreate) return;
  stashInquiryCopySource(id);
  router.push({ name: 'InquiryCreate' });
}

function onDelete() {
  const id = inquiryId.value;
  if (!id || !canDeleteAction.value) return;
  Modal.confirm({
    centered: true,
    content: $t('page.inquiry.confirm.delete', [inquiryNo.value || id]),
    okType: 'danger',
    title: $t('common.delete'),
    onOk: async () => {
      deleting.value = true;
      try {
        await deleteInquiry(id);
        markQuoteListForceRefresh('inquiry');
        message.success($t('page.inquiry.message.deleteSuccess'));
        router.push({ name: 'InquiryList' });
      } finally {
        deleting.value = false;
      }
    },
  });
}

async function loadDetail() {
  const id = inquiryId.value;
  if (!id) return;
  actionsReady.value = false;
  loading.value = true;
  try {
    applyDetail(await getInquiryDetail(id));
  } finally {
    loading.value = false;
    actionsReady.value = true;
  }
}

async function onSave() {
  if (!canSave.value) return;
  if (serviceTypes.value.length === 0) {
    message.warning($t('page.inquiry.validation.serviceTypeRequired'));
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload();
    if (isCreate.value) {
      const created = await createInquiry(payload);
      markQuoteListForceRefresh('inquiry');
      message.success(
        $t('page.inquiry.message.createSuccess', [created.inquiryNo]),
      );
      await router.replace({
        name: 'InquiryEdit',
        params: { id: created.id },
      });
      applyDetail(created);
      actionsReady.value = true;
    } else if (inquiryId.value) {
      const updated = await updateInquiry(inquiryId.value, payload);
      markQuoteListForceRefresh('inquiry');
      message.success(
        $t('page.inquiry.message.saveSuccess', [updated.inquiryNo]),
      );
      applyDetail(updated);
    }
  } finally {
    saving.value = false;
  }
}

async function onSubmit() {
  const id = inquiryId.value;
  if (!id || !canSubmitAction.value) return;
  if (!sheet.value.por) {
    message.warning($t('page.inquiry.validation.porRequired'));
    return;
  }
  if (!sheet.value.pod) {
    message.warning($t('page.inquiry.validation.podRequired'));
    return;
  }
  Modal.confirm({
    centered: true,
    content: $t('page.inquiry.confirm.submit'),
    title: $t('page.inquiry.actions.submit'),
    onOk: async () => {
      submitting.value = true;
      try {
        if (canSave.value) {
          await updateInquiry(id, buildPayload());
        }
        const result = await submitInquiry(id);
        markQuoteListForceRefresh('inquiry');
        markQuoteListForceRefresh('quote');
        message.success(
          $t('page.inquiry.message.submitSuccess', [
            result.quoteNo || result.quoteId || '',
          ]),
        );
        // 递交后留在当前询价单，不跳转报价单
        applyDetail(result);
      } finally {
        submitting.value = false;
      }
    },
  });
}

function goBack() {
  router.push({ name: 'InquiryList' });
}

function openQuote() {
  if (!quoteId.value) return;
  router.push({ name: 'QuoteEdit', params: { id: quoteId.value } });
}

onMounted(async () => {
  await loadCustomers();
  if (isCreate.value) {
    quoteDate.value = dayjs();
    // 复制预填完成后再亮工具栏，避免空白表单上先闪按钮
    await consumeCopyFromStorage();
    loading.value = false;
    actionsReady.value = true;
    return;
  }
  await loadDetail();
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
                v-if="inquiryNo && (isCreate || actionsReady)"
                class="quote-editor-nav__quote-no"
                color="processing"
              >
                {{ inquiryNo }}
              </Tag>
              <Tag
                v-if="!isCreate && actionsReady"
                :class="headerStatusTag.className"
                :color="headerStatusTag.color"
              >
                {{ headerStatusTag.label }}
              </Tag>
              <Button
                v-if="!isCreate && actionsReady && quoteId"
                type="link"
                class="!px-1"
                @click="openQuote"
              >
                {{ $t('page.inquiry.actions.openQuote') }}
                <span v-if="quoteNo" class="ml-1">{{ quoteNo }}</span>
              </Button>
            </div>
          </div>
          <div
            v-if="showToolbarActions"
            class="quote-editor-nav__actions quote-editor-actions"
          >
            <Button
              v-if="!isCreate && canCreate"
              class="quote-action-btn quote-action-btn--copy"
              @click="onCopy"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:copy" />
              {{ $t('page.inquiry.actions.copy') }}
            </Button>
            <Button
              v-if="canSubmitAction"
              class="quote-action-btn quote-action-btn--submit"
              :loading="submitting"
              @click="onSubmit"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:send" />
              {{ $t('page.inquiry.actions.submit') }}
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
              {{ $t('page.inquiry.actions.save') }}
            </Button>
            <Button
              v-if="canDeleteAction"
              class="quote-action-btn quote-action-btn--delete"
              danger
              :loading="deleting"
              type="primary"
              @click="onDelete"
            >
              <IconifyIcon class="mr-1 size-4" icon="lucide:trash-2" />
              {{ $t('common.delete') }}
            </Button>
          </div>
        </div>
      </header>

      <Card class="quote-editor-card quote-card">
        <QuoteSheetEditorSkeleton v-if="showBodySkeleton" />
        <div v-else class="quote-editor-body">
          <!-- 1. 基础信息区（与报价单一致） -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.basic')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <div class="quote-sheet-basic-row quote-sheet-basic-row--4">
                    <Form.Item
                      :label="$t('page.quote.sheet.serviceType')"
                      required
                    >
                      <Select
                        v-model:value="serviceTypes"
                        :disabled="readOnly"
                        max-tag-count="responsive"
                        :options="serviceTypeOptions"
                        :placeholder="
                          readOnly
                            ? '—'
                            : $t('page.quote.placeholders.serviceType')
                        "
                        allow-clear
                        class="w-full"
                        mode="multiple"
                        show-search
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.client')">
                      <Select
                        v-model:value="customerId"
                        :disabled="readOnly"
                        :filter-option="false"
                        :options="customerOptions"
                        :placeholder="
                          readOnly
                            ? '—'
                            : $t('page.quote.placeholders.customer')
                        "
                        allow-clear
                        class="w-full"
                        show-search
                        @search="loadCustomers"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.date')">
                      <DatePicker
                        v-if="!readOnly"
                        v-model:value="quoteDate"
                        class="w-full"
                        format="YYYY-MM-DD"
                      />
                      <Input
                        v-else
                        class="w-full"
                        readonly
                        :value="
                          quoteDate ? quoteDate.format('YYYY-MM-DD') : '—'
                        "
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.validUntil')">
                      <DatePicker
                        v-if="!readOnly"
                        v-model:value="validUntil"
                        allow-clear
                        class="w-full"
                        format="YYYY-MM-DD"
                      />
                      <Input
                        v-else
                        class="w-full"
                        readonly
                        :value="
                          validUntil ? validUntil.format('YYYY-MM-DD') : '—'
                        "
                      />
                    </Form.Item>
                  </div>
                  <div class="quote-sheet-basic-row quote-sheet-basic-row--3">
                    <Form.Item :label="$t('page.quote.sheet.por')" required>
                      <Select
                        v-model:value="sheet.por"
                        :disabled="readOnly"
                        :filter-option="false"
                        :options="portSelectOptions"
                        :show-search="true"
                        allow-clear
                        class="w-full"
                        option-label-prop="value"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.sheet.selectPort')
                        "
                        @search="loadPortOptions"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.pol')">
                      <Select
                        v-model:value="sheet.pol"
                        :disabled="readOnly"
                        :filter-option="false"
                        :options="portSelectOptions"
                        :show-search="true"
                        allow-clear
                        class="w-full"
                        option-label-prop="value"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.sheet.selectPort')
                        "
                        @search="loadPortOptions"
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
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.sheet.selectPort')
                        "
                        @search="loadPortOptions"
                      />
                    </Form.Item>
                  </div>
                  <QuoteAddressRow
                    v-model:city="sheet.city"
                    v-model:state="sheet.state"
                    v-model:zip-code="sheet.zipCode"
                    :disabled="readOnly"
                  />
                  <div
                    v-if="showFumigationFees"
                    class="quote-sheet-location-row quote-sheet-location-row--2"
                  >
                    <Form.Item
                      :label="$t('page.quote.sheet.fumigationPoint')"
                      required
                    >
                      <QuoteFumigationStationSelect
                        :disabled="readOnly"
                        :model-value="sheet.fumigationPoint"
                        @update:model-value="
                          (v) => (sheet.fumigationPoint = String(v ?? ''))
                        "
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.oakType')" required>
                      <Select
                        v-model:value="oakType"
                        :disabled="readOnly"
                        :options="oakTypeOptions"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.placeholders.oakType')
                        "
                        allow-clear
                        class="w-full"
                      />
                    </Form.Item>
                  </div>
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
                </div>
              </Form>
            </div>
          </section>
        </div>
      </Card>
    </div>
  </Page>
</template>
