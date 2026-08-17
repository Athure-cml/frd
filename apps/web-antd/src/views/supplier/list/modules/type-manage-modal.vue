<script lang="ts" setup>
import type { SupplierApi } from '#/api/supplier';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Input, message, Space, Table } from 'ant-design-vue';

import {
  createSupplierType,
  deleteSupplierType,
  getSupplierTypeList,
} from '#/api/supplier';
import { $t } from '#/locales';

const emit = defineEmits<{ success: [] }>();

const loading = ref(false);
const creating = ref(false);
const newName = ref('');
const items = ref<SupplierApi.SupplierType[]>([]);

async function loadTypes() {
  loading.value = true;
  try {
    items.value = await getSupplierTypeList();
  } finally {
    loading.value = false;
  }
}

async function onCreate() {
  const name = newName.value.trim();
  if (!name) {
    message.warning($t('page.supplier.type.nameRequired'));
    return;
  }
  creating.value = true;
  try {
    await createSupplierType({ name, status: 1 });
    newName.value = '';
    message.success($t('ui.actionMessage.operationSuccess'));
    await loadTypes();
    emit('success');
  } finally {
    creating.value = false;
  }
}

async function onDelete(row: SupplierApi.SupplierType) {
  if (row.inUse) {
    message.warning($t('page.supplier.type.inUseCannotDelete'));
    return;
  }
  await deleteSupplierType(row.id);
  message.success($t('ui.actionMessage.deleteSuccess', [row.name]));
  await loadTypes();
  emit('success');
}

const [Modal, modalApi] = useVbenModal({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      void loadTypes();
    }
  },
});

defineExpose({
  open: () => modalApi.open(),
});
</script>

<template>
  <Modal class="w-[640px]" :title="$t('page.supplier.type.manage')">
    <div class="mb-3 flex gap-2">
      <Input
        v-model:value="newName"
        :maxlength="64"
        :placeholder="$t('page.supplier.type.namePlaceholder')"
        @press-enter="onCreate"
      />
      <Button :loading="creating" type="primary" @click="onCreate">
        {{ $t('page.supplier.type.add') }}
      </Button>
    </div>
    <Table
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <Table.Column :title="$t('page.supplier.type.name')" data-index="name" />
      <Table.Column
        :title="$t('page.supplier.fields.status')"
        data-index="status"
        :width="88"
      >
        <template #default="{ record }">
          {{
            record.status === 1
              ? $t('page.supplier.status.enabled')
              : $t('page.supplier.status.disabled')
          }}
        </template>
      </Table.Column>
      <Table.Column :title="$t('page.supplier.type.usage')" :width="100">
        <template #default="{ record }">
          {{
            record.inUse
              ? $t('page.supplier.type.inUse')
              : $t('page.supplier.type.unused')
          }}
        </template>
      </Table.Column>
      <Table.Column :title="$t('page.supplier.fields.operation')" :width="100">
        <template #default="{ record }">
          <Space>
            <Button
              danger
              :disabled="record.inUse"
              size="small"
              type="link"
              @click="onDelete(record)"
            >
              {{ $t('common.delete') }}
            </Button>
          </Space>
        </template>
      </Table.Column>
    </Table>
  </Modal>
</template>
