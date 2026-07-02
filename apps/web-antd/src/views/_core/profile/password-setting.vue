<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';

import { VbenInputPassword } from '@vben/common-ui';
import { $t as $tAuth } from '@vben/locales';

import { Button, Form, FormItem, Input, message } from 'ant-design-vue';

import { changePasswordApi } from '#/api';
import { $t } from '#/locales';

import { profileContextKey } from './profile-context';

import './profile.css';

const profileContext = inject(profileContextKey);

const submitting = ref(false);
const formState = reactive({
  confirmPassword: '',
  newPassword: '',
  oldPassword: '',
});

const confirmMismatch = computed(
  () =>
    Boolean(formState.confirmPassword) &&
    formState.confirmPassword !== formState.newPassword,
);

const confirmMatched = computed(
  () =>
    Boolean(formState.confirmPassword) &&
    formState.confirmPassword === formState.newPassword,
);

const confirmValidateStatus = computed(() => {
  if (confirmMismatch.value) {
    return 'error' as const;
  }
  if (confirmMatched.value) {
    return 'success' as const;
  }
  return undefined;
});

const confirmHelp = computed(() => {
  if (confirmMismatch.value) {
    return $t('page.profile.password.confirmMismatch');
  }
  if (confirmMatched.value) {
    return $t('page.profile.password.confirmMatched');
  }
  return undefined;
});

function resetForm() {
  formState.oldPassword = '';
  formState.newPassword = '';
  formState.confirmPassword = '';
}

async function handleSubmit() {
  if (!formState.oldPassword) {
    message.warning($t('page.profile.password.oldPlaceholder'));
    return;
  }
  if (!formState.newPassword) {
    message.warning($t('page.profile.password.newPlaceholder'));
    return;
  }
  if (formState.newPassword.length < 6) {
    message.warning($t('page.profile.password.minLength'));
    return;
  }
  if (!formState.confirmPassword) {
    message.warning($t('page.profile.password.confirmRequired'));
    return;
  }
  if (confirmMismatch.value) {
    message.warning($t('page.profile.password.confirmMismatch'));
    return;
  }

  submitting.value = true;
  try {
    await changePasswordApi({
      newPassword: formState.newPassword,
      oldPassword: formState.oldPassword,
    });
    message.success($t('page.profile.updatePasswordSuccess'));
    resetForm();
    await profileContext?.reloadProfile();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Form
    class="profile-password-form"
    :colon="false"
    :label-col="{ style: { width: '100px' } }"
    :wrapper-col="{ style: { flex: 1, maxWidth: '420px' } }"
    layout="horizontal"
  >
    <FormItem :label="$t('page.profile.password.old')">
      <Input.Password
        v-model:value="formState.oldPassword"
        autocomplete="current-password"
        :placeholder="$t('page.profile.password.oldPlaceholder')"
      />
    </FormItem>

    <FormItem :label="$t('page.profile.password.new')">
      <VbenInputPassword
        v-model="formState.newPassword"
        password-strength
        :placeholder="$t('page.profile.password.newPlaceholder')"
      >
        <template #strengthText>
          {{ $tAuth('authentication.passwordStrength') }}
        </template>
      </VbenInputPassword>
    </FormItem>

    <FormItem
      :help="confirmHelp"
      :label="$t('page.profile.password.confirm')"
      :validate-status="confirmValidateStatus"
    >
      <VbenInputPassword
        v-model="formState.confirmPassword"
        :placeholder="$t('page.profile.password.confirmPlaceholder')"
      />
    </FormItem>

    <FormItem
      class="profile-password-form__actions"
      :label-col="{ style: { width: '100px' } }"
      :wrapper-col="{ style: { flex: 1, maxWidth: '420px' } }"
    >
      <div class="profile-password-form__actions-inner">
        <Button :loading="submitting" type="primary" @click="handleSubmit">
          {{ $t('page.profile.password.submit') }}
        </Button>
      </div>
    </FormItem>
  </Form>
</template>
