import { $t } from '#/locales';

const t = (key: string) => $t(`page.costLibrary.status.${key}`);

export const costStatusTagOptions = () => [
  { color: 'success', label: t('active'), value: 'active' },
  { color: 'processing', label: t('pending'), value: 'pending' },
  { color: 'default', label: t('expired'), value: 'expired' },
];

/** 报价库状态：待确认优先于时间状态（未生效/生效中/已过期） */
export const quoteLibraryStatusTagOptions = () => [
  {
    color: 'warning',
    label: $t('page.quote.library.confirmStatus.pendingConfirm'),
    value: 'pendingConfirm',
  },
  ...costStatusTagOptions(),
];
