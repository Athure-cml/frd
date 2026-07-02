import type { AnalysisOverviewItem } from '@vben/common-ui';

import { $t } from '#/locales';

export interface WorkspaceNavItem {
  icon: string;
  title: string;
  url: string;
}

export interface WorkspaceLinkItem {
  icon: string;
  title: string;
  url: string;
}

export function useWorkspaceQuickNav(): WorkspaceNavItem[] {
  return [
    {
      icon: 'lucide:file-plus',
      title: $t('page.workspace.nav.createQuote'),
      url: '/quotes/create',
    },
    {
      icon: 'lucide:list',
      title: $t('page.workspace.nav.quoteList'),
      url: '/quotes/list',
    },
    {
      icon: 'lucide:truck',
      title: $t('page.workspace.nav.roadCost'),
      url: '/cost-library/road',
    },
    {
      icon: 'lucide:ship',
      title: $t('page.workspace.nav.seaCost'),
      url: '/cost-library/sea',
    },
    {
      icon: 'lucide:flame',
      title: $t('page.workspace.nav.fumigationCost'),
      url: '/cost-library/fumigation',
    },
    {
      icon: 'lucide:users',
      title: $t('page.workspace.nav.customers'),
      url: '/customers/list',
    },
  ];
}

export function useMasterDataLinks(): WorkspaceLinkItem[] {
  return [
    {
      icon: 'lucide:anchor',
      title: $t('page.masterData.globalPort'),
      url: '/master-data/global-port',
    },
    {
      icon: 'lucide:map-pin',
      title: $t('page.masterData.usStateZip'),
      url: '/master-data/us-state-zip',
    },
    {
      icon: 'lucide:badge-dollar-sign',
      title: $t('page.masterData.currency'),
      url: '/master-data/currency',
    },
    {
      icon: 'lucide:arrow-left-right',
      title: $t('page.masterData.exchangeRate'),
      url: '/master-data/exchange-rate',
    },
  ];
}

export function useSystemLinks(): WorkspaceLinkItem[] {
  return [
    {
      icon: 'lucide:user-cog',
      title: $t('page.system.user'),
      url: '/system/user',
    },
    {
      icon: 'lucide:shield',
      title: $t('page.system.role'),
      url: '/system/role',
    },
  ];
}

export function formatWorkspaceDate(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function resolveGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'page.workspace.greetingMorning';
  }
  if (hour < 18) {
    return 'page.workspace.greetingAfternoon';
  }
  return 'page.workspace.greetingEvening';
}

export type { AnalysisOverviewItem };
