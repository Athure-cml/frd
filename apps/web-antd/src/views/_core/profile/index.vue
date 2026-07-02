<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { getUserInfoApi } from '#/api';
import { $t } from '#/locales';

import ProfileBase from './base-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
import ProfileAvatarUpload from './profile-avatar-upload.vue';
import { profileContextKey } from './profile-context';
import ProfileSecuritySetting from './security-setting.vue';

import './profile.css';

const userStore = useUserStore();

const tabsValue = ref<string>('basic');
const loading = ref(false);
const requestBasicEdit = ref(false);
const profileData = ref<Awaited<ReturnType<typeof getUserInfoApi>> | null>(
  null,
);

const tabs = [
  {
    label: $t('page.profile.tabs.basic'),
    value: 'basic',
  },
  {
    label: $t('page.profile.tabs.password'),
    value: 'password',
  },
  {
    label: $t('page.profile.tabs.security'),
    value: 'security',
  },
];

const currentTabTitle = computed(
  () => tabs.find((tab) => tab.value === tabsValue.value)?.label ?? '',
);

async function reloadProfile() {
  loading.value = true;
  try {
    profileData.value = await getUserInfoApi();
    userStore.setUserInfo(profileData.value);
  } finally {
    loading.value = false;
  }
}

function switchTab(tab: string) {
  tabsValue.value = tab;
}

provide(profileContextKey, {
  loading,
  profileData,
  reloadProfile,
  requestBasicEdit,
  switchTab,
});

onMounted(reloadProfile);
</script>

<template>
  <Profile
    v-model:model-value="tabsValue"
    :tabs="tabs"
    :title="$t('page.auth.profile')"
    :user-info="userStore.userInfo"
  >
    <template #avatar>
      <ProfileAvatarUpload />
    </template>
    <template #content>
      <div class="profile-content" v-loading="loading">
        <h2 class="profile-content__title">{{ currentTabTitle }}</h2>
        <ProfileBase v-if="tabsValue === 'basic'" />
        <ProfilePasswordSetting v-else-if="tabsValue === 'password'" />
        <ProfileSecuritySetting v-else-if="tabsValue === 'security'" />
      </div>
    </template>
  </Profile>
</template>
