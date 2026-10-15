const researchSources = [
  {
    id: 'mars-dictionary',
    title: 'MARS plumes & sources data dictionary',
    citation: 'UNEP International Methane Emissions Observatory',
    href: 'https://methanedata.unep.org/dict-mars-emission-sources-plumes',
    summary: 'Defines source and single-overpass plume records, reported fields and uncertainty. Snapshot hashes preserve which published data version an audit used.',
  },
  {
    id: 'mars-methods',
    title: 'Technical Documentation for Methane Satellite Detection and Quantification',
    citation: 'UNEP IMEO · 2024',
    href: 'https://wedocs.unep.org/handle/20.500.11822/46241',
    summary: 'Describes satellite detection and flux-quantification methods. A mapped footprint or flux estimate remains an observation with method-specific uncertainty.',
  },
  {
    id: 'controlled-release',
    title: 'Single-blind validation of space-based point-source detection and quantification of onshore methane emissions',
    citation: 'Sherwin et al. · Scientific Reports · 2023',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9992358/',
    summary: 'Controlled-release results show that sensor, wind inputs and image conditions affect detection and quantification; an unavailable retrieval is not evidence of zero emissions.',
  },
  {
    id: 'alce-citations',
    title: 'Enabling Large Language Models to Generate Text with Citations',
    citation: 'Gao et al. · EMNLP · 2023',
    href: 'https://aclanthology.org/2023.emnlp-main.398/',
    summary: 'Evaluates answer correctness and citation quality separately, supporting exact citations and abstention. Its benchmark is not an evaluation result for this app.',
  },
] as const;

export default function ResearchSources() {
  return <section className="research-sources" aria-labelledby="research-sources-title">
    <h3 id="research-sources-title">Research &amp; methods</h3>
    <ul className="research-source-list">
      {researchSources.map(source => <li key={source.id}>
        <div className="research-source-copy">
          <strong>{source.title}</strong>
          <span className="research-source-citation">{source.citation}</span>
          <p>{source.summary}</p>
        </div>
        <a href={source.href} target="_blank" rel="noreferrer" aria-label={`Read ${source.title} in a new tab`}>Read source ↗</a>
      </li>)}
    </ul>
    <p className="research-source-note">These references inform product safeguards; they are not MethaneResponse performance results.</p>
  </section>;
}
