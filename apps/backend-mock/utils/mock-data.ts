export interface UserInfo {
  id: number;
  password: string;
  realName: string;
  roles: string[];
  username: string;
  homePath?: string;
}

export interface TimezoneOption {
  offset: number;
  timezone: string;
}

export const MOCK_USERS: UserInfo[] = [
  {
    id: 0,
    password: '123456',
    realName: '系统管理员',
    roles: ['super_admin'],
    username: 'vben',
  },
  {
    id: 1,
    password: '123456',
    realName: 'Admin',
    roles: ['admin'],
    username: 'admin',
    homePath: '/workspace',
  },
  {
    id: 2,
    password: '123456',
    realName: 'Jack',
    roles: ['user'],
    username: 'jack',
    homePath: '/analytics',
  },
];

export const MOCK_CODES = [
  // super
  {
    codes: ['AC_100100', 'AC_100110', 'AC_100120', 'AC_100010'],
    username: 'vben',
  },
  {
    // admin
    codes: ['AC_100010', 'AC_100020', 'AC_100030'],
    username: 'admin',
  },
  {
    // user
    codes: ['AC_1000001', 'AC_1000002'],
    username: 'jack',
  },
];

const dashboardMenus = [
  {
    meta: {
      order: -1,
      title: 'page.dashboard.title',
    },
    name: 'Dashboard',
    path: '/dashboard',
    redirect: '/analytics',
    children: [
      {
        name: 'Analytics',
        path: '/analytics',
        component: '/dashboard/analytics/index',
        meta: {
          affixTab: true,
          title: 'page.dashboard.analytics',
        },
      },
      {
        name: 'Workspace',
        path: '/workspace',
        component: '/dashboard/workspace/index',
        meta: {
          title: 'page.dashboard.workspace',
        },
      },
    ],
  },
];

const costLibraryMenus = [
  {
    meta: {
      icon: 'lucide:database',
      order: 10,
      title: 'page.costLibrary.title',
    },
    name: 'CostLibrary',
    path: '/cost-library',
    children: [
      {
        name: 'CostLibraryRoad',
        path: '/cost-library/road',
        meta: {
          icon: 'lucide:truck',
          title: 'page.costLibrary.road',
        },
      },
      {
        name: 'CostLibrarySea',
        path: '/cost-library/sea',
        meta: {
          icon: 'lucide:ship',
          title: 'page.costLibrary.sea',
        },
      },
      {
        name: 'CostLibraryRail',
        path: '/cost-library/rail',
        meta: {
          icon: 'lucide:train-front',
          title: 'page.costLibrary.rail',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:columns-3',
      order: 11,
      title: 'page.costLibrary.template.menuTitle',
    },
    name: 'CostTemplateManage',
    path: '/cost-library/templates',
    children: [
      {
        name: 'CostTemplateRoad',
        path: '/cost-library/templates/road',
        meta: {
          icon: 'lucide:truck',
          title: 'page.costLibrary.template.roadMenu',
        },
      },
      {
        name: 'CostTemplateSea',
        path: '/cost-library/templates/sea',
        meta: {
          icon: 'lucide:ship',
          title: 'page.costLibrary.template.seaMenu',
        },
      },
      {
        name: 'CostTemplateRail',
        path: '/cost-library/templates/rail',
        meta: {
          icon: 'lucide:train-front',
          title: 'page.costLibrary.template.railMenu',
        },
      },
    ],
  },
];

const systemMenus = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 20,
      title: 'page.system.title',
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SystemDept',
        path: '/system/dept',
        meta: {
          icon: 'lucide:building-2',
          title: 'page.system.dept',
        },
      },
      {
        name: 'SystemUser',
        path: '/system/user',
        meta: {
          icon: 'lucide:users',
          title: 'page.system.user',
        },
      },
      {
        name: 'SystemRole',
        path: '/system/role',
        meta: {
          icon: 'lucide:shield',
          title: 'page.system.role',
        },
      },
    ],
  },
];

