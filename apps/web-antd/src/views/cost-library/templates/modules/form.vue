<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createCostTableTemplate,
  getCostTableTemplate,
  updateCostTableTemplate,
} from '#/api/cost/templates';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import {
  cloneLayout,
  countLayoutFields,
  createDefaultLayout,
  resolveTemplateDisplayName,
} from '../../shared/template-layout-utils';
import { saveTemplateId } from '../../shared/use-table-templates';
import LayoutEditor from './layout-editor.vue';

const emit = defineEmits<{ success: [] }>();

const { canViewInternalCodes } = useInternalCodeVisibility();

const templateId = ref<number>();
const rawTemplateName = ref('');
const layout = ref(createDefaultLayout('road'));
const formMode = ref<CostMode>('road');

const layoutFieldCount = computed(() =>
  countLayoutFields(formMode.value, layout.value),
);

const getTitle = computed(() =>
  templateId.value
    ? $t('page.costLibrary.template.editTitle')
    : $t('page.costLibrary.template.createTitle'),
);

function buildFormSchema(showInternalCode: boolean): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: [
          { label: $t('page.costLibrary.road'), value: 'road' },
          { label: $t('page.costLibrary.sea'), value: 'sea' },
          { label: $t('page.costLibrary.fumigation'), value: 'fumigation' },
        ],
      },
      dependencies: {
        disabled: () => true,
        triggerFields: ['mode'],
      },
      fieldName: 'mode',
      label: $t('page.costLibrary.template.fields.mode'),
      rules: 'required',
    },
  ];
  if (showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: { autocomplete: 'off', disabled: true },
      dependencies: {
        if: () => !!templateId.value,
        triggerFields: ['code'],
      },
      fieldName: 'code',
      label: $t('page.costLibrary.template.fields.code'),
    });
  }
  schema.push(
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'name',
      label: $t('page.costLibrary.template.fields.name'),
      rules: 'required',
    },
    {
      component: 'Switch',
      fieldName: 'isDefault',
      label: $t('page.costLibrary.template.fields.isDefault'),
    },
  );
  return schema;
}

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    if (!templateId.value && fieldsChanged.includes('mode') && values.mode) {
      const mode = values.mode as CostMode;
      formMode.value = mode;
      layout.value = createDefaultLayout(mode);
    }
  },
  layout: 'vertical',
  schema: buildFormSchema(canViewInternalCodes.value),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    if (layoutFieldCount.value === 0) {
      message.warning($t('page.costLibrary.template.layoutEmpty'));
      return;
    }

    drawerApi.lock();
    try {
      const values = await formApi.getValues();
      const displayName = String(values.name ?? '').trim();
      const name =
        displayName === resolveTemplateDisplayName(rawTemplateName.value)
          ? rawTemplateName.value || displayName
          : displayName;
      const payload = {
        isDefault: !!values.isDefault,
        layout: layout.value,
        mode: values.mode as CostMode,
        name,
      };
      let savedId = templateId.value;
      if (templateId.value) {
        const result = await updateCostTableTemplate(templateId.value, payload);
        savedId = result.id;
      } else {
        const result = await createCostTableTemplate(payload);
        savedId = result.id;
      }
      if (payload.isDefault && savedId) {
        saveTemplateId(payload.mode, savedId);
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData<
      CostTableTemplate | undefined | { mode?: CostMode }
    >();
    templateId.value = data && 'id' in data ? data.id : undefined;
    formApi.setState({ schema: buildFormSchema(canViewInternalCodes.value) });

    if (templateId.value) {
      const detail = await getCostTableTemplate(templateId.value);
      formMode.value = detail.mode;
      layout.value = cloneLayout(detail.layout);
      rawTemplateName.value = detail.name;
      await formApi.setValues({
        code: detail.code,
        isDefault: detail.isDefault,
        mode: detail.mode,
        name: resolveTemplateDisplayName(detail.name),
      });
      return;
    }

    rawTemplateName.value = '';

    const mode = data?.mode ?? 'road';
    formMode.value = mode;
    layout.value = createDefaultLayout(mode);
    await formApi.setValues({
      code: '',
      isDefault: false,
      mode,
      name: '',
    });
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="template-drawer-form" />
    <section class="template-drawer-section">
      <div class="template-drawer-section__head">
        <h3 class="template-drawer-section__title">
          {{ $t('page.costLibrary.template.layoutTitle') }}
        </h3>
        <span class="template-drawer-section__count">
          {{ $t('page.costLibrary.template.fields.columnCount') }}:
          {{ layoutFieldCount }}
        </span>
      </div>
      <LayoutEditor v-model="layout" :mode="formMode" />
    </section>
  </Drawer>
</template>
