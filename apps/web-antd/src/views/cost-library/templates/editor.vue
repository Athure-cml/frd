<script lang="ts" setup>
import type { CostMode, CostTableTemplateLayout } from '#/api/cost';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { ArrowLeft, Download, Pin, Save, Undo2 } from '@vben/icons';
import { downloadFileFromBlob } from '@vben/utils';

import { Button, Form, Input, message, Modal, Tag } from 'ant-design-vue';

import {
  createCostTableTemplate,
  exportCostTableTemplate,
  exportCostTableTemplatePreview,
  getCostTableTemplate,
  setDefaultCostTableTemplate,
  updateCostTableTemplate,
} from '#/api/cost/templates';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import {
  cloneLayout,
  countLayoutFields,
  createDefaultLayout,
  resolveTemplateDisplayName,
} from '../shared/template-layout-utils';
import { saveTemplateId } from '../shared/use-table-templates';
import FieldPanel from './modules/field-panel.vue';
import PreviewTable from './modules/preview-table.vue';

import './template-editor.css';

const COST_MODES: CostMode[] = new Set(['fumigation', 'road', 'sea']);

const route = useRoute();
const router = useRouter();
const { canViewInternalCodes } = useInternalCodeVisibility();

const saving = ref(false);
const applying = ref(false);
const templateId = ref<number>();
const rawTemplateName = ref('');
const code = ref('');
const name = ref('');
const isDefault = ref(false);
const layout = ref<CostTableTemplateLayout>(createDefaultLayout('road'));
const metaTouched = ref(false);

interface EditorSnapshot {
  code: string;
  isDefault: boolean;
  layout: CostTableTemplateLayout;
  name: string;
}

let initialSnapshot: EditorSnapshot | null = null;

const mode = computed<CostMode>(() => {
  const value = route.params.mode as CostMode;
  return COST_MODES.has(value) ? value : 'road';
});

const isCreate = computed(() => route.name === 'CostTemplateCreate');

const pageTitle = computed(() =>
  isCreate.value
    ? $t('page.costLibrary.template.createTitle')
    : $t('page.costLibrary.template.editTitle'),
);

const modeLabel = computed(() => $t(`page.costLibrary.${mode.value}`));

const fieldCount = computed(() => countLayoutFields(mode.value, layout.value));

function isSnapshotEqual(a: EditorSnapshot, b: EditorSnapshot) {
  return (
    a.code === b.code &&
    a.name === b.name &&
    a.isDefault === b.isDefault &&
    JSON.stringify(a.layout) === JSON.stringify(b.layout)
  );
}

const isDirty = computed(() => {
  if (!initialSnapshot) {
    return false;
  }
  return !isSnapshotEqual(takeSnapshot(), initialSnapshot);
});

const nameError = computed(() => metaTouched.value && !name.value.trim());

function touchMeta() {
  metaTouched.value = true;
}

function validateMeta() {
  metaTouched.value = true;
  return Boolean(name.value.trim());
}

function takeSnapshot(): EditorSnapshot {
  return {
    code: code.value,
    isDefault: isDefault.value,
    layout: cloneLayout(layout.value),
    name: name.value,
  };
}

function applySnapshot(snapshot: EditorSnapshot) {
  code.value = snapshot.code;
  name.value = snapshot.name;
  isDefault.value = snapshot.isDefault;
  layout.value = cloneLayout(snapshot.layout);
}

function goBack() {
  router.push(`/cost-library/templates/${mode.value}`);
}

async function loadTemplate(id: number) {
  const detail = await getCostTableTemplate(id);
  templateId.value = detail.id;
  rawTemplateName.value = detail.name;
  code.value = detail.code;
  name.value = resolveTemplateDisplayName(detail.name);
  isDefault.value = detail.isDefault;
  layout.value = cloneLayout(detail.layout);
  initialSnapshot = takeSnapshot();
}

