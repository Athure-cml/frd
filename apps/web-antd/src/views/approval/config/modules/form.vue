<script lang="ts" setup>
import type { ApprovalApi } from '#/api/approval';
import type { SystemUserApi } from '#/api/system/user';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Form, message, Select } from 'ant-design-vue';

import { createApprovalConfig, updateApprovalConfig } from '#/api/approval';
import { getUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { getApprovalConfigObjectOptions } from '../data';

const emit = defineEmits<{ success: [] }>();

const t = (key: string) => $t(`page.approval.${key}`);

const configId = ref<number>();
const configObject = ref<ApprovalApi.ConfigObject>('QUOTE');
const flowSteps = ref<Array<number | undefined>>([undefined]);
const userOptions = ref<Array<{ label: string; value: number }>>([]);

const getTitle = computed(() =>
  configId.value ? t('configForm.editTitle') : t('configForm.createTitle'),
);

async function loadUserOptions() {
  const result = await getUserList({ page: 1, pageSize: 200, status: 1 });
  userOptions.value = (result.items ?? []).map(
    (user: SystemUserApi.SystemUser) => ({
      label: user.realName || user.username,
      value: user.id,
    }),
  );
}

function addStep() {
  flowSteps.value.push(undefined);
}

function removeStep(index: number) {
  if (flowSteps.value.length <= 1) {
    return;
  }
  flowSteps.value.splice(index, 1);
}

function validateFlowSteps() {
  const approverIds = flowSteps.value.filter(
    (id): id is number => id !== undefined,
  );
  if (approverIds.length === 0) {
    message.warning(t('configForm.flowRequired'));
    return null;
  }
  if (approverIds.some((id) => !id)) {
    message.warning(t('configForm.approverRequired'));
    return null;
  }
  if (new Set(approverIds).size !== approverIds.length) {
    message.warning(t('configForm.duplicateApprover'));
    return null;
  }
  return approverIds.map((approverId) => ({ approverId }));
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const payloadSteps = validateFlowSteps();
    if (!payloadSteps) {
      return;
    }
    modalApi.lock();
    try {
      const payload: ApprovalApi.ConfigSave = {
        configObject: configObject.value,
        flowSteps: payloadSteps,
      };
      await (configId.value
        ? updateApprovalConfig(configId.value, payload)
        : createApprovalConfig(payload));
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    await loadUserOptions();
    const data = modalApi.getData<ApprovalApi.ConfigItem>();
    configId.value = data?.id;
    configObject.value = data?.configObject ?? 'QUOTE';
    flowSteps.value = data?.flowSteps?.length
      ? data.flowSteps.map((step) => step.approverId)
      : [undefined];
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[640px]">
    <Form layout="vertical" class="px-1">
      <Form.Item :label="t('fields.configObject')">
        <Select
          v-model:value="configObject"
          disabled
          :options="getApprovalConfigObjectOptions()"
        />
      </Form.Item>
      <Form.Item :label="t('fields.configFlow')">
        <p class="mb-3 text-sm text-muted-foreground">
          {{ t('configForm.flowHint') }}
        </p>
        <div class="space-y-3">
          <div
            v-for="(_, index) in flowSteps"
            :key="index"
            class="flex items-center gap-2"
          >
            <span class="w-16 shrink-0 text-sm text-muted-foreground">
              {{ t('configForm.stepLabel').replace('{0}', String(index + 1)) }}
            </span>
            <Select
              v-model:value="flowSteps[index]"
              allow-clear
              class="min-w-0 flex-1"
              :options="userOptions"
              :placeholder="t('configForm.approverRequired')"
              show-search
              option-filter-prop="label"
            />
            <Button
              v-if="flowSteps.length > 1"
              danger
              type="text"
              @click="removeStep(index)"
            >
              <IconifyIcon class="size-4" icon="lucide:circle-minus" />
            </Button>
          </div>
        </div>
        <Button class="mt-3" type="dashed" block @click="addStep">
          <IconifyIcon class="size-4" icon="lucide:plus" />
          {{ t('configForm.addStep') }}
        </Button>
      </Form.Item>
    </Form>
  </Modal>
</template>
