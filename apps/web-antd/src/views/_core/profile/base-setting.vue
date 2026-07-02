<script setup lang="ts">
import type { ProfileEditForm } from './profile-utils';

import type { UserProfileApi } from '#/api';

import { computed, inject, reactive, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Space,
} from 'ant-design-vue';

import { updateProfileApi } from '#/api';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';

import { profileContextKey } from './profile-context';
import {
  displayValue,
  formatRoleLabels,
  isProfileEditDirty,
  isValidEmail,
  isValidPhone,
} from './profile-utils';

import './profile.css';

interface ProfileView {
  deptName: string;
  email: string;
  phone: string;
  realName: string;
  roleLabels: string;
  username: string;
}

interface FieldItem {
  empty?: boolean;
  key: string;
  label: string;
  value: string;
}

const profileContext = inject(profileContextKey);
if (!profileContext) {
  throw new Error('profileContext is not provided');
}

const authStore = useAuthStore();
const userStore = useUserStore();

const editing = ref(false);
const submitting = ref(false);
const profile = ref<ProfileView>(createEmptyProfile());
const editSnapshot = ref<ProfileEditForm>(createEmptyEditForm());
const editForm = reactive<ProfileEditForm>(createEmptyEditForm());

const accountFields = computed<FieldItem[]>(() => [
  {
    empty: !profile.value.realName,
    key: 'realName',
    label: $t('page.profile.fields.realName'),
    value: displayValue(profile.value.realName),
  },
  {
    key: 'username',
    label: $t('page.profile.fields.username'),
    value: displayValue(profile.value.username),
  },
  {
    key: 'dept',
    label: $t('page.profile.fields.dept'),
    value: displayValue(profile.value.deptName),
  },
  {
    key: 'roles',
    label: $t('page.profile.fields.roles'),
    value: displayValue(profile.value.roleLabels),
  },
]);

const contactFields = computed<FieldItem[]>(() => [
  {
    empty: !profile.value.phone,
    key: 'phone',
    label: $t('page.profile.fields.phone'),
    value: displayValue(profile.value.phone),
  },
  {
    empty: !profile.value.email,
    key: 'email',
    label: $t('page.profile.fields.email'),
    value: displayValue(profile.value.email),
  },
]);

function createEmptyProfile(): ProfileView {
  return {
    deptName: '',
    email: '',
    phone: '',
    realName: '',
    roleLabels: '',
    username: '',
  };
}

function createEmptyEditForm(): ProfileEditForm {
  return {
    email: '',
    phone: '',
    realName: '',
  };
}

function mapProfile(data: UserProfileApi.UserInfoDetail): ProfileView {
  return {
    deptName: data.dept?.name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    realName: data.realName,
    roleLabels: formatRoleLabels(data.roleNames, data.roles),
    username: data.username,
  };
}

function syncProfileFromContext() {
  if (!profileContext.profileData.value) {
    return;
  }
  profile.value = mapProfile(profileContext.profileData.value);
}

watch(
  () => profileContext.profileData.value,
  () => syncProfileFromContext(),
  { immediate: true },
);

function fillEditForm() {
  editForm.realName = profile.value.realName;
  editForm.phone = profile.value.phone;
  editForm.email = profile.value.email;
  editSnapshot.value = {
    email: editForm.email,
    phone: editForm.phone,
    realName: editForm.realName,
  };
}

function startEdit() {
  fillEditForm();
  editing.value = true;
}

function closeEdit() {
  editing.value = false;
}

function cancelEdit() {
  if (!isProfileEditDirty(editForm, editSnapshot.value)) {
    closeEdit();
    return;
  }

  Modal.confirm({
    cancelText: $t('common.cancel'),
    content: $t('page.profile.discardConfirm'),
    okText: $t('common.confirm'),
    title: $t('page.profile.discardTitle'),
    onOk: closeEdit,
  });
}

watch(
  () => profileContext.requestBasicEdit.value,
  (shouldEdit) => {
    if (!shouldEdit) {
      return;
    }
    startEdit();
    profileContext.requestBasicEdit.value = false;
  },
  { immediate: true },
);

