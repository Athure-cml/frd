/** Excel / 大文件导入超时（预校验 + 写入可能较慢，需与 Nginx proxy_read_timeout 对齐） */
export const IMPORT_REQUEST_TIMEOUT_MS = 600_000;
