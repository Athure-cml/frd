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
        name: 'SupplierTruckList',
        path: '/customers/suppliers',
        component: () => import('#/views/supplier/list/index.vue'),
        meta: {
          icon: 'lucide:truck',
          supplierCategory: 'TRUCK',
          title: $t('page.supplier.truckList'),
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
        name: 'SupplierFumigationList',
        path: '/customers/fumigation-suppliers',
        component: () => import('#/views/supplier/list/index.vue'),
        meta: {
          icon: 'lucide:flame',
          supplierCategory: 'FUMIGATION',
          title: $t('page.supplier.fumigationList'),
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
      {
        name: 'SupplierYardList',
        path: '/customers/yard-suppliers',
        component: () => import('#/views/supplier/list/index.vue'),
        meta: {
          icon: 'lucide:warehouse',
          supplierCategory: 'YARD',
          title: $t('page.supplier.yardList'),
        },
      },
      {
        name: 'SupplierOtherList',
        path: '/customers/other-suppliers',
        component: () => import('#/views/supplier/list/index.vue'),
        meta: {
          icon: 'lucide:boxes',
          supplierCategory: 'OTHER',
          title: $t('page.supplier.otherList'),
        },
      },
    ],
  },
];

export default routes;