async function handleSave() {
  const realName = editForm.realName.trim();
  if (!realName) {
    message.warning($t('page.profile.fields.realNameRequired'));
    return;
  }

  const phone = editForm.phone.trim();
  if (!isValidPhone(phone)) {
    message.warning($t('page.profile.fields.phoneInvalid'));
    return;
  }

  const email = editForm.email.trim();
  if (!isValidEmail(email)) {
    message.warning($t('page.profile.fields.emailInvalid'));
    return;
  }

  submitting.value = true;
  try {
    const userInfo = await updateProfileApi({
      email: email || undefined,
      phone: phone || undefined,
      realName,
    });
    userStore.setUserInfo(userInfo);
    await authStore.fetchUserInfo();
    await profileContext.reloadProfile();
    closeEdit();
    message.success($t('page.profile.updateProfileSuccess'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="profile-base">
    <div class="profile-base__toolbar">
      <Button v-if="!editing" type="primary" @click="startEdit">
        {{ $t('page.profile.edit') }}
      </Button>
      <Space v-else>
        <Button @click="cancelEdit">{{ $t('common.cancel') }}</Button>
        <Button :loading="submitting" type="primary" @click="handleSave">
          {{ $t('page.profile.save') }}
        </Button>
      </Space>
    </div>

    <template v-if="!editing">
      <section class="profile-section">
        <h3 class="profile-section__title">
          {{ $t('page.profile.sections.account') }}
        </h3>
        <dl class="profile-field-list">
          <div
            v-for="field in accountFields"
            :key="field.key"
            class="profile-field"
          >
            <dt class="profile-field__label">{{ field.label }}</dt>
            <dd
              class="profile-field__value"
              :class="{ 'profile-field__value--empty': field.empty }"
            >
              {{ field.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="profile-section">
        <h3 class="profile-section__title">
          {{ $t('page.profile.sections.contact') }}
        </h3>
        <dl class="profile-field-list">
          <div
            v-for="field in contactFields"
            :key="field.key"
            class="profile-field"
          >
            <dt class="profile-field__label">{{ field.label }}</dt>
            <dd
              class="profile-field__value"
              :class="{ 'profile-field__value--empty': field.empty }"
            >
              {{ field.value }}
            </dd>
          </div>
        </dl>
      </section>
    </template>

    <Form
      v-else
      class="profile-edit-form"
      :colon="false"
      :label-col="{ style: { width: '100px' } }"
      :wrapper-col="{ style: { flex: 1 } }"
      layout="horizontal"
    >
      <section class="profile-section">
        <h3 class="profile-section__title">
          {{ $t('page.profile.sections.account') }}
        </h3>
        <FormItem :label="$t('page.profile.fields.realName')" required>
          <Input
            v-model:value="editForm.realName"
            :maxlength="64"
            :placeholder="$t('page.profile.fields.realNamePlaceholder')"
          />
        </FormItem>

        <div class="profile-field">
          <div class="profile-field__label">
            {{ $t('page.profile.fields.username') }}
          </div>
          <div class="profile-field__value">
            {{ displayValue(profile.username) }}
          </div>
        </div>

        <div class="profile-field">
          <div class="profile-field__label">
            {{ $t('page.profile.fields.dept') }}
          </div>
          <div class="profile-field__value">
            {{ displayValue(profile.deptName) }}
          </div>
        </div>

        <div class="profile-field">
          <div class="profile-field__label">
            {{ $t('page.profile.fields.roles') }}
          </div>
          <div class="profile-field__value">
            {{ displayValue(profile.roleLabels) }}
          </div>
        </div>
      </section>

      <section class="profile-section">
        <h3 class="profile-section__title">
          {{ $t('page.profile.sections.contact') }}
        </h3>
        <FormItem :label="$t('page.profile.fields.phone')">
          <Input
            v-model:value="editForm.phone"
            :maxlength="11"
            :placeholder="$t('page.profile.fields.phonePlaceholder')"
          />
        </FormItem>

        <FormItem :label="$t('page.profile.fields.email')">
          <Input
            v-model:value="editForm.email"
            :maxlength="128"
            :placeholder="$t('page.profile.fields.emailPlaceholder')"
          />
        </FormItem>
      </section>
    </Form>
  </div>
</template>