async function initEditor() {
  try {
    if (isCreate.value) {
      templateId.value = undefined;
      rawTemplateName.value = '';
      code.value = '';
      name.value = '';
      isDefault.value = false;
      layout.value = createDefaultLayout(mode.value);
      initialSnapshot = takeSnapshot();
      return;
    }

    const id = Number(route.params.id);
    if (!Number.isFinite(id)) {
      goBack();
      return;
    }
    await loadTemplate(id);
  } catch (error) {
    console.error(error);
    message.error($t('ui.actionMessage.operationFailed'));
  }
}

function onReset() {
  if (!initialSnapshot) {
    return;
  }
  applySnapshot(initialSnapshot);
  message.success($t('page.costLibrary.template.resetSuccess'));
}

async function onExport() {
  if (!validateMeta()) {
    message.warning($t('page.costLibrary.template.metaRequired'));
    return;
  }
  if (fieldCount.value === 0) {
    message.warning($t('page.costLibrary.template.layoutEmpty'));
    return;
  }

  try {
    const payload = buildSavePayload();
    const blob = templateId.value
      ? await exportCostTableTemplate(templateId.value)
      : await exportCostTableTemplatePreview(payload);
    const exportBase = canViewInternalCodes.value
      ? code.value || mode.value
      : resolveTemplateDisplayName(
          name.value.trim() || rawTemplateName.value,
        ) || mode.value;
    downloadFileFromBlob({
      fileName: templateId.value
        ? `${exportBase}-template.xlsx`
        : `${mode.value}-template-preview.xlsx`,
      source: blob as Blob,
    });
    message.success($t('page.costLibrary.template.exportSuccess'));
  } catch (error) {
    console.error(error);
    message.error($t('ui.actionMessage.operationFailed'));
  }
}

function buildSavePayload() {
  const displayName = name.value.trim();
  const resolvedName =
    displayName === resolveTemplateDisplayName(rawTemplateName.value)
      ? rawTemplateName.value || displayName
      : displayName;
  return {
    isDefault: isDefault.value,
    layout: layout.value,
    mode: mode.value,
    name: resolvedName,
  };
}

async function persistTemplate() {
  if (!validateMeta()) {
    message.warning($t('page.costLibrary.template.metaRequired'));
    return false;
  }
  if (fieldCount.value === 0) {
    message.warning($t('page.costLibrary.template.layoutEmpty'));
    return false;
  }

  saving.value = true;
  try {
    const payload = buildSavePayload();
    let savedId = templateId.value;
    if (templateId.value) {
      const result = await updateCostTableTemplate(templateId.value, payload);
      savedId = result.id;
      rawTemplateName.value = result.name;
    } else {
      const result = await createCostTableTemplate(payload);
      savedId = result.id;
      templateId.value = result.id;
      code.value = result.code;
      rawTemplateName.value = result.name;
      await router.replace({
        name: 'CostTemplateEdit',
        params: { id: String(result.id), mode: mode.value },
      });
    }
    if (payload.isDefault && savedId) {
      saveTemplateId(mode.value, savedId);
    }
    initialSnapshot = takeSnapshot();
    return true;
  } catch (error) {
    console.error(error);
    message.error($t('ui.actionMessage.operationFailed'));
    return false;
  } finally {
    saving.value = false;
  }
}

async function onSave() {
  const saved = await persistTemplate();
  if (saved) {
    message.success($t('ui.actionMessage.operationSuccess'));
  }
}

async function applyTemplateAsDefault() {
  if (!templateId.value) {
    return;
  }
  applying.value = true;
  try {
    await setDefaultCostTableTemplate(templateId.value);
    saveTemplateId(mode.value, templateId.value);
    isDefault.value = true;
    if (initialSnapshot) {
      initialSnapshot = { ...initialSnapshot, isDefault: true };
    }
    message.success($t('page.costLibrary.template.applySuccess'));
  } finally {
    applying.value = false;
  }
}

