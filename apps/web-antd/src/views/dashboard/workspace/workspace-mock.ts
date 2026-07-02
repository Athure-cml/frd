import { $t } from '#/locales';

export interface WorkspaceMetric {
  icon: string;
  iconTone: 'accent' | 'destructive' | 'primary' | 'success' | 'warning';
  title: string;
  trend: number;
  value: number;
}

export interface WorkspaceTodo {
  customer: string;
  done: boolean;
  id: string;
  priority: 'high' | 'medium' | 'urgent';
  quoteNo: string;
  time: string;
  title: string;
}

export interface WorkspacePipelineItem {
  id: string;
  progress: number;
  quoteNo: string;
  status: 'done' | 'progress';
  title: string;
}

export interface WorkspaceNotice {
  desc: string;
  icon: string;
  id: string;
  time: string;
  title: string;
}

export interface WorkspaceRouteItem {
  name: string;
  value: number;
}

export function getWorkspaceMetrics(): WorkspaceMetric[] {
  return [
    {
      icon: 'lucide:file-text',
      iconTone: 'primary',
      title: $t('page.analytics.kpi.monthQuotes'),
      trend: 12,
      value: 128,
    },
    {
      icon: 'lucide:wallet',
      iconTone: 'accent',
      title: $t('page.analytics.kpi.monthAmount'),
      trend: 8,
      value: 284,
    },
    {
      icon: 'lucide:percent',
      iconTone: 'success',
      title: $t('page.analytics.kpi.winRate'),
      trend: 4,
      value: 32,
    },
    {
      icon: 'lucide:clock',
      iconTone: 'warning',
      title: $t('page.analytics.kpi.followUp'),
      trend: -3,
      value: 17,
    },
    {
      icon: 'lucide:alarm-clock',
      iconTone: 'destructive',
      title: $t('page.analytics.kpi.expiringSoon'),
      trend: 2,
      value: 6,
    },
  ];
}

export function getWorkspaceTodos(): WorkspaceTodo[] {
  return [
    {
      customer: 'TIIME DISPATCH',
      done: false,
      id: '1',
      priority: 'urgent',
      quoteNo: 'QT-2026-0312',
      time: '14:32',
      title: $t('page.workspace.todos.followSent'),
    },
    {
      customer: 'Pacific Trade Co.',
      done: false,
      id: '2',
      priority: 'high',
      quoteNo: 'QT-2026-0311',
      time: '16:20',
      title: $t('page.workspace.todos.confirmWon'),
    },
    {
      customer: 'Midwest Logistics',
      done: false,
      id: '3',
      priority: 'medium',
      quoteNo: 'QT-2026-0310',
      time: '09:15',
      title: $t('page.workspace.todos.completeDraft'),
    },
    {
      customer: 'Gulf Freight LLC',
      done: true,
      id: '4',
      priority: 'medium',
      quoteNo: 'QT-2026-0309',
      time: '11:48',
      title: $t('page.workspace.todos.archiveLost'),
    },
  ];
}

export function getWorkspacePipeline(): WorkspacePipelineItem[] {
  return [
    {
      id: '1',
      progress: 72,
      quoteNo: 'QT-2026-0312',
      status: 'progress',
      title: 'Dundee, OH → LA',
    },
    {
      id: '2',
      progress: 100,
      quoteNo: 'QT-2026-0311',
      status: 'done',
      title: 'Shanghai → Long Beach',
    },
    {
      id: '3',
      progress: 38,
      quoteNo: 'QT-2026-0310',
      status: 'progress',
      title: 'Chicago → Toronto',
    },
    {
      id: '4',
      progress: 55,
      quoteNo: 'QT-2026-0308',
      status: 'progress',
      title: 'Ningbo → NY',
    },
  ];
}

export function getWorkspaceNotices(): WorkspaceNotice[] {
  return [
    {
      desc: $t('page.workspace.notices.rateUpdate'),
      icon: 'lucide:bell',
      id: '1',
      time: '10:24',
      title: $t('page.workspace.notices.rateUpdateTitle'),
    },
    {
      desc: $t('page.workspace.notices.portSync'),
      icon: 'lucide:anchor',
      id: '2',
      time: '09:10',
      title: $t('page.workspace.notices.portSyncTitle'),
    },
    {
      desc: $t('page.workspace.notices.expireReminder'),
      icon: 'lucide:clock',
      id: '3',
      time: '昨天',
      title: $t('page.workspace.notices.expireReminderTitle'),
    },
  ];
}

export function getWorkspaceTopRoutes(): WorkspaceRouteItem[] {
  return [
    { name: 'LA → Chicago', value: 38 },
    { name: 'NY → Dallas', value: 31 },
    { name: 'Shanghai → LA', value: 27 },
    { name: 'Ningbo → Long Beach', value: 24 },
  ];
}
