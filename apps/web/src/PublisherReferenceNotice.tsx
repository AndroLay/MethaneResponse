type Props = { documentCount: number };

export default function PublisherReferenceNotice({ documentCount }: Props) {
  if (!Number.isInteger(documentCount) || documentCount < 1) return null;

  return <aside className="publisher-reference-notice" role="note" aria-label="Publisher report limitation">
    <strong>Publisher references only</strong>
    <span>Linked report content is not embedded or independently reviewed in MethaneResponse. A report title or metadata is not an independent audit result.</span>
  </aside>;
}
