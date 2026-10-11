import { createApp } from './app';
import { createConfiguredAuditStore } from './store';

const store = await createConfiguredAuditStore();
const app = createApp(store);

export default {
  port: Number(process.env.PORT || 3001),
  fetch: app.fetch,
};

