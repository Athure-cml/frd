import type { InjectionKey, Ref } from 'vue';

import type { UserProfileApi } from '#/api';

export interface ProfileContext {
  loading: Ref<boolean>;
  profileData: Ref<null | UserProfileApi.UserInfoDetail>;
  reloadProfile: () => Promise<void>;
  requestBasicEdit: Ref<boolean>;
  switchTab: (tab: string) => void;
}

export const profileContextKey: InjectionKey<ProfileContext> =
  Symbol('profileContext');
