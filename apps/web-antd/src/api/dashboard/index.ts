import { requestClient } from '#/api/request';

export namespace DashboardApi {
  export interface WorkspaceMetric {
    key: string;
    trend: number;
    value: number;
  }

  export interface WorkspaceTodo {
    customer: string;
    done: boolean;
    id: number;
    priority: 'high' | 'medium' | 'urgent';
    quoteNo: string;
    time: string;
    todoType: string;
  }

  export interface WorkspacePipelineItem {
    currency?: string;
    customerName?: string;
    id: number;
    progress: number;
    quoteNo: string;
    serviceTypes?: string[];
    status: 'done' | 'progress';
    title: string;
    totalAmount?: number;
  }

  export interface WorkspaceNotice {
    id: string;
    payload?: Record<string, unknown>;
    time: string;
    type: 'COST_RISK' | 'COST_UPDATED' | 'QUOTE_EXPIRING';
  }

  export interface WorkspaceRouteItem {
    name: string;
    value: number;
  }

  export interface WorkspaceQuoteStats {
    months: string[];
    quoted: number[];
    won: number[];
  }

  export interface WorkspaceData {
    metrics: WorkspaceMetric[];
    notices: WorkspaceNotice[];
    pipeline: WorkspacePipelineItem[];
    quoteStats?: WorkspaceQuoteStats;
    todos: WorkspaceTodo[];
    topRoutes: WorkspaceRouteItem[];
  }

  export interface NotificationItem {
    date: string;
    id: string;
    isRead: boolean;
    link?: string;
    message?: string;
    payload?: Record<string, unknown>;
    title?: string;
    type: 'COST_RISK' | 'COST_UPDATED' | 'QUOTE_EXPIRING';
  }
}

export function getWorkspaceData() {
  return requestClient.get<DashboardApi.WorkspaceData>('/dashboard/workspace');
}

export function getDashboardTodos() {
  return requestClient.get<DashboardApi.WorkspaceTodo[]>('/dashboard/todos');
}

export function getDashboardTopRoutes() {
  return requestClient.get<DashboardApi.WorkspaceRouteItem[]>(
    '/dashboard/top-routes',
  );
}

export function getDashboardNotifications() {
  return requestClient.get<DashboardApi.NotificationItem[]>(
    '/dashboard/notifications',
  );
}

export function markDashboardNotificationRead(id: string) {
  return requestClient.post(
    `/dashboard/notifications/${encodeURIComponent(id)}/read`,
  );
}

export function markAllDashboardNotificationsRead() {
  return requestClient.post('/dashboard/notifications/read-all');
}

export function dismissDashboardNotification(id: string) {
  return requestClient.delete(
    `/dashboard/notifications/${encodeURIComponent(id)}`,
  );
}

export function dismissAllDashboardNotifications() {
  return requestClient.delete('/dashboard/notifications');
}
