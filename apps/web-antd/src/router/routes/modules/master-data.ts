import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:coins',
      order: 6,
      title: $t('page.masterData.title'),
    },
    name: 'MasterData',
    path: '/master-data',
    redirect: '/master-data/currency',
    children: [
      {
        name: 'MasterDataCurrency',
        path: '/master-data/currency',
        component: () => import('#/views/master-data/currency/index.vue'),
        meta: {
          icon: 'lucide:badge-dollar-sign',
          title: $t('page.masterData.currency'),
        },
      },
      {
        name: 'MasterDataExchangeRate',
        path: '/master-data/exchange-rate',
        component: () => import('#/views/master-data/exchange-rate/index.vue'),
        meta: {
          icon: 'lucide:arrow-left-right',
          title: $t('page.masterData.exchangeRate'),
        },
      },
      {
        name: 'MasterDataUsStateZip',
        path: '/master-data/us-state-zip',
        component: () => import('#/views/master-data/us-state-zip/index.vue'),
        meta: {
          icon: 'lucide:map-pin',
          title: $t('page.masterData.usStateZip'),
        },
      },
      {
        name: 'MasterDataDestAddressRedirect',
        path: '/master-data/dest-address',
        redirect: '/master-data/us-state-zip',
        meta: { hideInMenu: true, title: 'Redirect' },
      },
      {
        name: 'MasterDataUsStateRedirect',
        path: '/master-data/us-state',
        redirect: '/master-data/us-state-zip',
        meta: { hideInMenu: true, title: 'Redirect' },
      },
      {
        name: 'MasterDataGlobalPort',
        path: '/master-data/global-port',
        component: () => import('#/views/master-data/global-port/index.vue'),
        meta: {
          icon: 'lucide:anchor',
          title: $t('page.masterData.globalPort'),
        },
      },
      {
        name: 'MasterDataInlandPorRedirect',
        path: '/master-data/inland-por',
        redirect: '/master-data/global-port',
        meta: { hideInMenu: true, title: 'Redirect' },
      },
    ],
  },
];

export default routes;
