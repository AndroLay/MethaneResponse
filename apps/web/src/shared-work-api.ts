import { SharedCaseWork, SharedWorkContext, SharedWorkId, SharedWorkInput, SharedWorkSession, SharedWorkListResponse, SharedWorkDetailResponse, SharedWorkSaveResponse, type CaseWorkDraft } from '@methane/shared';
import { getTeamSession, setTeamSession } from './team-session';

const api = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
let credential = '';
let generation = 0;
const requests = new Set<AbortController>();
export class SharedWorkRequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export function disconnectSharedWork() {
  credential = ''; generation++;
  for (const controller of requests) controller.abort();
  requests.clear(); setTeamSession(null);
}
type Transport = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
async function request(path: string, init: RequestInit, transport: Transport = fetch, token = credential, expectedGeneration = generation) {
  if (!token) throw new SharedWorkRequestError('Connect with a signed reviewer token first.', 401);
  const controller = new AbortController(); requests.add(controller);
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await transport(`${api}/api/case-work${path}`, { ...init, cache: 'no-store', headers: { ...init.headers, authorization: `Bearer ${token}` }, signal: controller.signal });
    if (expectedGeneration !== generation) throw new Error('Shared session changed. Reconnect before continuing.');
    const value: unknown = await response.json();
    if (expectedGeneration !== generation) throw new Error('Shared session changed. Reconnect before continuing.');
    if (!response.ok) {
      const error = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error.slice(0, 500) : 'Shared casework request failed.';
      throw new SharedWorkRequestError(error, response.status);
    }
    return value;
  } finally { clearTimeout(timeout); requests.delete(controller); }
}
export async function connectSharedWork(token: string, transport: Transport = fetch) {
  disconnectSharedWork();
  const current = generation;
  const profile = SharedWorkSession.parse(await request('/session', {}, transport, token.trim(), current));
  if (current !== generation) throw new Error('Shared session changed.');
  credential = token.trim(); setTeamSession(profile);
  return profile;
}
function query(context: SharedWorkContext, allSources = false) {
  const parsed = SharedWorkContext.parse(context);
  return new URLSearchParams({ synthetic: String(parsed.synthetic), datasetSnapshotId: parsed.datasetSnapshotId,
    ...(!allSources ? { sourceId: parsed.sourceId } : {}), ...(parsed.archiveSha256 ? { archiveSha256: parsed.archiveSha256 } : {}) }).toString();
}
function validateWork(value: unknown, context: SharedWorkContext, workId?: string, allSources = false) {
  const work = SharedCaseWork.parse(value);
  if ((!allSources && work.context.sourceId !== context.sourceId) || work.context.synthetic !== context.synthetic || work.context.datasetSnapshotId !== context.datasetSnapshotId
    || work.context.archiveSha256 !== context.archiveSha256 || (workId && work.workId !== workId) || !getTeamSession()?.claimTypes.includes(work.claimType)) throw new Error('Shared response does not match this dataset, investigation or reviewer authority.');
  return work;
}
export async function listSharedWork(context: SharedWorkContext, transport: Transport = fetch) {
  const value = SharedWorkListResponse.parse(await request(`?${query(context, true)}`, {}, transport));
  return value.works.map(item => validateWork(item, context, undefined, true));
}
export async function getSharedWork(context: SharedWorkContext, workId: string, transport: Transport = fetch) {
  const value = SharedWorkDetailResponse.parse(await request(`/${SharedWorkId.parse(workId)}?${query(context)}`, {}, transport));
  return { work: validateWork(value.work, context, workId), history: value.history.map(item => validateWork(item, context, workId)) };
}
export async function saveSharedWork(context: SharedWorkContext, workId: string, draft: CaseWorkDraft, expectedRevision: number, transport: Transport = fetch) {
  const body = SharedWorkInput.parse({ context, draft, expectedRevision });
  const value = SharedWorkSaveResponse.parse(await request(`/${SharedWorkId.parse(workId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, transport));
  return validateWork(value.work, context, workId);
}
