<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, Copy, IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  copyQuote,
  createQuoteFollowUp,
  deleteQuoteFollowUp,
  followQuote,
  getQuoteDetail,
  getQuoteOperationLogs,
  submitQuote,
  voidQuote,
  wonQuote,
} from '#/api/quote';
import { getUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { statusTagOptions } from '../list/data';
import CostSourceTables from '../shared/cost-source-tables.vue';
import { QUOTE_SHEET_COLUMNS, sheetCellValue } from '../shared/sheet-columns';

import '../shared/quote.css';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { hasAccessByCodes } = useAccess();

const canEdit = hasAccessByCodes(['quote:edit']);
const canSubmit = hasAccessByCodes(['quote:submit']);
const canApprove = hasAccessByCodes(['quote:approve']);
const canCreate = hasAccessByCodes(['quote:create']);

const loading = ref(false);
const followSubmitting = ref(false);
const detail = ref<QuoteApi.QuoteDetail>();
const operationLogs = ref<any[]>([]);
const followContent = ref('');
const followUpById = ref<number>();
const userOptions = ref<Array<{ label: string; value: number }>>([]);
const logsTabKey = ref('follow');

const quoteId = computed(() => Number(route.params.id));

const statusOption = computed(() =>
  statusTagOptions().find((item) => item.value === detail.value?.status),
);

const statusLabel = computed(
  () => statusOption.value?.label ?? detail.value?.status ?? '',
);

const statusColor = computed(() => statusOption.value?.color ?? 'default');

const pageTitle = computed(
  () => detail.value?.quoteNo ?? $t('page.quote.viewTitle'),
);

const backLabel = computed(() => $t('page.quote.actions.backToList'));

const showEditActions = computed(
  () =>
    (detail.value?.editable && canEdit) ||
    (detail.value?.status === 'DRAFT' && canSubmit),
);

const showWorkflowActions = computed(() => {
  const current = detail.value;
  if (!current) return false;
  return (
    (current.status === 'EFFECTIVE' && canEdit) ||
    (canApprove && current.status !== 'WON' && !current.voided)
  );
});

const ROUTE_SHEET_FIELDS: Array<keyof QuoteApi.QuoteSheetFields> = [
  'zipCode',
  'city',
  'state',
  'por',
  'pol',
  'pod',
  'ssl',
];

const FEE_SHEET_FIELDS: Array<keyof QuoteApi.QuoteSheetFields> = [
  'ofUsd',
  'truckingNonOakUsd',
  'truckingOakUsd',
  'fmNonOak',
  'fmOak',
  'docUsd',
  'cargoMaxWeightTon',
  'sheetRemark',
];

const AMOUNT_FIELDS = new Set<keyof QuoteApi.QuoteSheetFields>([
  'cargoMaxWeightTon',
  'docUsd',
  'fmNonOak',
  'fmOak',
  'ofUsd',
  'truckingNonOakUsd',
  'truckingOakUsd',
]);

const operationLogColumns = [
  {
    dataIndex: 'createdAt',
    key: 'createdAt',
    title: $t('page.quote.fields.time'),
    width: 168,
  },
  {
    dataIndex: 'realName',
    title: $t('page.quote.fields.operator'),
    width: 100,
  },
  {
    dataIndex: 'summary',
    title: $t('page.quote.fields.content'),
  },
];

const followUpColumns = [
  {
    dataIndex: 'followUpAt',
    key: 'followUpAt',
    title: $t('page.quote.fields.time'),
    width: 168,
  },
  {
    dataIndex: 'followUpByName',
    title: $t('page.quote.fields.followUpBy'),
    width: 100,
  },
  {
    dataIndex: 'followStatus',
    key: 'followStatus',
    title: $t('page.quote.fields.docStatusSnapshot'),
    width: 100,
  },
  {
    dataIndex: 'content',
    key: 'content',
    title: $t('page.quote.fields.content'),
  },
  {
    key: 'action',
    title: $t('page.quote.fields.operation'),
    width: 80,
  },
];

const displayCostMatches = computed(() => {
  const items = detail.value?.costSnapshots ?? [];
  const map = new Map<QuoteCostType, QuoteApi.QuoteCostMatchItem>();
  for (const item of items) {
    if (!map.has(item.costType)) {
      map.set(item.costType, item);
    }
  }
  return [...map.values()];
});

function sheetColumnTitle(field: keyof QuoteApi.QuoteSheetFields) {
  return QUOTE_SHEET_COLUMNS.find((col) => col.field === field)?.title ?? field;
}

function followStatusLabel(status: string) {
  return (
    statusTagOptions().find((item) => item.value === status)?.label ?? status
  );
}

function followStatusColor(status: string) {
  return (
    statusTagOptions().find((item) => item.value === status)?.color ?? 'default'
  );
}

function fieldCellClass(field: keyof QuoteApi.QuoteSheetFields, fee = false) {
  return {
    'quote-detail-field': true,
    'quote-detail-field--fee': fee,
    'quote-detail-field--amount': AMOUNT_FIELDS.has(field),
    'quote-detail-field--remark': field === 'sheetRemark',
  };
}

function formatLogTime(value?: string) {
  return value ? formatDateTime(value) : '—';
}

async function loadOperationLogs() {
  const logs = await getQuoteOperationLogs(quoteId.value, {
    page: 1,
    pageSize: 50,
  });
  operationLogs.value = logs.items ?? [];
}

async function loadUserOptions() {
  const result = await getUserList({ page: 1, pageSize: 200, status: 1 });
  userOptions.value = (result.items ?? []).map((user) => ({
    label: user.realName || user.username,
    value: user.id,
  }));
  if (!followUpById.value && userStore.userInfo?.userId) {
    followUpById.value = Number(userStore.userInfo.userId);
  }
}

async function loadDetail() {
  loading.value = true;
  try {
    detail.value = await getQuoteDetail(quoteId.value);
    await loadOperationLogs();
  } finally {
    loading.value = false;
  }
}

async function onSubmit() {
  detail.value = await submitQuote(quoteId.value);
  message.success($t('page.quote.message.submitSuccess'));
}

async function onFollow() {
  detail.value = await followQuote(quoteId.value);
  message.success($t('page.quote.message.followSuccess'));
}

async function onWon() {
  Modal.confirm({
    title: $t('page.quote.actions.won'),
    content: $t('page.quote.confirm.won'),
    onOk: async () => {
      detail.value = await wonQuote(quoteId.value);
      message.success($t('page.quote.message.wonSuccess'));
    },
  });
}

async function onVoid() {
  Modal.confirm({
    title: $t('page.quote.actions.void'),
    content: $t('page.quote.confirm.void', [detail.value?.quoteNo]),
    okType: 'danger',
    onOk: async () => {
      detail.value = await voidQuote(quoteId.value);
      message.success($t('page.quote.message.voidSuccess'));
    },
  });
}

async function onCopy() {
  const copied = await copyQuote(quoteId.value);
  message.success($t('page.quote.message.copySuccess'));
  router.push({ name: 'QuoteEdit', params: { id: copied.id } });
}

function onEdit() {
  router.push({ name: 'QuoteEdit', params: { id: quoteId.value } });
}

function onPrint() {
  window.print();
}

async function onAddFollowUp() {
  if (!followContent.value.trim()) {
    message.warning($t('page.quote.validation.followContent'));
    return;
  }
  if (!followUpById.value) {
    message.warning($t('page.quote.validation.followUpBy'));
    return;
  }
  followSubmitting.value = true;
  try {
    await createQuoteFollowUp(quoteId.value, {
      content: followContent.value.trim(),
      followUpBy: followUpById.value,
    });
    followContent.value = '';
    detail.value = await getQuoteDetail(quoteId.value);
    await loadOperationLogs();
    message.success($t('page.quote.message.followUpCreated'));
  } finally {
    followSubmitting.value = false;
  }
}

function onDeleteFollowUp(id: number) {
  Modal.confirm({
    title: $t('common.delete'),
    content: $t('page.quote.confirm.deleteFollowUp'),
    okType: 'danger',
    onOk: async () => {
      await deleteQuoteFollowUp(quoteId.value, id);
      detail.value = await getQuoteDetail(quoteId.value);
      await loadOperationLogs();
    },
  });
}

onMounted(async () => {
  await Promise.all([loadUserOptions(), loadDetail()]);
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
            <Button
              class="quote-editor-nav__back"
              @click="router.push({ name: 'QuoteList' })"
            >
              <ArrowLeft class="size-4" />
              {{ backLabel }}
            </Button>
            <div class="quote-editor-nav__heading">
              <h2 class="quote-editor-nav__title">{{ pageTitle }}</h2>
              <Tag v-if="detail" :color="statusColor">{{ statusLabel }}</Tag>
              <Tag v-if="detail?.expired" color="error">
                {{ $t('page.quote.status.EXPIRED') }}
              </Tag>
            </div>
          </div>
          <div
            v-if="detail"
            class="quote-editor-nav__actions quote-editor-actions"
          >
            <div v-if="showEditActions" class="quote-editor-actions__group">
              <Button
                v-if="detail.editable && canEdit"
                class="quote-action-btn quote-action-btn--edit"
                @click="onEdit"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:pencil" />
                {{ $t('common.edit') }}
              </Button>
              <Button
                v-if="detail.status === 'DRAFT' && canSubmit"
                class="quote-action-btn quote-action-btn--submit"
                type="primary"
                @click="onSubmit"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:send" />
                {{ $t('page.quote.actions.submit') }}
              </Button>
            </div>
            <div
              v-if="showEditActions && showWorkflowActions"
              class="quote-editor-actions__divider"
            ></div>
            <div v-if="showWorkflowActions" class="quote-editor-actions__group">
              <Button
                v-if="detail.status === 'EFFECTIVE' && canEdit"
                class="quote-action-btn quote-action-btn--follow"
                type="primary"
                @click="onFollow"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:flag" />
                {{ $t('page.quote.actions.follow') }}
              </Button>
              <Button
                v-if="canApprove && detail.status !== 'WON' && !detail.voided"
                class="quote-action-btn quote-action-btn--won"
                @click="onWon"
              >
                <IconifyIcon
                  class="mr-1 size-4"
                  icon="lucide:circle-check-big"
                />
                {{ $t('page.quote.actions.won') }}
              </Button>
              <Button
                v-if="canApprove && !detail.voided && detail.status !== 'WON'"
                class="quote-action-btn quote-action-btn--void"
                danger
                type="primary"
                @click="onVoid"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:ban" />
                {{ $t('page.quote.actions.void') }}
              </Button>
            </div>
            <div class="quote-editor-actions__divider"></div>
            <div
              class="quote-editor-actions__group quote-editor-actions__group--utility"
            >
              <Button
                v-if="canCreate"
                class="quote-action-btn quote-action-btn--copy"
                @click="onCopy"
              >
                <Copy class="mr-1 size-4" />
                {{ $t('page.quote.actions.copy') }}
              </Button>
              <Button
                class="quote-action-btn quote-action-btn--print"
                @click="onPrint"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:printer" />
                {{ $t('page.quote.actions.print') }}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Card :loading="loading" class="quote-editor-card quote-card">
        <div v-if="detail" class="quote-editor-body">
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">
                {{ $t('page.quote.sections.basic') }}
              </span>
            </div>
            <div class="quote-editor-section__body">
              <Descriptions bordered :column="3" size="small">
                <Descriptions.Item
                  :label="$t('page.quote.fields.customerName')"
                >
                  {{ detail.customerName }}
                </Descriptions.Item>
                <Descriptions.Item :label="$t('page.quote.fields.currency')">
                  {{ detail.currency }}
                </Descriptions.Item>
                <Descriptions.Item :label="$t('page.quote.fields.validUntil')">
                  {{ detail.validUntil || '—' }}
                </Descriptions.Item>
                <Descriptions.Item :label="$t('page.quote.fields.followUpBy')">
                  {{ detail.followUpByName || '—' }}
                </Descriptions.Item>
                <Descriptions.Item :label="$t('page.quote.fields.createdBy')">
                  {{ detail.createdByName }}
                </Descriptions.Item>
                <Descriptions.Item :label="$t('page.quote.fields.updatedAt')">
                  {{ formatLogTime(detail.updatedAt) }}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">
                {{ $t('page.quote.sections.routeKeys') }}
              </span>
            </div>
            <div class="quote-editor-section__body">
              <div class="quote-detail-grid quote-detail-grid--route">
                <div
                  v-for="field in ROUTE_SHEET_FIELDS"
                  :key="field"
                  :class="fieldCellClass(field)"
                >
                  <div class="quote-detail-field__label">
                    {{ sheetColumnTitle(field) }}
                  </div>
                  <div class="quote-detail-field__value">
                    {{ sheetCellValue(detail.sheet, field) }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">
                {{ $t('page.quote.sections.fees') }}
              </span>
            </div>
            <div class="quote-editor-section__body">
              <div class="quote-detail-grid quote-detail-grid--fees">
                <div
                  v-for="field in FEE_SHEET_FIELDS"
                  :key="field"
                  :class="fieldCellClass(field, true)"
                >
                  <div class="quote-detail-field__label">
                    {{ sheetColumnTitle(field) }}
                  </div>
                  <div class="quote-detail-field__value">
                    {{ sheetCellValue(detail.sheet, field) }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">
                {{ $t('page.quote.sections.dataSource') }}
              </span>
            </div>
            <div class="quote-editor-section__body">
              <CostSourceTables :matches="displayCostMatches" />
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">
                {{ $t('page.quote.sections.logs') }}
              </span>
            </div>
            <div class="quote-editor-section__body">
              <Tabs v-model:active-key="logsTabKey">
                <Tabs.TabPane
                  key="follow"
                  :tab="$t('page.quote.tabs.followUp')"
                >
                  <Form
                    v-if="canEdit"
                    class="quote-follow-form"
                    layout="vertical"
                  >
                    <p class="quote-follow-form__hint">
                      {{ $t('page.quote.hint.followUpStatus') }}
                      <Tag class="ml-2" :color="statusColor">
                        {{ statusLabel }}
                      </Tag>
                    </p>
                    <div class="quote-follow-form__grid">
                      <Form.Item
                        class="quote-follow-form__user"
                        :label="$t('page.quote.fields.followUpBy')"
                        required
                      >
                        <Select
                          v-model:value="followUpById"
                          :options="userOptions"
                          :placeholder="
                            $t('page.quote.placeholders.followUpBy')
                          "
                          show-search
                          option-filter-prop="label"
                        />
                      </Form.Item>
                      <Form.Item
                        class="quote-follow-form__content"
                        :label="$t('page.quote.fields.content')"
                        required
                      >
                        <Input.TextArea
                          v-model:value="followContent"
                          :auto-size="{ minRows: 1, maxRows: 4 }"
                          :placeholder="
                            $t('page.quote.placeholders.followContent')
                          "
                        />
                      </Form.Item>
                      <Form.Item
                        class="quote-follow-form__submit-item"
                        label=" "
                      >
                        <Button
                          :loading="followSubmitting"
                          type="primary"
                          @click="onAddFollowUp"
                        >
                          <IconifyIcon class="mr-1 size-4" icon="lucide:plus" />
                          {{ $t('page.quote.actions.addFollowUp') }}
                        </Button>
                      </Form.Item>
                    </div>
                  </Form>
                  <Table
                    v-if="detail.followUps?.length"
                    class="quote-log-table"
                    :columns="followUpColumns"
                    :data-source="detail.followUps"
                    :pagination="false"
                    row-key="id"
                    size="small"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'followUpAt'">
                        {{ formatLogTime(record.followUpAt) }}
                      </template>
                      <template v-else-if="column.key === 'followStatus'">
                        <Tag :color="followStatusColor(record.followStatus)">
                          {{ followStatusLabel(record.followStatus) }}
                        </Tag>
                      </template>
                      <template v-else-if="column.key === 'content'">
                        <span class="quote-log-content">{{
                          record.content
                        }}</span>
                      </template>
                      <template v-else-if="column.key === 'action'">
                        <Button
                          v-if="canEdit"
                          danger
                          size="small"
                          type="link"
                          @click="onDeleteFollowUp(record.id)"
                        >
                          {{ $t('common.delete') }}
                        </Button>
                      </template>
                    </template>
                  </Table>
                  <Empty v-else :description="$t('common.noData')" />
                </Tabs.TabPane>
                <Tabs.TabPane
                  key="ops"
                  :tab="$t('page.quote.tabs.operationLog')"
                >
                  <Table
                    v-if="operationLogs.length"
                    class="quote-log-table"
                    :columns="operationLogColumns"
                    :data-source="operationLogs"
                    :pagination="false"
                    row-key="id"
                    size="small"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'createdAt'">
                        {{ formatLogTime(record.createdAt) }}
                      </template>
                    </template>
                  </Table>
                  <Empty v-else :description="$t('common.noData')" />
                </Tabs.TabPane>
              </Tabs>
            </div>
          </section>
        </div>
      </Card>
    </div>
  </Page>
</template>
