<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import type { SystemPermissionApi } from '#/api/system/permission';
import type { SystemRoleApi } from '#/api/system/role';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Checkbox, message, Spin, Tree } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getPermissionList } from '#/api/system/permission';
import { createRole, updateRole } from '#/api/system/role';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import {
  buildPermissionTree,
  collectPermissionLeafCodes,
  collectPermissionTreeExpandableKeys,
  filterCheckedPermissionCodes,
} from '../../shared/permission-tree';
import {
  rowToRoleFormValues,
  toRoleSavePayload,
  useRoleFormSchema,
} from '../data';

const emit = defineEmits<{ success: [] }>();

const { canViewInternalCodes } = useInternalCodeVisibility();

const roleId = ref<number>();
const isBuiltin = ref(false);
const permissions = ref<SystemPermissionApi.Permission[]>([]);
const loadingPermissions = ref(false);
const expandedKeys = ref<string[]>([]);
const showPermissionCodes = ref(false);

const permissionTree = computed(() => buildPermissionTree(permissions.value));

const leafCodeSet = computed(
  () => new Set(collectPermissionLeafCodes(permissions.value)),
);

watch(
  permissionTree,
  (tree) => {
    expandedKeys.value = collectPermissionTreeExpandableKeys(tree);
  },
  { immediate: true },
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useRoleFormSchema(false),
  showDefaultActions: false,
  wrapperClass: 'role-form-grid grid-cols-1 sm:grid-cols-2',
});

const getTitle = computed(() =>
  roleId.value
    ? $t('page.system.actions.editRole')
    : $t('page.system.actions.createRole'),
);

async function loadPermissions() {
  if (permissions.value.length > 0) {
    return;
  }
  loadingPermissions.value = true;
  try {
    permissions.value = await getPermissionList();
  } finally {
    loadingPermissions.value = false;
  }
}

function isPermissionLeaf(key: Key) {
  return leafCodeSet.value.has(String(key));
}

function onPermissionCheck(
  checked: Key[] | { checked: Key[]; halfChecked: Key[] },
  onUpdate?: (value: string[]) => void,
) {
  const keys = Array.isArray(checked) ? checked : checked.checked;
  onUpdate?.(filterCheckedPermissionCodes(keys, leafCodeSet.value));
}

function expandAllPermissions() {
  expandedKeys.value = collectPermissionTreeExpandableKeys(
    permissionTree.value,
  );
}

function collapseAllPermissions() {
  expandedKeys.value = [];
}

function selectAllPermissions(onUpdate?: (value: string[]) => void) {
  onUpdate?.(collectPermissionLeafCodes(permissions.value));
}

function clearAllPermissions(onUpdate?: (value: string[]) => void) {
  onUpdate?.([]);
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
      const payload = toRoleSavePayload(values);
      if (roleId.value) {
        await updateRole(roleId.value, payload);
      } else {
        await createRole(payload);
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
      showPermissionCodes.value = false;
      return;
    }
    const data = drawerApi.getData<SystemRoleApi.SystemRole>();
    roleId.value = data?.id;
    isBuiltin.value = data?.code === 'super_admin';
    formApi.setState({
      schema: useRoleFormSchema(isBuiltin.value),
    });
    formApi.resetForm();
    await loadPermissions();
    await nextTick();
    if (data) {
      formApi.setValues(rowToRoleFormValues(data));
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="system-drawer-form system-role-form px-1">
      <template #permissionCodes="{ componentField }">
        <Spin :spinning="loadingPermissions" class="sys-perm-spin">
          <div class="sys-perm-panel">
            <div class="sys-perm-tree-toolbar">
              <Button size="small" type="link" @click="expandAllPermissions">
                {{ $t('page.system.permissionTree.expandAll') }}
              </Button>
              <Button size="small" type="link" @click="collapseAllPermissions">
                {{ $t('page.system.permissionTree.collapseAll') }}
              </Button>
              <span
                aria-hidden="true"
                class="sys-perm-tree-toolbar__divider"
              ></span>
              <Button
                size="small"
                type="link"
                @click="
                  selectAllPermissions(componentField['onUpdate:modelValue'])
                "
              >
                {{ $t('page.system.permissionTree.selectAll') }}
              </Button>
              <Button
                size="small"
                type="link"
                @click="
                  clearAllPermissions(componentField['onUpdate:modelValue'])
                "
              >
                {{ $t('page.system.permissionTree.clearAll') }}
              </Button>
              <Checkbox
                v-if="canViewInternalCodes"
                v-model:checked="showPermissionCodes"
                class="sys-perm-tree-toolbar__codes"
              >
                {{ $t('page.system.permissionShowCodes') }}
              </Checkbox>
            </div>

            <div class="sys-perm-tree-scroll">
              <Tree
                block-node
                checkable
                class="sys-perm-tree"
                :checked-keys="componentField.modelValue ?? []"
                :expanded-keys="expandedKeys"
                :tree-data="permissionTree"
                @check="
                  (keys) =>
                    onPermissionCheck(
                      keys,
                      componentField['onUpdate:modelValue'],
                    )
                "
                @expand="(keys) => (expandedKeys = keys as string[])"
              >
                <template #title="node">
                  <span
                    class="sys-perm-tree-node"
                    :class="{
                      'sys-perm-tree-node--leaf': isPermissionLeaf(node.key),
                    }"
                  >
                    <span>{{ node.title }}</span>
                    <span
                      v-if="
                        isPermissionLeaf(node.key) &&
                        canViewInternalCodes &&
                        showPermissionCodes
                      "
                      class="sys-perm-code"
                    >
                      ({{ node.key }})
                    </span>
                  </span>
                </template>
              </Tree>
            </div>
          </div>
        </Spin>
      </template>
    </Form>
  </Drawer>
</template>
