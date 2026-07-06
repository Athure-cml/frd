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
    id: number;
    progress: number;
    quoteNo: string;
    status: 'done' | 'progress';
    title: string;
  }

  export interface WorkspaceNotice {
    id: string;
    payload?: Record<string, unknown>;
    time: string;
    type: 'COST_UPDATED' | 'QUOTE_EXPIRING';
  }

  export interface WorkspaceRouteItem {
    name: string;
    value: number;
  }

  export interface WorkspaceData {
    metrics: WorkspaceMetric[];
    notices: WorkspaceNotice[];
    pipeline: WorkspacePipelineItem[];
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
    type: 'COST_UPDATED' | 'QUOTE_EXPIRING';
  }
}

export function getWorkspaceData() {
  return requestClient.get<DashboardApi.WorkspaceData>('/dashboard/workspace');
}

export function getDashboardNotifications() {
  return requestClient.get<DashboardApi.NotificationItem[]>(
    '/dashboard/notifications',
  );
}
