import {
  defineOverridesPreferences,
  definePreferencesExtension,
} from '@vben/preferences';

const appTitle = import.meta.env.VITE_APP_TITLE;

interface WebAntdPreferencesExtension {
  defaultTableSize: number;
  enableFormFullscreen: boolean;
  reportTitle: string;
  tenantMode: 'multi' | 'single';
}

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: appTitle,
    defaultHomePath: '/analytics',
    layout: 'sidebar-mixed-nav',
    // mixed：菜单由后端 /menu/all 按权限码过滤；前端仅补 hideInMenu 的隐藏路由
    accessMode: 'mixed',
    enableCheckUpdates: true,
    checkUpdatesInterval: 3,
    // 强制开启更新检测，避免被本地偏好缓存关闭
  },
  breadcrumb: {
    styleType: 'background',
  },
  sidebar: {
    width: 320,
  },
  theme: {
    mode: 'auto',
  },
  copyright: {
    companyName: appTitle,
    companySiteLink: '',
    date: String(new Date().getFullYear()),
    enable: true,
    icp: '',
    icpLink: '',
  },
  logo: {
    enable: true,
    fit: 'contain',
    source: '',
    sourceDark: '',
  },
});

export const preferencesExtension =
  definePreferencesExtension<WebAntdPreferencesExtension>({
    tabLabel: 'preferences.antd.tabLabel',
    title: 'preferences.antd.title',
    fields: [
      {
        component: 'switch',
        defaultValue: true,
        key: 'enableFormFullscreen',
        label: 'preferences.antd.fields.enableFormFullscreen.label',
        tip: 'preferences.antd.fields.enableFormFullscreen.tip',
      },
      {
        component: 'select',
        defaultValue: 'single',
        key: 'tenantMode',
        label: 'preferences.antd.fields.tenantMode.label',
        options: [
          {
            label: 'preferences.antd.fields.tenantMode.options.single.label',
            value: 'single',
          },
          {
            label: 'preferences.antd.fields.tenantMode.options.multi.label',
            value: 'multi',
          },
        ],
      },
      {
        component: 'number',
        componentProps: {
          max: 200,
          min: 10,
          step: 10,
        },
        defaultValue: 20,
        key: 'defaultTableSize',
        label: 'preferences.antd.fields.defaultTableSize.label',
      },
      {
        component: 'input',
        defaultValue: appTitle,
        key: 'reportTitle',
        label: 'preferences.antd.fields.reportTitle.label',
        placeholder: 'preferences.antd.fields.reportTitle.placeholder',
      },
    ],
  });
