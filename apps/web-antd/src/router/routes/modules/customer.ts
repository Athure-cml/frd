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
      {
        name: 'SupplierList',
        path: '/customers/suppliers',
        component: () => import('#/views/supplier/list/index.vue'),
        meta: {
          icon: 'lucide:truck',
          title: $t('page.supplier.list'),
        },
      },
      {
        name: 'ShippingLineList',
        path: '/customers/shipping-lines',
        component: () => import('#/views/shipping-line/list/index.vue'),
        meta: {
          icon: 'lucide:ship',
          title: $t('page.shippingLine.list'),
        },
      },
      {
        name: 'AgentList',
        path: '/customers/agents',
        component: () => import('#/views/agent/list/index.vue'),
        meta: {
          icon: 'lucide:handshake',
          title: $t('page.agent.list'),
        },
      },
    ],
  },
];

export default routes;
