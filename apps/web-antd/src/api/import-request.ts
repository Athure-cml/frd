/** Excel / 大文件导入超时（预校验 + 写入可能较慢，需与 Nginx proxy_read_timeout 对齐） */
export const IMPORT_REQUEST_TIMEOUT_MS = 600_000;

/** 批量复制、批量修改等耗时请求超时 */
export const BATCH_REQUEST_TIMEOUT_MS = 60_000;

/** 批量复制预览：单次最多拉取条数（与后端 previewLimit 默认一致） */
export const BATCH_COPY_PREVIEW_LIMIT = 50;
