import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['super_admin', 'super', 'admin'],
      icon: 'lucide:settings',
      order: 7,
      title: $t('page.system.title'),
    },
    name: 'System',
    path: '/system',
    redirect: '/system/dept',
    children: [
      {
        name: 'SystemDept',
        path: '/system/dept',
        component: () => import('#/views/system/dept/index.vue'),
        meta: {
          authority: ['super_admin', 'super', 'admin'],
          icon: 'lucide:building-2',
          title: $t('page.system.dept'),
        },
      },
      {
        name: 'SystemUser',
        path: '/system/user',
        component: () => import('#/views/system/user/index.vue'),
        meta: {
          authority: ['super_admin', 'super', 'admin'],
          icon: 'lucide:users',
          title: $t('page.system.user'),
        },
      },
      {
        name: 'SystemRole',
        path: '/system/role',
        component: () => import('#/views/system/role/index.vue'),
        meta: {
          authority: ['super_admin', 'super', 'admin'],
          icon: 'lucide:shield',
          title: $t('page.system.role'),
        },
      },
      {
        name: 'SystemOperationLog',
        path: '/system/operation-log',
        component: () => import('#/views/system/operation-log/index.vue'),
        meta: {
          authority: ['sys:operation_log:view'],
          icon: 'lucide:scroll-text',
          title: $t('page.system.operationLog'),
        },
      },
      {
        name: 'SystemAnnouncement',
        path: '/system/announcement',
        component: () => import('#/views/system/announcement/index.vue'),
        meta: {
          authority: ['sys:announcement:view'],
          icon: 'lucide:megaphone',
          title: $t('page.system.announcement'),
        },
      },
    ],
  },
];

export default routes;