const adminMenus = [...dashboardMenus, ...costLibraryMenus, ...systemMenus];

export const MOCK_MENUS = [
  {
    menus: adminMenus,
    username: 'vben',
  },
  {
    menus: adminMenus,
    username: 'admin',
  },
  {
    menus: [...dashboardMenus],
    username: 'jack',
  },
];

export const MOCK_MENU_LIST = [
  {
    id: 1,
    name: 'Workspace',
    status: 1,
    type: 'menu',
    icon: 'mdi:dashboard',
    path: '/workspace',
    component: '/dashboard/workspace/index',
    meta: {
      icon: 'carbon:workspace',
      title: 'page.dashboard.workspace',
      affixTab: true,
      order: 0,
    },
  },
  {
    id: 2,
    meta: {
      icon: 'carbon:settings',
      order: 9997,
      title: 'system.title',
      badge: 'new',
      badgeType: 'normal',
      badgeVariants: 'primary',
    },
    status: 1,
    type: 'catalog',
    name: 'System',
    path: '/system',
    children: [
      {
        id: 201,
        pid: 2,
        path: '/system/menu',
        name: 'SystemMenu',
        authCode: 'System:Menu:List',
        status: 1,
        type: 'menu',
        meta: {
          icon: 'carbon:menu',
          title: 'system.menu.title',
        },
        component: '/system/menu/list',
        children: [
          {
            id: 20_101,
            pid: 201,
            name: 'SystemMenuCreate',
            status: 1,
            type: 'button',
            authCode: 'System:Menu:Create',
            meta: { title: 'common.create' },
          },
          {
            id: 20_102,
            pid: 201,
            name: 'SystemMenuEdit',
            status: 1,
            type: 'button',
            authCode: 'System:Menu:Edit',
            meta: { title: 'common.edit' },
          },
          {
            id: 20_103,
            pid: 201,
            name: 'SystemMenuDelete',
            status: 1,
            type: 'button',
            authCode: 'System:Menu:Delete',
            meta: { title: 'common.delete' },
          },
        ],
      },
      {
        id: 202,
        pid: 2,
        path: '/system/dept',
        name: 'SystemDept',
        status: 1,
        type: 'menu',
        authCode: 'System:Dept:List',
        meta: {
          icon: 'carbon:container-services',
          title: 'system.dept.title',
        },
        component: '/system/dept/list',
        children: [
          {
            id: 20_401,
            pid: 202,
            name: 'SystemDeptCreate',
            status: 1,
            type: 'button',
            authCode: 'System:Dept:Create',
            meta: { title: 'common.create' },
          },
          {
            id: 20_402,
            pid: 202,
            name: 'SystemDeptEdit',
            status: 1,
            type: 'button',
            authCode: 'System:Dept:Edit',
            meta: { title: 'common.edit' },
          },
          {
            id: 20_403,
            pid: 202,
            name: 'SystemDeptDelete',
            status: 1,
            type: 'button',
            authCode: 'System:Dept:Delete',
            meta: { title: 'common.delete' },
          },
        ],
      },
    ],
  },
];

export function getMenuIds(menus: any[]) {
  const ids: number[] = [];
  menus.forEach((item) => {
    ids.push(item.id);
    if (item.children && item.children.length > 0) {
      ids.push(...getMenuIds(item.children));
    }
  });
  return ids;
}

/**
 * 时区选项
 */
export const TIME_ZONE_OPTIONS: TimezoneOption[] = [
  {
    offset: -5,
    timezone: 'America/New_York',
  },
  {
    offset: 0,
    timezone: 'Europe/London',
  },
  {
    offset: 8,
    timezone: 'Asia/Shanghai',
  },
  {
    offset: 9,
    timezone: 'Asia/Tokyo',
  },
  {
    offset: 9,
    timezone: 'Asia/Seoul',
  },
];
