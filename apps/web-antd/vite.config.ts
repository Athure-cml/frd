import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        // 允许用局域网 IP（如 http://192.168.3.3:5666）访问
        host: true,
        proxy: {
          '/api': {
            changeOrigin: true,
            // quote-api 无 /api 前缀，去掉代理路径中的 /api 后转发到本机 8080
            rewrite: (path) => path.replace(/^\/api/, ''),
            // 用 127.0.0.1，避免 Windows 上 localhost→IPv6 导致代理失败
            target: 'http://127.0.0.1:8080',
            timeout: 600_000,
            ws: true,
          },
          '/uploads': {
            changeOrigin: true,
            target: 'http://127.0.0.1:8080',
          },
        },
      },
    },
  };
});
