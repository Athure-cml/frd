import type { DashboardApi } from '#/api/dashboard';

import { $t } from '#/locales';

import { serviceTypeLabel } from '../../quote/list/data';
import { formatQuoteCostRiskHint } from '../../quote/shared/format-cost-risk-hint';

export interface WorkspaceMetricView {
  icon: string;
  iconTone: 'accent' | 'destructive' | 'primary' | 'success' | 'warning';
  title: string;
  trend: number;
  value: number;
}

export interface WorkspaceTodoView {
  actionLabel: string;
  customer: string;
  done: boolean;
  href: string;
  id: string;
  priority: 'high' | 'medium' | 'urgent';
  quoteNo: string;
  time: string;
  title: string;
  todoType: string;
}

export interface WorkspacePipelineView {
  amountLabel: string;
  customerName: string;
  id: string;
  progress: number;
  quoteNo: string;
  serviceTypeLabel: string;
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

export interface WorkspaceQuoteStatsView {
  months: string[];
  quoted: number[];
  won: number[];
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

const TODO_TITLE_KEYS: Record<string, string> = {
  archiveLost: 'page.workspace.todos.archiveLost',
  approveQuote: 'page.workspace.todos.approveQuote',
  completeDraft: 'page.workspace.todos.completeDraft',
  confirmWon: 'page.workspace.todos.confirmWon',
  followSent: 'page.workspace.todos.followSent',
  reviewCostRisk: 'page.workspace.todos.reviewCostRisk',
};

const TODO_ACTION_KEYS: Record<string, string> = {
  archiveLost: 'page.workspace.todos.actions.handle',
  approveQuote: 'page.workspace.todos.actions.approve',
  completeDraft: 'page.workspace.todos.actions.complete',
  confirmWon: 'page.workspace.todos.actions.archive',
  followSent: 'page.workspace.todos.actions.follow',
  reviewCostRisk: 'page.workspace.todos.actions.review',
};

function resolveTodoTitle(todoType: string) {
  const key = TODO_TITLE_KEYS[todoType];
  return key ? $t(key) : todoType;
}

function resolveTodoActionLabel(todoType: string) {
  const key = TODO_ACTION_KEYS[todoType];
  return key ? $t(key) : $t('page.workspace.todos.actions.handle');
}

function resolveTodoHref(item: DashboardApi.WorkspaceTodo) {
  return item.todoType === 'approveQuote'
    ? `/approval/${item.id}`
    : `/quotes/${item.id}/edit`;
}

const TODO_PRIORITY_RANK: Record<WorkspaceTodoView['priority'], number> = {
  high: 1,
  medium: 2,
  urgent: 0,
};

export function mapWorkspaceTodos(
  todos: DashboardApi.WorkspaceTodo[],
): WorkspaceTodoView[] {
  return todos
    .map((item) => ({
      actionLabel: resolveTodoActionLabel(item.todoType),
      customer: item.customer,
      done: item.done,
      href: resolveTodoHref(item),
      id: String(item.id),
      priority: item.priority,
      quoteNo: item.quoteNo,
      time: item.time,
      title: resolveTodoTitle(item.todoType),
      todoType: item.todoType,
    }))
    .toSorted((left, right) => {
      if (left.done !== right.done) {
        return left.done ? 1 : -1;
      }
      return (
        (TODO_PRIORITY_RANK[left.priority] ?? 9) -
        (TODO_PRIORITY_RANK[right.priority] ?? 9)
      );
    });
}

function formatPipelineAmount(amount?: number, currency?: string) {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const code = currency?.trim() || 'USD';
  return `${code} ${formatted}`;
}

export function mapWorkspacePipeline(
  pipeline: DashboardApi.WorkspacePipelineItem[],
): WorkspacePipelineView[] {
  return pipeline.map((item) => ({
    amountLabel: formatPipelineAmount(item.totalAmount, item.currency),
    customerName: item.customerName?.trim() || '—',
    id: String(item.id),
    progress: item.progress,
    quoteNo: item.quoteNo,
    serviceTypeLabel: serviceTypeLabel(item.serviceTypes) || '—',
    status: item.status,
    title: item.title,
  }));
}

export function mapWorkspaceRoutes(
  routes: DashboardApi.WorkspaceRouteItem[],
): WorkspaceRouteView[] {
  return routes
    .map((item) => ({
      name: item.name?.trim() ?? '',
      value: item.value,
    }))
    .filter((item) => item.name);
}

export function mapWorkspaceQuoteStats(
  stats?: DashboardApi.WorkspaceQuoteStats | null,
): WorkspaceQuoteStatsView {
  return {
    months: stats?.months ?? [],
    quoted: stats?.quoted ?? [],
    won: stats?.won ?? [],
  };
}

export function mapWorkspaceNotice(
  notice: DashboardApi.WorkspaceNotice,
): WorkspaceNoticeView {
  if (notice.type === 'COST_RISK') {
    const quoteId = notice.payload?.quoteId;
    const reason = notice.payload?.reason;
    const modes = notice.payload?.costRiskModes;
    return {
      desc: formatQuoteCostRiskHint({
        modes: Array.isArray(modes) ? modes.map(String) : undefined,
        reason: typeof reason === 'string' ? reason : undefined,
      }),
      icon: 'lucide:triangle-alert',
      id: notice.id,
      link: quoteId ? `/quotes/${quoteId}/edit` : '/quotes/list',
      time: notice.time,
      title: $t('page.workspace.notices.costRiskTitle'),
    };
  }

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
