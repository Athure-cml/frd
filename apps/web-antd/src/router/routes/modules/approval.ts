import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:clipboard-check',
      order: 7,
      title: $t('page.approval.title'),
    },
    name: 'Approval',
    path: '/approval',
    redirect: '/approval/list',
    children: [
      {
        name: 'ApprovalList',
        path: '/approval/list',
        component: () => import('#/views/approval/list/index.vue'),
        meta: {
          icon: 'lucide:list',
          title: $t('page.approval.list'),
          authority: ['quote:approve'],
        },
      },
      {
        name: 'ApprovalConfig',
        path: '/approval/config',
        component: () => import('#/views/approval/config/index.vue'),
        meta: {
          icon: 'lucide:settings-2',
          title: $t('page.approval.config'),
          authority: ['approval:config:view', 'approval:config:manage'],
        },
      },
      {
        name: 'ApprovalDetail',
        path: '/approval/:id',
        component: () => import('#/views/approval/detail/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.approval.detailTitle'),
        },
      },
    ],
  },
];

export default routes;
