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
      {
        meta: {
          icon: 'lucide:columns-3',
          title: $t('page.costLibrary.template.menuTitle'),
        },
        name: 'CostTemplateManage',
        path: '/cost-library/templates',
        redirect: (to) => {
          const mode = to.query.mode;
          if (mode === 'sea' || mode === 'fumigation' || mode === 'road') {
            return `/cost-library/templates/${mode}`;
          }
          return '/cost-library/templates/road';
        },
        children: [
          {
            name: 'CostTemplateRoad',
            path: '/cost-library/templates/road',
            component: () => import('#/views/cost-library/templates/index.vue'),
            meta: {
              costMode: 'road',
              icon: 'lucide:truck',
              pageDescKey: 'page.costLibrary.template.roadPageDesc',
              title: $t('page.costLibrary.template.roadMenu'),
            },
          },
          {
            name: 'CostTemplateSea',
            path: '/cost-library/templates/sea',
            component: () => import('#/views/cost-library/templates/index.vue'),
            meta: {
              costMode: 'sea',
              icon: 'lucide:ship',
              pageDescKey: 'page.costLibrary.template.seaPageDesc',
              title: $t('page.costLibrary.template.seaMenu'),
            },
          },
          {
            name: 'CostTemplateFumigation',
            path: '/cost-library/templates/fumigation',
            component: () => import('#/views/cost-library/templates/index.vue'),
            meta: {
              costMode: 'fumigation',
              icon: 'lucide:flame',
              pageDescKey: 'page.costLibrary.template.fumigationPageDesc',
              title: $t('page.costLibrary.template.fumigationMenu'),
            },
          },
          {
            name: 'CostTemplateCreate',
            path: '/cost-library/templates/:mode/create',
            component: () =>
              import('#/views/cost-library/templates/editor.vue'),
            meta: {
              hideInMenu: true,
              title: $t('page.costLibrary.template.createTitle'),
            },
          },
          {
            name: 'CostTemplateEdit',
            path: '/cost-library/templates/:mode/edit/:id',
            component: () =>
              import('#/views/cost-library/templates/editor.vue'),
            meta: {
              hideInMenu: true,
              title: $t('page.costLibrary.template.editTitle'),
            },
          },
        ],
      },
    ],
  },
];

export default routes;
