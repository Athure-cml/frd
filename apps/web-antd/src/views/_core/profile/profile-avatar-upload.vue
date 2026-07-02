<script setup lang="ts">
import { computed, inject, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { Avatar, message, Upload } from 'ant-design-vue';

import { uploadAvatarApi } from '#/api';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';

import { profileContextKey } from './profile-context';
import { resolveAvatarUrl } from './profile-utils';

import './profile.css';

const profileContext = inject(profileContextKey);
if (!profileContext) {
  throw new Error('profileContext is not provided');
}

const authStore = useAuthStore();
const userStore = useUserStore();
const uploading = ref(false);

const avatarSrc = computed(() =>
  resolveAvatarUrl(
    userStore.userInfo?.avatar ?? profileContext.profileData.value?.avatar,
    preferences.app.defaultAvatar,
  ),
);

async function handleBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    message.warning($t('page.profile.avatar.typeInvalid'));
    return Upload.LIST_IGNORE;
  }
  if (file.size > 2 * 1024 * 1024) {
    message.warning($t('page.profile.avatar.sizeInvalid'));
    return Upload.LIST_IGNORE;
  }

  uploading.value = true;
  try {
    const userInfo = await uploadAvatarApi(file);
    userStore.setUserInfo(userInfo);
    await authStore.fetchUserInfo();
    await profileContext.reloadProfile();
    message.success($t('page.profile.avatar.uploadSuccess'));
  } finally {
    uploading.value = false;
  }

  return false;
}
</script>

<template>
  <Upload
    accept="image/jpeg,image/png,image/gif,image/webp"
    :before-upload="handleBeforeUpload"
    :disabled="uploading"
    :show-upload-list="false"
  >
    <button
      class="profile-avatar-upload"
      :aria-label="$t('page.profile.avatar.change')"
      type="button"
    >
      <Avatar
        class="profile-avatar-upload__image"
        :size="80"
        :src="avatarSrc"
      />
      <span class="profile-avatar-upload__mask">
        <IconifyIcon class="profile-avatar-upload__icon" icon="lucide:camera" />
        <span class="profile-avatar-upload__text">
          {{
            uploading
              ? $t('page.profile.avatar.uploading')
              : $t('page.profile.avatar.change')
          }}
        </span>
      </span>
    </button>
  </Upload>
</template>
