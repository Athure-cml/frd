import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:file-text',
      order: 2,
      title: $t('page.quote.title'),
    },
    name: 'Quote',
    path: '/quotes',
    redirect: '/quotes/list',
    children: [
      {
        name: 'QuoteList',
        path: '/quotes/list',
        component: () => import('#/views/quote/list/index.vue'),
        meta: {
          icon: 'lucide:list',
          title: $t('page.quote.list'),
        },
      },
      {
        name: 'QuoteCreate',
        path: '/quotes/create',
        component: () => import('#/views/quote/sheet-editor/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.quote.createTitle'),
        },
      },
      {
        name: 'QuoteDetail',
        path: '/quotes/:id',
        component: () => import('#/views/quote/detail/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.quote.viewTitle'),
        },
      },
      {
        name: 'QuoteEdit',
        path: '/quotes/:id/edit',
        component: () => import('#/views/quote/sheet-editor/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.quote.editTitle'),
        },
      },
    ],
  },
];

export default routes;
