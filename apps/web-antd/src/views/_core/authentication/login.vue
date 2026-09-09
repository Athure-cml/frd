<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, markRaw } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const isDev = import.meta.env.DEV;
const devUsername = import.meta.env.VITE_DEV_LOGIN_USERNAME || 'vben';
const devPassword = import.meta.env.VITE_DEV_LOGIN_PASSWORD || '123456';

const formSchema = computed((): VbenFormSchema[] => {
  const usernameTip = $t('authentication.usernameTip');
  const passwordTip = $t('authentication.passwordTip');

  return [
    {
      component: 'VbenInput',
      componentProps: {
        autocomplete: 'username',
        placeholder: usernameTip,
      },
      defaultValue: isDev ? devUsername : undefined,
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z
        .string({
          required_error: usernameTip,
          invalid_type_error: usernameTip,
        })
        .min(1, { message: usernameTip }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'current-password',
        placeholder: passwordTip,
      },
      defaultValue: isDev ? devPassword : undefined,
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z
        .string({
          required_error: passwordTip,
          invalid_type_error: passwordTip,
        })
        .min(1, { message: passwordTip }),
    },
    {
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-third-party-login="false"
    :submit-button-text="$t('authentication.enterSystem')"
    :sub-title="$t('authentication.loginSubtitle')"
    :title="$t('authentication.welcomeBack')"
    @submit="authStore.authLogin"
  />
</template>
