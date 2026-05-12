import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api/offers/': {
          target: 'https://test.thefixedincome.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/offers\//, '/api/wl/offers/'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.API_TOKEN) {
                proxyReq.setHeader('Authorization', `Bearer ${env.API_TOKEN}`);
                proxyReq.setHeader('Accept', '*/*');
              }
            });
          },
        },
        '/api/primary': {
          target: 'https://test.thefixedincome.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/primary/, '/api/wl/primaryOffers'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.API_TOKEN) {
                proxyReq.setHeader('Authorization', `Bearer ${env.API_TOKEN}`);
                proxyReq.setHeader('Accept', '*/*');
              }
            });
          },
        },
      },
    },
  };
});
