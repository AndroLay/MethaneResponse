import { useEffect, useRef } from 'react';
import ResearchSources from './ResearchSources';

type Props = { open: boolean; onClose: () => void };

export default function DataDisclosureDialog({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return <dialog
    ref={dialogRef}
    className="info-modal"
    aria-labelledby="data-disclosure-title"
    onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
  >
    <button ref={closeButtonRef} className="modal-x" onClick={() => dialogRef.current?.close()} aria-label="Close data and prototype information">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>
    </button>
    <div className="modal-kicker">DATA &amp; PROTOTYPE DISCLOSURE</div>
    <h2 id="data-disclosure-title">Evidence before assumptions</h2>
    <p>Historical UNEP MARS snapshots are not live monitoring. Satellite detections and notification/feedback fields alone do not certify mitigation. Imported sources may have no curated audit evidence. The deterministic baseline and optional external AI analysis require supporting source references; public chain receipts are only shown when actually recorded. Conceptual hero art is labeled. Case satellite tiles are coordinate-matched geographic context, not overpass imagery. When available, hash-verified UNEP publisher geometry is shown separately. Neither visualization proves mitigation.</p>
    <ResearchSources/>
    <button className="primary-btn" onClick={() => dialogRef.current?.close()}>Understood</button>
  </dialog>;
}
