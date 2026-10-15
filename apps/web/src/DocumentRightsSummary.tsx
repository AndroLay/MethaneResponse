type DocumentRightsItem = {
  id: string;
  title: string;
  rightsDeclared?: 'owned' | 'explicit_permission' | 'open_license';
  licenseName?: string;
  licenseUrl?: string;
  attribution?: string;
  licenseScopeConfirmed?: true;
};

export default function DocumentRightsSummary({ documents }: { documents: readonly DocumentRightsItem[] }) {
  if (documents.length === 0) return null;

  return (
    <section className="intel-doc-rights" aria-label="Document processing-rights declarations">
      <h4>Document processing-rights declarations</h4>
      <ul>
        {documents.map((document) => {
          const declaration = document.rightsDeclared === 'owned'
            ? 'Submitter declared ownership'
            : document.rightsDeclared === 'explicit_permission'
              ? 'Submitter declared explicit permission to process'
              : document.rightsDeclared === 'open_license'
                ? `Submitter declared open-license basis: ${document.licenseName || 'license name missing'}`
                : 'No rights declaration recorded in this audit';

          return (
            <li key={document.id}>
              <div>
                <b>{document.title}</b>
                <span>{declaration}</span>
              </div>
              {document.rightsDeclared === 'open_license' && <small>
                {document.licenseScopeConfirmed ? 'Submitter confirmed processing scope.' : 'No processing-scope confirmation recorded.'}
                {document.licenseUrl ? ` License reference: ${document.licenseUrl}.` : ''}
                {document.attribution ? ` Attribution: ${document.attribution}` : ''}
              </small>}
              <small>The submitter’s declaration is not independently verified.</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
