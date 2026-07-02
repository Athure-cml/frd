<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getUsStateList } from '#/api/master-data/us-state';
import {
  createUsStateZip,
  createUsStateZipCity,
  getUsStateZipCityNodes,
  updateUsStateZip,
} from '#/api/master-data/us-state-zip';
import { $t } from '#/locales';

export type UsStateZipFormMode =
  | {
      city: string;
      cityId: number;
      mode: 'editZip';
      stateCode: string;
      zipCode: string;
      zipId: number;
    }
  | { city?: string; cityId?: number; mode: 'createZip'; stateId?: number }
  | { mode: 'createCity'; stateCode?: string; stateId?: number };

const emit = defineEmits<{ success: [] }>();

const formMode = ref<UsStateZipFormMode>();
const stateOptions = ref<{ label: string; value: number }[]>([]);
const cityOptions = ref<{ label: string; value: number }[]>([]);
const loadingCities = ref(false);

const getTitle = computed(() => {
  const mode = formMode.value?.mode;
  if (mode === 'createCity') {
    return $t('page.masterData.actions.createCity');
  }
  if (mode === 'createZip') {
    return $t('page.masterData.actions.createZip');
  }
  return $t('page.masterData.actions.editZip');
});

const contextHint = computed(() => {
  const data = formMode.value;
  if (!data || data.mode !== 'editZip') {
    return '';
  }
  return `${data.stateCode} · ${data.city}`;
});

async function loadStateOptions() {
  const states = await getUsStateList();
  stateOptions.value = states.map((item) => ({
    label: item.code,
    value: item.id,
  }));
}

async function loadCityOptions(stateId?: number) {
  cityOptions.value = [];
  if (!stateId) {
    return;
  }
  loadingCities.value = true;
  try {
    const nodes = await getUsStateZipCityNodes(stateId);
    cityOptions.value = nodes
      .filter((node) => node.cityId && node.city)
      .map((node) => ({
        label: node.city!,
        value: node.cityId!,
      }));
  } finally {
    loadingCities.value = false;
  }
}

function buildSchema(): VbenFormSchema[] {
  const mode = formMode.value?.mode;
  if (mode === 'createCity') {
    const schema: VbenFormSchema[] = [];
    if (!formMode.value?.stateId) {
      schema.push({
        component: 'Select',
        componentProps: {
          class: 'w-full',
          options: stateOptions.value,
          placeholder: '选择州',
          showSearch: true,
        },
        fieldName: 'stateId',
        label: 'State',
        rules: 'required',
      });
    }
    schema.push({
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'name',
      label: 'City',
      rules: 'required',
    });
    return schema;
  }

  if (mode === 'createZip') {
    const schema: VbenFormSchema[] = [];
    if (!formMode.value?.cityId) {
      schema.push(
        {
          component: 'Select',
          componentProps: {
            class: 'w-full',
            options: stateOptions.value,
            placeholder: '选择州',
            showSearch: true,
          },
          fieldName: 'stateId',
          label: 'State',
          rules: 'required',
        },
        {
          component: 'Select',
          componentProps: {
            class: 'w-full',
            loading: loadingCities.value,
            options: cityOptions.value,
            placeholder: '选择城市',
            showSearch: true,
          },
          dependencies: {
            if: (values) => Boolean(values.stateId),
            triggerFields: ['stateId'],
          },
          fieldName: 'cityId',
          label: 'City',
          rules: 'required',
        },
      );
    }
    schema.push({
      component: 'Input',
      componentProps: { maxlength: 32 },
      fieldName: 'zipCode',
      label: 'Zip code',
      rules: 'required',
    });
    return schema;
  }

  return [
    {
      component: 'Input',
      componentProps: { maxlength: 32 },
      fieldName: 'zipCode',
      label: 'Zip code',
      rules: 'required',
    },
  ];
}

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    if (
      formMode.value?.mode === 'createZip' &&
      !formMode.value.cityId &&
      fieldsChanged.includes('stateId')
    ) {
      loadCityOptions(values.stateId).then(() => {
        formApi.setState({ schema: buildSchema() });
        formApi.setValues({ cityId: undefined });
      });
    }
  },
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid || !formMode.value) {
      return;
    }
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      const data = formMode.value;
      if (data.mode === 'createCity') {
        const stateId = data.stateId ?? Number(values.stateId);
        await createUsStateZipCity({ name: values.name.trim(), stateId });
      } else if (data.mode === 'createZip') {
        const cityId = data.cityId ?? Number(values.cityId);
        await createUsStateZip({
          cityId,
          zipCode: values.zipCode.trim(),
        });
      } else {
        await updateUsStateZip(data.zipId, {
          cityId: data.cityId,
          zipCode: values.zipCode.trim(),
        });
      }
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
    const data = modalApi.getData<UsStateZipFormMode>();
    formMode.value = data;
    cityOptions.value = [];
    await loadStateOptions();
    formApi.resetForm();
    formApi.setState({ schema: buildSchema() });
    if (data?.mode === 'createCity' && data.stateId) {
      formApi.setValues({ stateId: data.stateId });
    }
    if (data?.mode === 'createZip') {
      if (data.stateId) {
        await loadCityOptions(data.stateId);
        formApi.setValues({ stateId: data.stateId });
      }
      if (data.cityId) {
        formApi.setValues({ cityId: data.cityId });
      }
      formApi.setState({ schema: buildSchema() });
    }
    if (data?.mode === 'editZip') {
      formApi.setValues({ zipCode: data.zipCode });
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[480px]">
    <p v-if="contextHint" class="mb-3 text-sm text-muted-foreground">
      {{ contextHint }}
    </p>
    <Form class="px-1" />
  </Modal>
</template>
