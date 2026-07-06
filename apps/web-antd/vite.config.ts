import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            // quote-api 无 /api 前缀，去掉代理路径中的 /api 后转发到 8080
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://localhost:8080',
            timeout: 600_000,
            ws: true,
          },
          '/uploads': {
            changeOrigin: true,
            target: 'http://localhost:8080',
          },
        },
      },
    },
  };
});
