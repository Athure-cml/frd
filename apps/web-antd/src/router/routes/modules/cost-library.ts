import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:database',
      order: 3,
      title: $t('page.costLibrary.title'),
    },
    name: 'CostLibrary',
    path: '/cost-library',
    redirect: '/cost-library/road',
    children: [
      {
        name: 'CostLibraryRoad',
        path: '/cost-library/road',
        component: () => import('#/views/cost-library/road/index.vue'),
        meta: {
          icon: 'lucide:truck',
          title: $t('page.costLibrary.road'),
        },
      },
      {
        name: 'CostLibrarySea',
        path: '/cost-library/sea',
        component: () => import('#/views/cost-library/sea/index.vue'),
        meta: {
          icon: 'lucide:ship',
          title: $t('page.costLibrary.sea'),
        },
      },
      {
        name: 'CostLibraryFumigation',
        path: '/cost-library/fumigation',
        component: () => import('#/views/cost-library/fumigation/index.vue'),
        meta: {
          icon: 'lucide:flame',
          title: $t('page.costLibrary.fumigation'),
        },
      },
    ],
  },
];

export default routes;
