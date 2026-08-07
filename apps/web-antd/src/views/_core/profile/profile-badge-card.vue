<script setup lang="ts">
import { computed, inject } from 'vue';

import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import ProfileAvatarUpload from './profile-avatar-upload.vue';
import { profileContextKey } from './profile-context';
import { formatRoleLabels } from './profile-utils';

import './profile.css';

const profileContext = inject(profileContextKey);
if (!profileContext) {
  throw new Error('profileContext is not provided');
}

const userStore = useUserStore();

const realName = computed(
  () =>
    userStore.userInfo?.realName ??
    profileContext.profileData.value?.realName ??
    '',
);

const username = computed(
  () =>
    userStore.userInfo?.username ??
    profileContext.profileData.value?.username ??
    '',
);

const roleTitle = computed(() =>
  formatRoleLabels(
    profileContext.profileData.value?.roleNames ??
      userStore.userInfo?.roleNames,
    profileContext.profileData.value?.roles ?? userStore.userInfo?.roles,
  ),
);

const roleCodes = computed(() => {
  const codes =
    profileContext.profileData.value?.roles ?? userStore.userInfo?.roles ?? [];
  return codes
    .map((code) =>
      String(code)
        .split(/[_-]/)
        .filter(Boolean)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join(' '),
    )
    .join(' · ');
});

const companyName = computed(() => preferences.app.name);
</script>

<template>
  <div class="profile-badge">
    <div aria-hidden="true" class="profile-badge__logo">
      <span class="profile-badge__logo-letter">F</span>
      <span class="profile-badge__logo-letter">R</span>
      <span class="profile-badge__logo-letter">D</span>
    </div>

    <ProfileAvatarUpload />

    <div class="profile-badge__identity">
      <p class="profile-badge__name">{{ realName }}</p>
      <p v-if="username" class="profile-badge__username">{{ username }}</p>
    </div>

    <div class="profile-badge__divider" role="separator"></div>

    <div v-if="roleTitle || roleCodes" class="profile-badge__title">
      <p v-if="roleTitle" class="profile-badge__role">{{ roleTitle }}</p>
      <p
        v-if="roleCodes && roleCodes !== roleTitle"
        class="profile-badge__role-en"
      >
        {{ roleCodes }}
      </p>
    </div>

    <p v-if="companyName" class="profile-badge__company">{{ companyName }}</p>
  </div>
</template>
