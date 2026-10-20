/** 工作台 / 抽屉空状态扁平插画（按场景区分，不复用同一张；含浅色/夜间两套） */
export const WORKSPACE_ILLUSTRATIONS = {
  /** 系统通知 / 消息弹窗 / 消息抽屉 */
  emptyNotices: {
    dark: '/illustrations/workspace/empty-notices-dark.jpg',
    light: '/illustrations/workspace/empty-notices.jpg',
  },
  /** 报价进度 */
  emptyPipeline: {
    dark: '/illustrations/workspace/empty-pipeline-dark.jpg',
    light: '/illustrations/workspace/empty-pipeline.jpg',
  },
  /** 热门线路 */
  emptyRoutes: {
    dark: '/illustrations/workspace/empty-routes-dark.jpg',
    light: '/illustrations/workspace/empty-routes.jpg',
  },
  /** 待办任务卡片 / 待办抽屉 */
  emptyTodos: {
    dark: '/illustrations/workspace/empty-todos-dark.jpg',
    light: '/illustrations/workspace/empty-todos.jpg',
  },
} as const;

export type WorkspaceIllustrationKey = keyof typeof WORKSPACE_ILLUSTRATIONS;

export function resolveWorkspaceIllustration(
  key: WorkspaceIllustrationKey,
  isDark = false,
): string {
  const pair = WORKSPACE_ILLUSTRATIONS[key];
  return isDark ? pair.dark : pair.light;
}
