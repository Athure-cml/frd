/** 工作台 / 抽屉空状态扁平插画（按场景区分，不复用同一张） */
export const WORKSPACE_ILLUSTRATIONS = {
  /** 系统通知 / 消息弹窗 / 消息抽屉 */
  emptyNotices: '/illustrations/workspace/empty-notices.jpg',
  /** 报价进度 */
  emptyPipeline: '/illustrations/workspace/empty-pipeline.jpg',
  /** 热门线路 */
  emptyRoutes: '/illustrations/workspace/empty-routes.jpg',
  /** 待办任务卡片 / 待办抽屉 */
  emptyTodos: '/illustrations/workspace/empty-todos.jpg',
} as const;

export type WorkspaceIllustrationKey = keyof typeof WORKSPACE_ILLUSTRATIONS;
