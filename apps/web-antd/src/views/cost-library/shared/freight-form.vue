<script lang="ts" setup>
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { seaCostApi } from '#/api/cost';
import { resolveDefaultCurrencyCode } from '#/api/currency';
import { $t } from '#/locales';

import {
  buildTemplateFormSchema,
  extractExtraFields,
  mergeRecordWithExtraFields,
} from '../shared/build-template-form-schema';
import {
  rowToFreightFormValues,
  toFreightSavePayload,
  useFreightFormSchema,
} from '../shared/freight-schema';
import { getDefaultTemplate } from './default-templates';

const props = defineProps<{
  mode: 'sea';
}>();

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const api = seaCostApi;
const activeTemplate = ref<CostTableTemplate>(getDefaultTemplate(props.mode));

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFreightFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const getTitle = computed(() =>
  recordId.value
    ? $t('page.costLibrary.actions.editRecord')
    : $t('page.costLibrary.actions.createRecord', [
        $t('page.costLibrary.seaRecord'),
      ]),
);

function applyTemplateSchema(template?: CostTableTemplate) {
  activeTemplate.value = template ?? getDefaultTemplate(props.mode);
  formApi.setState({
    schema: buildTemplateFormSchema(
      props.mode,
      activeTemplate.value,
      useFreightFormSchema(),
    ),
  });
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = await formApi.getValues();
      const payload = {
        ...toFreightSavePayload(values),
        extraFields: extractExtraFields(values),
      };
      if (recordId.value) {
        await api.update(recordId.value, payload);
      } else {
        await api.create(payload);
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    void (async () => {
      const data = drawerApi.getData<
        FreightCostRecord & { template?: CostTableTemplate }
      >();
      recordId.value = data?.id;
      applyTemplateSchema(data?.template);
      formApi.resetForm();
      if (data?.id) {
        formApi.setValues(
          mergeRecordWithExtraFields(rowToFreightFormValues(data)),
        );
        return;
      }
      const defaultCurrency = await resolveDefaultCurrencyCode({
        mode: props.mode,
      });
      formApi.setValues({ currency: defaultCurrency, extraFields: {} });
    })();
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="cost-drawer-form px-1" />
  </Drawer>
</template>
