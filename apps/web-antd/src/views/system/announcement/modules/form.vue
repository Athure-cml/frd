<script lang="ts" setup>
import type { AnnouncementApi } from '#/api/system/announcement';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message, Space } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createAnnouncement,
  updateAnnouncement,
} from '#/api/system/announcement';
import { $t } from '#/locales';

import {
  buildAnnouncementSavePayload,
  isEmptyRichContent,
  isPublishedLikeStatus,
  mapAnnouncementToFormValues,
  useAnnouncementFormSchema,
} from '../data';

import '../../shared/system.css';

const emit = defineEmits<{ success: [] }>();

const announcementId = ref<number>();
const editingStatus = ref<AnnouncementApi.AnnouncementStatus>();
const publishMode = ref<AnnouncementApi.PublishMode>('IMMEDIATE');

const isEdit = computed(() => !!announcementId.value);
const isPublishedLike = computed(() =>
  editingStatus.value ? isPublishedLikeStatus(editingStatus.value) : false,
);

const publishButtonLabel = computed(() =>
  publishMode.value === 'SCHEDULED'
    ? $t('page.system.announcementPage.actions.publishScheduled')
    : $t('page.system.announcementPage.actions.publishNow'),
);

const modalTitle = computed(() =>
  isEdit.value
    ? $t('page.system.announcementPage.actions.edit')
    : $t('page.system.announcementPage.actions.create'),
);

const [Form, formApi] = useVbenForm({
  handleValuesChange(values) {
    if (
      values.publishMode === 'IMMEDIATE' ||
      values.publishMode === 'SCHEDULED'
    ) {
      publishMode.value = values.publishMode;
    }
  },
  layout: 'vertical',
  schema: useAnnouncementFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-6',
});

function refreshFormSchema() {
  formApi.setState({
    schema: useAnnouncementFormSchema({
      hidePublishOptions: isPublishedLike.value,
    }),
  });
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange(isOpen) {
    if (!isOpen) {
      announcementId.value = undefined;
      editingStatus.value = undefined;
      publishMode.value = 'IMMEDIATE';
      return;
    }
    const data = modalApi.getData<AnnouncementApi.Announcement>();
    announcementId.value = data?.id;
    editingStatus.value = data?.status;
    refreshFormSchema();
    formApi.resetForm();
    if (data) {
      const values = mapAnnouncementToFormValues(data);
      publishMode.value = values.publishMode;
      formApi.setValues(values);
      return;
    }
    publishMode.value = 'IMMEDIATE';
    formApi.setValues({
      publishMode: 'IMMEDIATE',
    });
  },
  showConfirmButton: false,
});

async function submit(saveAction: AnnouncementApi.SaveAction) {
  const values = await formApi.getValues();
  if (!String(values.title ?? '').trim()) {
    message.warning(
      $t('page.system.announcementPage.validation.titleRequired'),
    );
    return;
  }
  if (saveAction !== 'DRAFT') {
    if (isEmptyRichContent(String(values.content ?? ''))) {
      message.warning($t('page.system.announcementPage.validation.required'));
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
  }
  const payload = buildAnnouncementSavePayload(values, saveAction);
  modalApi.lock();
  try {
    if (announcementId.value) {
      await updateAnnouncement(announcementId.value, payload);
      message.success($t('page.system.announcementPage.updateSuccess'));
    } else {
      await createAnnouncement(payload);
      message.success(
        saveAction === 'DRAFT'
          ? $t('page.system.announcementPage.draftSuccess')
          : $t('page.system.announcementPage.publishSuccess'),
      );
    }
    emit('success');
    modalApi.close();
  } catch {
    message.error($t('page.system.announcementPage.saveFailed'));
  } finally {
    modalApi.unlock();
  }
}

async function handleSaveDraft() {
  await submit('DRAFT');
}

async function handleSaveChanges() {
  await submit('SAVE');
}

async function handlePublish() {
  const values = await formApi.getValues();
  if (values.publishMode === 'SCHEDULED' && !values.scheduledAt) {
    message.warning(
      $t('page.system.announcementPage.validation.scheduledAtRequired'),
    );
    return;
  }
  const saveAction =
    values.publishMode === 'SCHEDULED'
      ? 'PUBLISH_SCHEDULED'
      : 'PUBLISH_IMMEDIATE';
  await submit(saveAction);
}
</script>

<template>
  <Modal :title="modalTitle" class="w-full sm:w-[800px]">
    <Form class="system-announcement-form" />
    <template #footer>
      <div class="sys-announcement-form-footer">
        <Button @click="modalApi.close()">
          {{ $t('common.cancel') }}
        </Button>
        <Space :size="8">
          <Button v-if="!isPublishedLike" @click="handleSaveDraft">
            {{ $t('page.system.announcementPage.actions.saveDraft') }}
          </Button>
          <Button
            v-if="isPublishedLike"
            type="primary"
            @click="handleSaveChanges"
          >
            {{ $t('page.system.announcementPage.actions.saveChanges') }}
          </Button>
          <Button v-else type="primary" @click="handlePublish">
            {{ publishButtonLabel }}
          </Button>
        </Space>
      </div>
    </template>
  </Modal>
</template>
