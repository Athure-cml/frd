import type { AnalysisOverviewItem } from '@vben/common-ui';

import { $t } from '#/locales';

export interface RecentQuoteItem {
  amount: number;
  customer: string;
  id: string;
  mode: 'fumigation' | 'road' | 'sea';
  quoteNo: string;
  route: string;
  status: 'draft' | 'expired' | 'lost' | 'sent' | 'won';
  updatedAt: string;
}

export function getOverviewItems(): AnalysisOverviewItem[] {
  return [
    {
      icon: 'lucide:file-text',
      title: $t('page.analytics.kpi.monthQuotes'),
      totalTitle: $t('page.analytics.kpi.monthQuotesTotal'),
      totalValue: 1856,
      value: 128,
    },
    {
      icon: 'lucide:wallet',
      title: $t('page.analytics.kpi.monthAmount'),
      totalTitle: $t('page.analytics.kpi.monthAmountTotal'),
      totalValue: 4280,
      value: 284,
    },
    {
      icon: 'lucide:percent',
      title: $t('page.analytics.kpi.winRate'),
      totalTitle: $t('page.analytics.kpi.winRatePrev'),
      totalValue: 28,
      value: 32,
    },
    {
      icon: 'lucide:clock',
      title: $t('page.analytics.kpi.followUp'),
      totalTitle: $t('page.analytics.kpi.expiringSoon'),
      totalValue: 6,
      value: 17,
    },
  ];
}

/** @deprecated Use getOverviewItems() for locale-aware labels */
export const overviewItems = getOverviewItems();

export const quoteAmountTrend = {
  months: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  quoted: [186, 210, 245, 228, 262, 278, 301, 295, 312, 288, 305, 284],
  won: [52, 61, 74, 68, 81, 88, 95, 91, 102, 96, 104, 91],
};

export const monthlyQuoteVolume = {
  months: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  counts: [98, 105, 118, 112, 125, 132, 141, 138, 148, 136, 142, 128],
};

export const transportModeMix = [
  { name: '卡车', value: 46 },
  { name: '海运', value: 32 },
  { name: '铁路', value: 22 },
];

export function getTransportModeMix() {
  return [
    { name: $t('page.costLibrary.road'), value: 46 },
    { name: $t('page.costLibrary.sea'), value: 32 },
    { name: $t('page.analytics.transport.rail'), value: 22 },
  ];
}

export const quoteStatusDistribution = [
  { name: '已成交', value: 91 },
  { name: '已发送', value: 48 },
  { name: '待确认', value: 17 },
  { name: '已失效', value: 12 },
  { name: '未成交', value: 23 },
];

export type QuoteStatusChartKey =
  | 'draft'
  | 'expired'
  | 'lost'
  | 'pending'
  | 'sent'
  | 'won';

export function getQuoteStatusDistribution() {
  const items: { key: QuoteStatusChartKey; value: number }[] = [
    { key: 'won', value: 91 },
    { key: 'sent', value: 48 },
    { key: 'pending', value: 17 },
    { key: 'expired', value: 12 },
    { key: 'lost', value: 23 },
  ];
  return items.map((item) => ({
    ...item,
    label: $t(`page.analytics.status.${item.key}`),
  }));
}

export const topRoutes = [
  { name: 'LA → Chicago', value: 38 },
  { name: 'NY → Dallas', value: 31 },
  { name: 'Shanghai → LA', value: 27 },
  { name: 'Ningbo → Long Beach', value: 24 },
  { name: 'Chicago → Toronto', value: 19 },
];

export const recentQuotes: RecentQuoteItem[] = [
  {
    amount: 4850,
    customer: 'TIIME DISPATCH',
    id: '1',
    mode: 'road',
    quoteNo: 'QT-2026-0312',
    route: 'Dundee, OH → LA',
    status: 'sent',
    updatedAt: '2026-03-12 14:32',
  },
  {
    amount: 12_800,
    customer: 'Pacific Trade Co.',
    id: '2',
    mode: 'sea',
    quoteNo: 'QT-2026-0311',
    route: 'Shanghai → Long Beach',
    status: 'won',
    updatedAt: '2026-03-11 16:20',
  },
  {
    amount: 6200,
    customer: 'Midwest Logistics',
    id: '3',
    mode: 'fumigation',
    quoteNo: 'QT-2026-0310',
    route: 'Chicago → Toronto',
    status: 'draft',
    updatedAt: '2026-03-10 09:15',
  },
  {
    amount: 3900,
    customer: 'Gulf Freight LLC',
    id: '4',
    mode: 'road',
    quoteNo: 'QT-2026-0309',
    route: 'Houston → Dallas',
    status: 'lost',
    updatedAt: '2026-03-09 11:48',
  },
  {
    amount: 15_600,
    customer: 'East Coast Import',
    id: '5',
    mode: 'sea',
    quoteNo: 'QT-2026-0308',
    route: 'Ningbo → NY',
    status: 'sent',
    updatedAt: '2026-03-08 17:05',
  },
  {
    amount: 2750,
    customer: 'Ohio Carrier Group',
    id: '6',
    mode: 'road',
    quoteNo: 'QT-2026-0307',
    route: 'Columbus → Detroit',
    status: 'expired',
    updatedAt: '2026-03-07 10:22',
  },
];
