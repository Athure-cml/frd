import { $t } from '#/locales';

const t = (key: string) => $t(`page.costLibrary.status.${key}`);

export const costStatusTagOptions = () => [
  { color: 'success', label: t('active'), value: 'active' },
  { color: 'processing', label: t('pending'), value: 'pending' },
  { color: 'default', label: t('expired'), value: 'expired' },
];
