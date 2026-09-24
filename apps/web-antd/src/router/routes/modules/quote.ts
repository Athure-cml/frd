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
        name: 'Analytics',
        path: '/analytics',
        component: () => import('#/views/dashboard/analytics/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: $t('page.dashboard.analytics'),
        },
      },
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
        name: 'QuoteLibraryRoad',
        path: '/quotes/library/road',
        component: () => import('#/views/quote/library/road/index.vue'),
        meta: {
          icon: 'lucide:truck',
          title: $t('page.quote.library.road'),
        },
      },
      {
        name: 'QuoteLibrarySea',
        path: '/quotes/library/sea',
        component: () => import('#/views/quote/library/sea/index.vue'),
        meta: {
          icon: 'lucide:ship',
          title: $t('page.quote.library.sea'),
        },
      },
      {
        name: 'QuoteLibraryFumigation',
        path: '/quotes/library/fumigation',
        component: () => import('#/views/quote/library/fumigation/index.vue'),
        meta: {
          icon: 'lucide:flame',
          title: $t('page.quote.library.fumigation'),
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
        redirect: (to) => ({
          name: 'QuoteEdit',
          params: { id: to.params.id },
        }),
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
