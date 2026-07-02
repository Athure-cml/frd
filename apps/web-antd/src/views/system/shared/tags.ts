import { $t } from '#/locales';

const t = (key: string) => $t(`page.system.${key}`);

export const statusTagOptions = () => [
  { color: 'success', label: t('status.enabled'), value: 1 },
  { color: 'default', label: t('status.disabled'), value: 0 },
];

export const dataScopeTagOptions = () => [
  { color: 'purple', label: t('dataScope.ALL'), value: 'ALL' },
  { color: 'processing', label: t('dataScope.DEPT'), value: 'DEPT' },
  { color: 'default', label: t('dataScope.SELF'), value: 'SELF' },
];
