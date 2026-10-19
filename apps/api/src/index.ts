import { createApp } from './app';
import { createFileAuditStore } from './store';
import { auditStatePath, caseWorkStatePath, FileCaseWorkStore, writerLockPath } from './case-work-file';
import { resolve } from 'node:path';
import { createStaticWebHandler } from './static-web';

if (process.env.METHANE_API_WRITER_LOCK !== writerLockPath()) {
  throw new Error('Start the API through scripts/start-api.ts so its persistent state has one writer.');
}

const store = createFileAuditStore();
const publicBaselinePreview = process.env.METHANE_PUBLIC_PREVIEW === 'true';
const app = createApp(store, undefined, {}, {
  caseWorkStore: new FileCaseWorkStore(caseWorkStatePath(auditStatePath())),
  publicBaselinePreview,
});
const serveWeb = createStaticWebHandler(resolve(import.meta.dir, '../../web/dist'));

export default {
  hostname: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3001),
  fetch: async (request: Request, server: Bun.Server<unknown>) => {
    const response = await app.fetch(request, { clientAddress: server.requestIP(request)?.address });
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api' || pathname.startsWith('/api/')) return response;
    if (request.method === 'GET' || request.method === 'HEAD') return (await serveWeb(request)) || response;
    return response;
  },
};