async function onApply() {
  if (!templateId.value) {
    message.warning($t('page.costLibrary.template.applyNeedSave'));
    return;
  }
  if (isDirty.value) {
    Modal.confirm({
      cancelText: $t('common.cancel'),
      content: $t('page.costLibrary.template.applyUnsavedWarning'),
      okText: $t('page.costLibrary.template.saveAndApply'),
      onOk: async () => {
        const saved = await persistTemplate();
        if (saved) {
          await applyTemplateAsDefault();
        }
      },
      title: $t('common.prompt'),
    });
    return;
  }
  await applyTemplateAsDefault();
}

onMounted(initEditor);
</script>

<template>
  <Page
    auto-content-height
    class="tpl-editor-page"
    content-class="tpl-editor-page__content"
  >
    <div class="tpl-editor-shell">
      <header class="tpl-editor-toolbar tpl-card">
        <div class="tpl-editor-toolbar__top">
          <div class="tpl-editor-toolbar__nav">
            <Button class="tpl-editor-toolbar__back" @click="goBack">
              <ArrowLeft class="size-4" />
              {{ $t('page.costLibrary.template.backToList') }}
            </Button>
            <div class="tpl-editor-toolbar__heading">
              <h2 class="tpl-editor-toolbar__title">{{ pageTitle }}</h2>
              <Tag class="tpl-editor-toolbar__mode" color="processing">
                {{ modeLabel }}
              </Tag>
            </div>
          </div>

          <div class="tpl-editor-toolbar__actions">
            <Button @click="onReset">
              <template #icon>
                <Undo2 class="size-4" />
              </template>
              {{ $t('page.costLibrary.template.resetLayout') }}
            </Button>
            <Button @click="onExport">
              <template #icon>
                <Download class="size-4" />
              </template>
              {{ $t('page.costLibrary.template.exportLayout') }}
            </Button>
            <Button :loading="applying" @click="onApply">
              <template #icon>
                <Pin class="size-4" />
              </template>
              {{ $t('page.costLibrary.template.applyTemplate') }}
            </Button>
            <Button :loading="saving" type="primary" @click="onSave">
              <template #icon>
                <Save class="size-4" />
              </template>
              {{ $t('page.costLibrary.template.saveTemplate') }}
            </Button>
          </div>
        </div>

        <div class="tpl-editor-toolbar__meta">
          <Form class="tpl-editor-meta-form" layout="inline" :colon="false">
            <Form.Item
              v-if="!isCreate && canViewInternalCodes"
              class="tpl-editor-meta-form__item"
              :label="$t('page.costLibrary.template.fields.code')"
            >
              <Input v-model:value="code" disabled size="small" />
            </Form.Item>
            <Form.Item
              class="tpl-editor-meta-form__item"
              :label="$t('page.costLibrary.template.fields.name')"
              required
              :validate-status="nameError ? 'error' : ''"
            >
              <Input
                v-model:value="name"
                :placeholder="$t('page.costLibrary.template.namePlaceholder')"
                size="small"
                @blur="touchMeta"
              />
            </Form.Item>
          </Form>

          <span class="tpl-editor-toolbar__count">
            {{ $t('page.costLibrary.template.fields.columnCount') }}:
            <strong>{{ fieldCount }}</strong>
          </span>
        </div>
      </header>

      <div class="tpl-editor-body">
        <aside class="tpl-editor-sidebar tpl-card">
          <div class="tpl-editor-sidebar__head">
            <h3>{{ $t('page.costLibrary.template.layoutTitle') }}</h3>
            <span>{{ $t('page.costLibrary.template.layoutHintEditor') }}</span>
          </div>
          <div class="tpl-editor-sidebar__body">
            <FieldPanel v-model="layout" :mode="mode" />
          </div>
        </aside>

        <main class="tpl-editor-main tpl-card">
          <PreviewTable :layout="layout" :mode="mode" />
        </main>
      </div>
    </div>
  </Page>
</template>
