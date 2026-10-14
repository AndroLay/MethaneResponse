import { lstat, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/** User-supplied files with unresolved redistribution rights; never serve or ship them. */
export const WITHHELD_PUBLIC_ASSETS = [
  'atlas-demo.webp',
  'earth-decor.webp',
  'earth-observation-hero.webp',
  'landing-earth.webp',
  'observation-1.webp',
  'observation-2.webp',
  'observation-3.webp',
  'observation-4.webp',
  'observation-5.webp',
  'site-demo.webp',
] as const;

/** No local `/assets/*` files currently have a documented source/license entry. */
export const APPROVED_PUBLIC_ASSETS: readonly string[] = [];

const withheldNames = new Set<string>(WITHHELD_PUBLIC_ASSETS);
const approvedNames = new Set<string>(APPROVED_PUBLIC_ASSETS);

export function isWithheldPublicAsset(requestUrl: string): boolean {
  try {
    const pathname = new URL(requestUrl, 'http://vite.local').pathname;
    if (!pathname.startsWith('/assets/')) return false;
    return withheldNames.has(decodeURIComponent(pathname.slice('/assets/'.length)));
  } catch {
    return false;
  }
}

export function isUnapprovedPublicAsset(requestUrl: string): boolean {
  try {
    const pathname = new URL(requestUrl, 'http://vite.local').pathname;
    if (!pathname.startsWith('/assets/')) return false;
    const name = decodeURIComponent(pathname.slice('/assets/'.length));
    return name.length > 0 && !approvedNames.has(name);
  } catch {
    return false;
  }
}

async function listFiles(directory: string, prefix = ''): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(join(directory, entry.name), relativePath));
    else files.push(relativePath);
  }
  return files;
}

export async function pruneUnapprovedPublicAssets(
  publicAssetsDirectory: string,
  outputAssetsDirectory: string,
  approvedAssets: readonly string[] = APPROVED_PUBLIC_ASSETS,
): Promise<string[]> {
  const approved = new Set(approvedAssets);
  const removed: string[] = [];
  for (const relativePath of await listFiles(publicAssetsDirectory)) {
    if (approved.has(relativePath)) continue;
    const path = join(outputAssetsDirectory, relativePath);
    try {
      await lstat(path);
      await rm(path, { force: true });
      removed.push(relativePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return removed;
}
