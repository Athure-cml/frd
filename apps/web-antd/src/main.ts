import { initPreferences, updatePreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { overridesPreferences, preferencesExtension } from './preferences';

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  // name用于指定项目唯一标识
  // 用于区分不同项目的偏好设置以及存储数据的key前缀以及其他一些需要隔离的数据
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  // app偏好设置初始化
  await initPreferences({
    extension: preferencesExtension,
    namespace,
    overrides: overridesPreferences,
  });

  // 覆盖缓存中的 logo 关闭状态，确保侧栏品牌标识始终显示
  updatePreferences({
    logo: {
      enable: true,
      fit: 'contain',
      source: '',
      sourceDark: '',
    },
  });

  // 启动应用并挂载
  // vue应用主要逻辑及视图
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // 移除并销毁loading
  unmountGlobalLoading();
}

initApplication();
