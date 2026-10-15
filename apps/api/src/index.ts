import { createApp } from './app';
import { createFileAuditStore } from './store';

const store = createFileAuditStore();
const app = createApp(store);

export default {
  hostname: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3001),
  fetch: (request: Request, server: Bun.Server<unknown>) => app.fetch(request, {
    clientAddress: server.requestIP(request)?.address,
  }),
};
