import { resolve } from 'node:path';
import { pruneUnapprovedPublicAssets } from '../apps/web/build/withheld-public-assets';

const repositoryRoot = resolve(import.meta.dir, '..');
await pruneUnapprovedPublicAssets(
  resolve(repositoryRoot, 'apps/web/public/assets'),
  resolve(repositoryRoot, 'apps/web/dist/assets'),
);
