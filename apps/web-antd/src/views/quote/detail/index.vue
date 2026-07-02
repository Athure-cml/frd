<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, Copy, IconifyIcon, Pencil, Printer } from '@vben/icons';

import {
  Button,
  Card,
  Descriptions,
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
import { $t } from '#/locales';

import { statusTagOptions } from '../list/data';
import CostSourceTables from '../shared/cost-source-tables.vue';
import { QUOTE_SHEET_COLUMNS, sheetCellValue } from '../shared/sheet-columns';

import '../shared/quote.css';

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();

const canEdit = hasAccessByCodes(['quote:edit']);
const canSubmit = hasAccessByCodes(['quote:submit']);
const canApprove = hasAccessByCodes(['quote:approve']);
const canCreate = hasAccessByCodes(['quote:create']);

const loading = ref(false);
const detail = ref<QuoteApi.QuoteDetail>();
const operationLogs = ref<any[]>([]);
const followContent = ref('');
const followStatus = ref('FOLLOWING');

const quoteId = computed(() => Number(route.params.id));

const statusLabel = computed(() => {
  const s = detail.value?.status;
  return statusTagOptions().find((item) => item.value === s)?.label ?? s;
});

const basicSheetCols = QUOTE_SHEET_COLUMNS.slice(0, 6);
const feeSheetCols = QUOTE_SHEET_COLUMNS.slice(6);

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

async function loadDetail() {
  loading.value = true;
  try {
    detail.value = await getQuoteDetail(quoteId.value);
    const logs = await getQuoteOperationLogs(quoteId.value, {
      page: 1,
      pageSize: 50,
    });
    operationLogs.value = logs.items ?? [];
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
  await createQuoteFollowUp(quoteId.value, {
    content: followContent.value.trim(),
    followStatus: followStatus.value,
  });
  followContent.value = '';
  detail.value = await getQuoteDetail(quoteId.value);
  message.success($t('page.quote.message.followUpCreated'));
}

async function onDeleteFollowUp(id: number) {
  await deleteQuoteFollowUp(quoteId.value, id);
  detail.value = await getQuoteDetail(quoteId.value);
}

onMounted(loadDetail);
</script>

<template>
  <Page
    auto-content-height
    class="quote-detail-page"
    :title="detail?.quoteNo ?? $t('page.quote.viewTitle')"
  >
    <Card :loading="loading">
      <div class="quote-editor-toolbar">
        <div class="quote-editor-meta">
          <Button type="text" @click="router.push({ name: 'QuoteList' })">
            <ArrowLeft class="size-4" />
          </Button>
          <Tag>{{ statusLabel }}</Tag>
          <Tag v-if="detail?.expired" color="error">
            {{ $t('page.quote.status.EXPIRED') }}
          </Tag>
        </div>
        <div class="quote-editor-actions">
          <Button v-if="detail?.editable && canEdit" @click="onEdit">
            <Pencil class="size-4" />
            {{ $t('common.edit') }}
          </Button>
          <Button
            v-if="detail?.status === 'DRAFT' && canSubmit"
            type="primary"
            @click="onSubmit"
          >
            {{ $t('page.quote.actions.submit') }}
          </Button>
          <Button
            v-if="detail?.status === 'EFFECTIVE' && canEdit"
            @click="onFollow"
          >
            {{ $t('page.quote.actions.follow') }}
          </Button>
          <Button
            v-if="canApprove && detail?.status !== 'WON' && !detail?.voided"
            @click="onWon"
          >
            {{ $t('page.quote.actions.won') }}
          </Button>
          <Button
            v-if="canApprove && !detail?.voided && detail?.status !== 'WON'"
            danger
            @click="onVoid"
          >
            {{ $t('page.quote.actions.void') }}
          </Button>
          <Button v-if="canCreate" @click="onCopy">
            <Copy class="size-4" />
            {{ $t('page.quote.actions.copy') }}
          </Button>
          <Button @click="onPrint">
            <Printer class="size-4" />
            {{ $t('page.quote.actions.print') }}
          </Button>
        </div>
      </div>

      <div class="quote-editor-body" v-if="detail">
        <section class="quote-editor-section">
          <div class="quote-editor-section__head">
            {{ $t('page.quote.sections.basic') }}
          </div>
          <div class="quote-editor-section__body">
            <Descriptions bordered :column="3" size="small">
              <Descriptions.Item :label="$t('page.quote.fields.customerName')">
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
                {{ detail.updatedAt }}
              </Descriptions.Item>
            </Descriptions>
            <div
              class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
            >
              <div
                v-for="col in basicSheetCols"
                :key="col.field"
                class="quote-detail-field"
              >
                <div class="quote-detail-field__label">{{ col.title }}</div>
                <div class="quote-detail-field__value">
                  {{ sheetCellValue(detail.sheet, col.field) }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="quote-editor-section">
          <div class="quote-editor-section__head">
            {{ $t('page.quote.sections.fees') }}
          </div>
          <div class="quote-editor-section__body">
            <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div
                v-for="col in feeSheetCols"
                :key="col.field"
                class="quote-detail-field quote-detail-field--fee"
              >
                <div class="quote-detail-field__label">{{ col.title }}</div>
                <div class="quote-detail-field__value">
                  {{ sheetCellValue(detail.sheet, col.field) }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="quote-editor-section">
          <div class="quote-editor-section__head">
            {{ $t('page.quote.sections.dataSource') }}
          </div>
          <div class="quote-editor-section__body">
            <CostSourceTables :matches="displayCostMatches" />
          </div>
        </section>

        <section class="quote-editor-section">
          <div class="quote-editor-section__head">
            {{ $t('page.quote.sections.logs') }}
          </div>
          <div class="quote-editor-section__body">
            <Tabs>
              <Tabs.TabPane key="ops" :tab="$t('page.quote.tabs.operationLog')">
                <Table
                  :columns="[
                    {
                      dataIndex: 'createdAt',
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
                  ]"
                  :data-source="operationLogs"
                  :pagination="false"
                  row-key="id"
                  size="small"
                />
              </Tabs.TabPane>
              <Tabs.TabPane key="follow" :tab="$t('page.quote.tabs.followUp')">
                <div v-if="canEdit" class="mb-4 flex flex-wrap gap-2">
                  <Select
                    v-model:value="followStatus"
                    class="w-36"
                    :options="statusTagOptions()"
                  />
                  <input
                    v-model="followContent"
                    class="min-w-[240px] flex-1 rounded border px-3 py-1"
                    :placeholder="$t('page.quote.placeholders.followContent')"
                  />
                  <Button type="primary" @click="onAddFollowUp">
                    <IconifyIcon class="mr-1 size-4" icon="lucide:plus" />
                    {{ $t('page.quote.actions.addFollowUp') }}
                  </Button>
                </div>
                <Table
                  :columns="[
                    {
                      dataIndex: 'followUpAt',
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
                      title: $t('page.quote.fields.status'),
                      width: 100,
                    },
                    {
                      dataIndex: 'content',
                      title: $t('page.quote.fields.content'),
                    },
                    {
                      key: 'action',
                      title: $t('page.quote.fields.operation'),
                      width: 80,
                    },
                  ]"
                  :data-source="detail.followUps"
                  :pagination="false"
                  row-key="id"
                  size="small"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'action'">
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
              </Tabs.TabPane>
            </Tabs>
          </div>
        </section>
      </div>
    </Card>
  </Page>
</template>
