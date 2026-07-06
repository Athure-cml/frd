import type { DashboardApi } from '#/api/dashboard';

import { $t } from '#/locales';

export interface WorkspaceMetricView {
  icon: string;
  iconTone: 'accent' | 'destructive' | 'primary' | 'success' | 'warning';
  title: string;
  trend: number;
  value: number;
}

export interface WorkspaceTodoView {
  customer: string;
  done: boolean;
  id: string;
  priority: 'high' | 'medium' | 'urgent';
  quoteNo: string;
  time: string;
  title: string;
}

export interface WorkspacePipelineView {
  id: string;
  progress: number;
  quoteNo: string;
  status: 'done' | 'progress';
  title: string;
}

export interface WorkspaceNoticeView {
  desc: string;
  icon: string;
  id: string;
  link?: string;
  time: string;
  title: string;
}

export interface WorkspaceRouteView {
  name: string;
  value: number;
}

const METRIC_META: Record<
  string,
  {
    icon: string;
    iconTone: WorkspaceMetricView['iconTone'];
    titleKey: string;
  }
> = {
  monthQuotes: {
    icon: 'lucide:file-text',
    iconTone: 'primary',
    titleKey: 'page.analytics.kpi.monthQuotes',
  },
  monthAmount: {
    icon: 'lucide:wallet',
    iconTone: 'accent',
    titleKey: 'page.analytics.kpi.monthAmount',
  },
  winRate: {
    icon: 'lucide:percent',
    iconTone: 'success',
    titleKey: 'page.analytics.kpi.winRate',
  },
  followUp: {
    icon: 'lucide:clock',
    iconTone: 'warning',
    titleKey: 'page.analytics.kpi.followUp',
  },
  expiringSoon: {
    icon: 'lucide:alarm-clock',
    iconTone: 'destructive',
    titleKey: 'page.analytics.kpi.expiringSoon',
  },
};

const COST_TYPE_LABEL: Record<string, string> = {
  FUMIGATION: 'page.costLibrary.fumigation',
  ROAD: 'page.costLibrary.road',
  SEA: 'page.costLibrary.sea',
};

export function mapWorkspaceMetrics(
  metrics: DashboardApi.WorkspaceMetric[],
): WorkspaceMetricView[] {
  return metrics
    .map((item) => {
      const meta = METRIC_META[item.key];
      if (!meta) {
        return null;
      }
      return {
        icon: meta.icon,
        iconTone: meta.iconTone,
        title: $t(meta.titleKey),
        trend: item.trend,
        value: item.value,
      };
    })
    .filter(Boolean) as WorkspaceMetricView[];
}

export function mapWorkspaceTodos(
  todos: DashboardApi.WorkspaceTodo[],
): WorkspaceTodoView[] {
  return todos.map((item) => ({
    customer: item.customer,
    done: item.done,
    id: String(item.id),
    priority: item.priority,
    quoteNo: item.quoteNo,
    time: item.time,
    title: $t(`page.workspace.todos.${item.todoType}`),
  }));
}

export function mapWorkspacePipeline(
  pipeline: DashboardApi.WorkspacePipelineItem[],
): WorkspacePipelineView[] {
  return pipeline.map((item) => ({
    id: String(item.id),
    progress: item.progress,
    quoteNo: item.quoteNo,
    status: item.status,
    title: item.title,
  }));
}

export function mapWorkspaceRoutes(
  routes: DashboardApi.WorkspaceRouteItem[],
): WorkspaceRouteView[] {
  return routes.map((item) => ({
    name: item.name,
    value: item.value,
  }));
}

export function mapWorkspaceNotice(
  notice: DashboardApi.WorkspaceNotice,
): WorkspaceNoticeView {
  if (notice.type === 'QUOTE_EXPIRING') {
    const count = Number(notice.payload?.count ?? 0);
    const days = Number(notice.payload?.days ?? 3);
    return {
      desc: $t('page.workspace.notices.quoteExpiring', [count, days]),
      icon: 'lucide:clock',
      id: notice.id,
      link: '/quotes/list',
      time: notice.time,
      title: $t('page.workspace.notices.quoteExpiringTitle'),
    };
  }

  const quoteNo = String(notice.payload?.quoteNo ?? '');
  const costType = String(notice.payload?.costType ?? '');
  const costLabel = COST_TYPE_LABEL[costType]
    ? $t(COST_TYPE_LABEL[costType])
    : costType;
  const quoteId = notice.payload?.quoteId;
  return {
    desc: $t('page.workspace.notices.costUpdated', [quoteNo, costLabel]),
    icon: 'lucide:bell',
    id: notice.id,
    link: quoteId ? `/quotes/${quoteId}/edit` : '/quotes/list',
    time: notice.time,
    title: $t('page.workspace.notices.costUpdatedTitle'),
  };
}

export function mapDashboardNotification(item: DashboardApi.NotificationItem) {
  const notice = mapWorkspaceNotice({
    id: item.id,
    payload: item.payload,
    time: item.date,
    type: item.type,
  });
  return {
    avatar: notice.icon,
    date: notice.time,
    id: item.id,
    isRead: item.isRead,
    link: item.link ?? notice.link,
    message: notice.desc,
    title: notice.title,
  };
}
