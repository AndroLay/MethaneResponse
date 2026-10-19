import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { clearSessionDraft, readSessionDraft, writeSessionDraft, type DraftSchema } from './session-draft';
const dirtyEditors = new Set<symbol>();
export function confirmDraftNavigation() {
  return !dirtyEditors.size || window.confirm('You have unsaved investigation edits. Continue? Drafts are kept only in this tab when session storage is available. Save important work before closing the tab.');
}
export function useSessionDraft<T>(kind: string, context: string, schema: DraftSchema<T>, initial: T) {
  const baseline = useRef(initial);
  const recovered = useRef(readSessionDraft(kind, context, schema));
  const [value, setValue] = useState<T>(() => recovered.current || initial);
  const [dirty, setDirty] = useState(Boolean(recovered.current));
  const [storageReady, setStorageReady] = useState(true);
  const identity = useRef(Symbol());
  useEffect(() => {
    const id = identity.current;
    if (dirty) dirtyEditors.add(id); else dirtyEditors.delete(id);
    const unload = (event: BeforeUnloadEvent) => { if (dirtyEditors.size) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { dirtyEditors.delete(id); window.removeEventListener('beforeunload', unload); };
  }, [dirty]);
  useEffect(() => {
    if (dirty) setStorageReady(writeSessionDraft(kind, context, schema, value));
  }, [value, dirty, kind, context, schema]);
  const set: Dispatch<SetStateAction<T>> = update => setValue(previous => {
    const next = typeof update === 'function' ? (update as (previous: T) => T)(previous) : update;
    const changed = JSON.stringify(next) !== JSON.stringify(baseline.current);
    setDirty(changed);
    if (!changed) clearSessionDraft(kind, context);
    return next;
  });
  function reset(next: T) { baseline.current = next; setValue(next); setDirty(false); recovered.current = null; clearSessionDraft(kind, context); }
  return { value, set, dirty, recovered: Boolean(recovered.current), storageReady, reset };
}
