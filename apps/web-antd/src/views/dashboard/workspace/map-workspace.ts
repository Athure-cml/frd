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
  /** 列表副文案（报价号·客户，或报价库类型·条数） */
  meta: string;
  priority: 'high' | 'medium' | 'urgent';
  quoteNo: string;
  time: string;
  title: string;
  todoType: string;
}

export interface WorkspacePipelineView {
  customerName: string;
  id: string;
  operatorName: string;
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
  inquiries: number[];
  months: string[];
  quoted: number[];
  yearInquiries: number[];
  yearQuoted: number[];
  years: string[];
}

const METRIC_META: Record<
  string,
  {
    icon: string;
    iconTone: WorkspaceMetricView['iconTone'];
    titleKey: string;
  }
> = {
  monthInquiries: {
    icon: 'lucide:clipboard-list',
    iconTone: 'primary',
    titleKey: 'page.analytics.kpi.monthInquiries',
  },
  monthQuoted: {
    icon: 'lucide:file-check-2',
    iconTone: 'accent',
    titleKey: 'page.analytics.kpi.monthQuoted',
  },
  conversionRate: {
    icon: 'lucide:percent',
    iconTone: 'success',
    titleKey: 'page.analytics.kpi.conversionRate',
  },
  pendingQuote: {
    icon: 'lucide:hourglass',
    iconTone: 'warning',
    titleKey: 'page.analytics.kpi.pendingQuote',
  },
  costRisk: {
    icon: 'lucide:triangle-alert',
    iconTone: 'destructive',
    titleKey: 'page.analytics.kpi.costRisk',
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
  pendingMail: 'page.workspace.todos.pendingMail',
  archiveLost: 'page.workspace.todos.archiveLost',
  approveQuote: 'page.workspace.todos.approveQuote',
  completeDraft: 'page.workspace.todos.completeDraft',
  confirmLibraryFumigation: 'page.workspace.todos.confirmLibrary',
  confirmLibraryRoad: 'page.workspace.todos.confirmLibrary',
  confirmLibrarySea: 'page.workspace.todos.confirmLibrary',
  confirmWon: 'page.workspace.todos.confirmWon',
  followSent: 'page.workspace.todos.followSent',
  pendingQuote: 'page.workspace.todos.pendingQuote',
  reviewCostRisk: 'page.workspace.todos.reviewCostRisk',
};

const TODO_ACTION_KEYS: Record<string, string> = {
  pendingMail: 'page.workspace.todos.actions.resendMail',
  archiveLost: 'page.workspace.todos.actions.handle',
  approveQuote: 'page.workspace.todos.actions.approve',
  completeDraft: 'page.workspace.todos.actions.complete',
  confirmLibraryFumigation: 'page.workspace.todos.actions.confirmLibrary',
  confirmLibraryRoad: 'page.workspace.todos.actions.confirmLibrary',
  confirmLibrarySea: 'page.workspace.todos.actions.confirmLibrary',
  confirmWon: 'page.workspace.todos.actions.archive',
  followSent: 'page.workspace.todos.actions.follow',
  pendingQuote: 'page.workspace.todos.actions.quote',
  reviewCostRisk: 'page.workspace.todos.actions.review',
};

const LIBRARY_CONFIRM_HREF: Record<string, string> = {
  confirmLibraryFumigation: '/quotes/library/fumigation?status=pendingConfirm',
  confirmLibraryRoad: '/quotes/library/road?status=pendingConfirm',
  confirmLibrarySea: '/quotes/library/sea?status=pendingConfirm',
};

const LIBRARY_CONFIRM_LABEL_KEYS: Record<string, string> = {
  confirmLibraryFumigation: 'page.workspace.todos.library.fumigation',
  confirmLibraryRoad: 'page.workspace.todos.library.road',
  confirmLibrarySea: 'page.workspace.todos.library.sea',
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
  const libraryHref = LIBRARY_CONFIRM_HREF[item.todoType];
  if (libraryHref) {
    return libraryHref;
  }
  return item.todoType === 'approveQuote'
    ? `/approval/${item.id}`
    : `/quotes/${item.id}/edit`;
}

function resolveTodoMeta(item: DashboardApi.WorkspaceTodo) {
  const libraryLabelKey = LIBRARY_CONFIRM_LABEL_KEYS[item.todoType];
  if (libraryLabelKey) {
    const count = Number(item.customer);
    const safeCount = Number.isFinite(count) ? count : 0;
    return $t('page.workspace.todos.library.countMeta', [
      $t(libraryLabelKey),
      safeCount,
    ]);
  }
  const quoteNo = item.quoteNo?.trim() || '—';
  const customer = item.customer?.trim() || '—';
  return `${quoteNo} · ${customer}`;
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
      meta: resolveTodoMeta(item),
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

export function mapWorkspacePipeline(
  pipeline: DashboardApi.WorkspacePipelineItem[],
): WorkspacePipelineView[] {
  return pipeline.map((item) => ({
    customerName: item.customerName?.trim() || '—',
    id: String(item.id),
    operatorName: item.operatorName?.trim() || '—',
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
    inquiries: (stats?.inquiries ?? []).map(Number),
    months: stats?.months ?? [],
    quoted: (stats?.quoted ?? []).map(Number),
    yearInquiries: (stats?.yearInquiries ?? []).map(Number),
    yearQuoted: (stats?.yearQuoted ?? []).map(Number),
    years: stats?.years ?? [],
  };
}

export function mapWorkspaceNotice(
  notice: DashboardApi.WorkspaceNotice,
): WorkspaceNoticeView {
  if (notice.type === 'MAIL_FAILED') {
    const quoteId = notice.payload?.quoteId;
    const quoteNo = String(notice.payload?.quoteNo ?? '');
    const reason = String(notice.payload?.reason ?? '');
    return {
      desc: $t('page.workspace.notices.mailFailed', [quoteNo, reason]),
      icon: 'lucide:mail-warning',
      id: notice.id,
      link: quoteId ? `/quotes/${quoteId}/edit` : '/quotes/list',
      time: notice.time,
      title: $t('page.workspace.notices.mailFailedTitle'),
    };
  }

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
