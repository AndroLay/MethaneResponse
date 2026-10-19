import { assessmentPresentation, type EvidenceBundle } from '@methane/shared';

export default function AssessmentMeaning({ bundle }: { bundle: EvidenceBundle }) {
  const meaning = assessmentPresentation(bundle);
  return <section className="assessment-meaning" aria-label="Assessment meaning">
    <dl><div><dt>Assessment basis</dt><dd>{meaning.basisLabel}</dd></div>
      <div><dt>Physical verification</dt><dd>Not established by this application</dd></div></dl>
    <p>{meaning.explanation}</p>
    {meaning.legacy && <small>Historical bundle: the assessment basis is inferred from its format. No versioned reference policy was recorded.</small>}
  </section>;
}
