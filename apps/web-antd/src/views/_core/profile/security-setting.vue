<script setup lang="ts">
import { computed, inject } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Alert, Button } from 'ant-design-vue';

import { $t } from '#/locales';

import { profileContextKey } from './profile-context';
import ProfilePasswordStrengthBars from './profile-password-strength-bars.vue';
import { isPasswordExpired, maskEmail, maskPhone } from './profile-utils';

import './profile.css';

const profileContext = inject(profileContextKey);
if (!profileContext) {
  throw new Error('profileContext is not provided');
}

const phone = computed(() => profileContext.profileData.value?.phone ?? '');
const email = computed(() => profileContext.profileData.value?.email ?? '');
const passwordSecurity = computed(
  () => profileContext.profileData.value?.passwordSecurity,
);

const phoneBound = computed(() => Boolean(phone.value.trim()));
const emailBound = computed(() => Boolean(email.value.trim()));
const contactIncomplete = computed(
  () => !phoneBound.value || !emailBound.value,
);

const passwordStrengthScore = computed(
  () => passwordSecurity.value?.strength ?? 0,
);
const passwordExpired = computed(() =>
  isPasswordExpired(passwordSecurity.value?.updatedAt),
);
const passwordNeedsUpdate = computed(
  () => passwordSecurity.value?.needsUpdate || passwordExpired.value,
);

const passwordLevelKey = computed(() => {
  const level = passwordSecurity.value?.level ?? 'UNKNOWN';
  return `page.profile.security.passwordLevel.${level.toLowerCase()}`;
});

const passwordBadgeClass = computed(() => {
  const level = passwordSecurity.value?.level ?? 'UNKNOWN';
  if (level === 'STRONG' && !passwordNeedsUpdate.value) {
    return 'profile-security__badge--bound';
  }
  if (level === 'MEDIUM') {
    return 'profile-security__badge--medium';
  }
  return 'profile-security__badge--unbound';
});

const passwordSuggestions = computed(() => {
  const tips: string[] = [];
  const security = passwordSecurity.value;
  if (!security || security.level === 'UNKNOWN') {
    tips.push($t('page.profile.security.passwordSuggest.unknown'));
  } else if (security.level === 'WEAK') {
    tips.push(
      $t('page.profile.security.passwordSuggest.weak'),
      $t('page.profile.security.passwordSuggest.mixChars'),
    );
  } else if (security.level === 'MEDIUM') {
    tips.push(
      $t('page.profile.security.passwordSuggest.medium'),
      $t('page.profile.security.passwordSuggest.mixChars'),
    );
  } else {
    tips.push($t('page.profile.security.passwordSuggest.strong'));
  }

  if (passwordExpired.value) {
    tips.push($t('page.profile.security.passwordSuggest.expired'));
  }

  if (security?.updatedAt) {
    tips.push(
      $t('page.profile.security.passwordUpdatedAt', {
        time: formatUpdatedAt(security.updatedAt),
      }),
    );
  }

  return tips;
});

const phoneDescription = computed(() => {
  if (phoneBound.value) {
    return maskPhone(phone.value);
  }
  return $t('page.profile.security.phoneUnbound');
});

const emailDescription = computed(() => {
  if (emailBound.value) {
    return maskEmail(email.value);
  }
  return $t('page.profile.security.emailUnbound');
});

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function goToBasicSettings() {
  profileContext.requestBasicEdit.value = true;
  profileContext.switchTab('basic');
}

function goToPasswordSettings() {
  profileContext.switchTab('password');
}
</script>

<template>
  <div class="profile-security">
    <Alert
      show-icon
      type="info"
      :message="$t('page.profile.security.tipTitle')"
      :description="$t('page.profile.security.tipDesc')"
    />

    <div class="profile-security__items">
      <div class="profile-security__item">
        <div class="profile-security__item-head">
          <IconifyIcon
            class="profile-security__icon"
            icon="lucide:lock-keyhole"
          />
          <div class="profile-security__body">
            <div class="profile-security__title-row">
              <span class="profile-security__title">
                {{ $t('page.profile.security.passwordTitle') }}
              </span>
              <span class="profile-security__badge" :class="passwordBadgeClass">
                {{ $t(passwordLevelKey) }}
              </span>
            </div>

            <ProfilePasswordStrengthBars
              v-if="passwordSecurity?.strength != null"
              class="profile-security__strength-bars"
              :score="passwordStrengthScore"
            />

            <div class="profile-security__messages">
              <p
                v-for="(tip, index) in passwordSuggestions"
                :key="index"
                class="profile-security__desc"
              >
                {{ tip }}
              </p>
            </div>

            <div
              v-if="passwordNeedsUpdate"
              class="profile-security__item-action"
            >
              <Button size="small" type="primary" @click="goToPasswordSettings">
                {{ $t('page.profile.security.goPassword') }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-security__item">
        <div class="profile-security__item-head">
          <IconifyIcon
            class="profile-security__icon"
            icon="lucide:smartphone"
          />
          <div class="profile-security__body">
            <div class="profile-security__title-row">
              <span class="profile-security__title">
                {{ $t('page.profile.security.phoneTitle') }}
              </span>
              <span
                class="profile-security__badge"
                :class="
                  phoneBound
                    ? 'profile-security__badge--bound'
                    : 'profile-security__badge--unbound'
                "
              >
                {{
                  phoneBound
                    ? $t('page.profile.security.statusBound')
                    : $t('page.profile.security.statusUnbound')
                }}
              </span>
            </div>
            <div class="profile-security__desc">{{ phoneDescription }}</div>
          </div>
        </div>
      </div>

      <div class="profile-security__item">
        <div class="profile-security__item-head">
          <IconifyIcon class="profile-security__icon" icon="lucide:mail" />
          <div class="profile-security__body">
            <div class="profile-security__title-row">
              <span class="profile-security__title">
                {{ $t('page.profile.security.emailTitle') }}
              </span>
              <span
                class="profile-security__badge"
                :class="
                  emailBound
                    ? 'profile-security__badge--bound'
                    : 'profile-security__badge--unbound'
                "
              >
                {{
                  emailBound
                    ? $t('page.profile.security.statusBound')
                    : $t('page.profile.security.statusUnbound')
                }}
              </span>
            </div>
            <div class="profile-security__desc">{{ emailDescription }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="contactIncomplete" class="profile-security__footer">
      <Button type="primary" @click="goToBasicSettings">
        {{ $t('page.profile.security.goBasic') }}
      </Button>
    </div>
  </div>
</template>
