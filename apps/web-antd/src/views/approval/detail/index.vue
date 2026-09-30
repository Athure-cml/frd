<script lang="ts" setup>
import type { ApprovalApi } from '#/api/approval';

import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { ArrowLeft } from '@vben/icons';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Steps,
} from 'ant-design-vue';

import {
  approveQuoteWithComment,
  getQuoteApprovalDetail,
  rejectQuoteApproval,
} from '#/api/approval';
import { $t } from '#/locales';

import QuotePrintSheet from '../../quote/shared/quote-print-sheet.vue';

import '../../quote/shared/quote.css';
import './approval-detail.css';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const submitting = ref(false);
const detail = ref<ApprovalApi.Detail>();
const approveOpen = ref(false);
const rejectOpen = ref(false);
const approveComment = ref('');
const rejectComment = ref('');

const quoteId = computed(() => Number(route.params.id));
const cycleIndex = computed(() => {
  const value = Number(route.query.cycle);
  return Number.isFinite(value) && value > 0 ? value : undefined;
});

const pageTitle = computed(
  () => detail.value?.quote.quoteNo ?? $t('page.approval.detailTitle'),
);

const quoteDate = computed(() => {
  const quote = detail.value?.quote;
  if (!quote) return '';
  return quote.quoteDate ?? quote.createdAt?.slice(0, 10) ?? '';
});

const workflowSteps = computed(() => detail.value?.workflowSteps ?? []);

const currentStep = computed(() => {
  const steps = workflowSteps.value;
  const processingIndex = steps.findIndex((step) => step.status === 'process');
  if (processingIndex !== -1) return processingIndex;
  const errorIndex = steps.findIndex((step) => step.status === 'error');
  if (errorIndex !== -1) return errorIndex;
  if (steps.some((step) => step.status === 'wait')) {
    return steps.findIndex((step) => step.status === 'wait');
  }
  return steps.length;
});

async function loadDetail() {
  loading.value = true;
  try {
    detail.value = await getQuoteApprovalDetail(
      quoteId.value,
      cycleIndex.value,
    );
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push({ name: 'ApprovalList' });
}

function openApproveModal() {
  approveComment.value = '';
  approveOpen.value = true;
}

function openRejectModal() {
  rejectComment.value = '';
  rejectOpen.value = true;
}

async function onApproveOk() {
  const comment = approveComment.value.trim();
  if (!comment) {
    message.warning($t('page.approval.commentRequired'));
    return;
  }
  submitting.value = true;
  try {
    await approveQuoteWithComment(quoteId.value, comment);
    message.success($t('page.quote.message.approveSuccess'));
    approveOpen.value = false;
    await router.push({ name: 'ApprovalList' });
  } finally {
    submitting.value = false;
  }
}

async function onRejectOk() {
  const comment = rejectComment.value.trim();
  if (!comment) {
    message.warning($t('page.approval.commentRequired'));
    return;
  }
  submitting.value = true;
  try {
    await rejectQuoteApproval(quoteId.value, comment);
    message.success($t('page.approval.rejectSuccess'));
    rejectOpen.value = false;
    await router.push({ name: 'ApprovalList' });
  } finally {
    submitting.value = false;
  }
}

loadDetail();
</script>

<template>
  <Page
    auto-content-height
    class="approval-detail-page"
    content-class="approval-detail-page__content"
  >
    <div class="approval-detail-toolbar quote-card">
      <div class="approval-detail-toolbar__leading">
        <Button @click="goBack">
          <ArrowLeft class="mr-1 size-4" />
          {{ $t('page.approval.actions.back') }}
        </Button>
        <h2 class="approval-detail-toolbar__title">{{ pageTitle }}</h2>
      </div>
      <div
        v-if="detail?.pendingApproval"
        class="approval-detail-toolbar__actions"
      >
        <Button danger type="primary" @click="openRejectModal">
          {{ $t('page.approval.actions.reject') }}
        </Button>
        <Button type="primary" @click="openApproveModal">
          {{ $t('page.approval.actions.approve') }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="approval-detail approval-detail--loading">
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="detail" class="approval-detail">
      <Card
        :title="$t('page.approval.workflowTitle')"
        class="approval-detail__workflow"
      >
        <Steps
          :current="currentStep"
          class="approval-detail__steps"
          direction="vertical"
          size="small"
        >
          <Steps.Step
            v-for="step in workflowSteps"
            :key="step.key"
            :status="step.status"
            :title="step.title"
          >
            <template #description>
              <div v-if="step.operatorName" class="approval-detail__step-meta">
                {{ step.operatorName }}
                <span v-if="step.operatedAt"> · {{ step.operatedAt }}</span>
              </div>
              <div v-if="step.comment" class="approval-detail__step-comment">
                {{ step.comment }}
              </div>
            </template>
          </Steps.Step>
        </Steps>
      </Card>

      <Card
        :title="$t('page.approval.sheetPreview')"
        class="approval-detail__sheet"
      >
        <div class="approval-detail__print-wrap">
          <QuotePrintSheet
            :cost-snapshots="detail.quote.costSnapshots"
            :customer-name="detail.quote.customerName"
            :quote-date="quoteDate"
            :sheet="detail.quote.sheet"
          />
        </div>
      </Card>
    </div>

    <Modal
      v-model:open="approveOpen"
      :confirm-loading="submitting"
      :title="$t('page.approval.approveModalTitle')"
      @ok="onApproveOk"
    >
      <Form layout="vertical">
        <Form.Item :label="$t('page.approval.fields.comment')" required>
          <Input.TextArea
            v-model:value="approveComment"
            :maxlength="500"
            :placeholder="$t('page.approval.commentPlaceholder')"
            :rows="4"
            show-count
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="rejectOpen"
      :confirm-loading="submitting"
      :title="$t('page.approval.rejectModalTitle')"
      @ok="onRejectOk"
    >
      <Form layout="vertical">
        <Form.Item :label="$t('page.approval.fields.comment')" required>
          <Input.TextArea
            v-model:value="rejectComment"
            :maxlength="500"
            :placeholder="$t('page.approval.commentPlaceholder')"
            :rows="4"
            show-count
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
