import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:contact',
      order: 5,
      title: $t('page.customer.title'),
    },
    name: 'Customer',
    path: '/customers',
    redirect: '/customers/list',
    children: [
      {
        name: 'CustomerList',
        path: '/customers/list',
        component: () => import('#/views/customer/list/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.customer.list'),
        },
      },
    ],
  },
];

export default routes;
