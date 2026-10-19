export type TeamSession = { reviewerId: string; claimTypes: string[]; canWrite: boolean; storage: { backend: 'memory' | 'file'; persistent: boolean; ready: boolean } };
export const TEAM_WORK_CHANGED = 'methane-shared-case-work-changed';
let session: TeamSession | null = null;
const listeners = new Set<() => void>();
export function getTeamSession() { return session; }
export function subscribeTeamSession(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setTeamSession(value: TeamSession | null) { session = value; for (const listener of listeners) listener(); }
