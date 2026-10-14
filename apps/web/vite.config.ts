import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { isUnapprovedPublicAsset } from './build/withheld-public-assets';
import { resolveDevApiProxyTarget } from './build/api-proxy-target';

const withholdUnclearedAssets: Plugin = {
  name: 'methaneresponse-withhold-uncleared-assets',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (!isUnapprovedPublicAsset(request.url ?? '/')) return next();
      response.statusCode = 404;
      response.setHeader('cache-control', 'no-store');
      response.end('Asset withheld because no approved source and license entry exists.');
    });
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'METHANE_');
  const apiProxyTarget = resolveDevApiProxyTarget(env.METHANE_API_PROXY_TARGET);

  return {
    plugins: [withholdUnclearedAssets, react(), tailwindcss()],
    server: { port: 5173, proxy: { '/api': apiProxyTarget } },
  };
});

