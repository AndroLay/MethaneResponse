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
async function request(path: string, init: RequestInit, transport: Transport = fetch, token = credential, expectedGeneration = generation, resource = 'case-work') {
  if (!token) throw new SharedWorkRequestError('Connect with a signed reviewer token first.', 401);
  const controller = new AbortController(); requests.add(controller);
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await transport(`${api}/api/${resource}${path}`, { ...init, cache: 'no-store', headers: { ...init.headers, authorization: `Bearer ${token}` }, signal: controller.signal });
    if (expectedGeneration !== generation) throw new Error('Shared session changed. Reconnect before continuing.');
    const limit = 16 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('Investigation response exceeds the browser limit.'); }
    const reader = response.body?.getReader(), decoder = new TextDecoder(), parts: string[] = []; let bytes = 0;
    if (reader) try {
      for (;;) {
        const item = await reader.read(); if (item.done) break;
        bytes += item.value.byteLength;
        if (bytes > limit || expectedGeneration !== generation) { await reader.cancel(); throw new Error(bytes > limit ? 'Investigation response exceeds the browser limit.' : 'Shared session changed. Reconnect before continuing.'); }
        parts.push(decoder.decode(item.value, { stream: true }));
      }
      parts.push(decoder.decode());
    } finally { reader.releaseLock(); }
    const text = parts.join('');
    const value: unknown = JSON.parse(text);
    if (expectedGeneration !== generation) throw new Error('Shared session changed. Reconnect before continuing.');
    if (!response.ok) {
      const error = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error.slice(0, 500) : 'Shared casework request failed.';
      throw new SharedWorkRequestError(error, response.status);
    }
    return value;
  } finally { clearTimeout(timeout); requests.delete(controller); }
}
/** Same memory-only credential, timeout, disconnect cancellation and generation guard. */
export function requestPlanResource(id: string, init: RequestInit = {}, transport: Transport = fetch) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid plan ID.');
  return request(`/${id}`, init, transport, credential, generation, 'investigation-plans');
}
export async function requestEvidenceOverlap(context: SharedWorkContext, id: string, expectedRevision: number, transport: Transport = fetch) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision > 100) throw new Error('A saved revision is required.');
  return request(`/${SharedWorkId.parse(id)}/evidence-overlap?${query(context)}&expectedRevision=${expectedRevision}`, {}, transport);
}
export async function requestInvestigationResource(context: SharedWorkContext, id: string, action: 'dossier' | 'change-check', init: RequestInit = {}, transport: Transport = fetch) {
  if (action !== 'dossier' && action !== 'change-check') throw new Error('Invalid investigation action.');
  let digest: string | null = null;
  const value = await request(`/${SharedWorkId.parse(id)}/${action}?${query(context)}`, init, async (input, options) => {
    const response = await transport(input, options); digest = response.headers.get('x-investigation-digest'); return response;
  });
  return { value, digest };
}
export function requestDecisionResource(context: SharedWorkContext, id: string, action: 'list' | 'freeze' | 'anchor' | 'reconcile' | 'verify', digest?: string, init: RequestInit = {}, transport: Transport = fetch) {
  if (!['list','freeze','anchor','reconcile','verify'].includes(action)) throw new Error('Invalid decision action.');
  const suffix = action === 'list' || action === 'freeze' ? '' : /^0x[a-f0-9]{64}$/.test(digest || '') ? `/${digest}/${action}` : null;
  if (suffix === null) throw new Error('A valid frozen decision digest is required.');
  return request(`/${SharedWorkId.parse(id)}/decisions${suffix}?${query(context)}`, { ...init, method: action === 'list' ? 'GET' : 'POST' }, transport);
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
