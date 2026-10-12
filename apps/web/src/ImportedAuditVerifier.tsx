import { useState, type ChangeEvent } from 'react';
import { verifyImportedAuditReport, type ImportedAuditVerification } from './imported-audit-verifier';

const MAX_REPORT_BYTES = 5 * 1024 * 1024;

function receiptLabel(status: ImportedAuditVerification['receipt']): string {
  if (status === 'not_present') return 'Tidak ada receipt blockchain pada file ini.';
  if (status === 'metadata_matches_event_unverified') return 'Metadata receipt konsisten; transaksi dan event blockchain belum diverifikasi dari browser ini.';
  return 'Metadata receipt tidak lengkap atau tidak cocok dengan hash transaksi.';
}

export default function ImportedAuditVerifier() {
  const [verification, setVerification] = useState<ImportedAuditVerification | null>(null);
  const [checking, setChecking] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function checkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setVerification(null);
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_REPORT_BYTES) {
      setFileError('Ukuran berkas melewati batas 5 MiB.');
      return;
    }

    setChecking(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setVerification(await verifyImportedAuditReport(parsed));
    } catch {
      setFileError('Berkas bukan JSON yang dapat dibaca.');
    } finally {
      setChecking(false);
    }
  }

  return <section className="panel imported-audit-verifier" aria-labelledby="imported-audit-title">
    <div className="panel-head">
      <div>
        <div className="panel-title" id="imported-audit-title">Verifikasi berkas laporan</div>
        <div className="panel-subtitle">Periksa bundle audit JSON langsung di browser ini</div>
      </div>
    </div>
    <p className="imported-audit-intro">Pilih laporan yang diunduh untuk menghitung ulang SHA-256 bundle dan mencocokkan ringkasan audit. Isi berkas diproses lokal dan tidak diunggah.</p>
    <label className="imported-audit-file">
      <span>Pilih berkas laporan JSON</span>
      <input type="file" accept=".json,application/json" aria-label="Pilih berkas laporan JSON" onChange={event => void checkFile(event)}/>
      <small>Batas ukuran 5 MiB</small>
    </label>
    {checking && <p className="imported-audit-state" role="status">Menghitung dan memeriksa digest…</p>}
    {fileError && <p className="imported-audit-state imported-audit-error" role="alert">{fileError}</p>}
    {verification?.localDigest === 'valid' && <div className="imported-audit-result imported-audit-valid" role="status">
      <strong>Digest SHA-256 bundle audit cocok.</strong>
      <dl>
        <div><dt>Sumber</dt><dd>{verification.sourceId}</dd></div>
        <div><dt>Revisi</dt><dd>{verification.revision}</dd></div>
        <div><dt>Klaim</dt><dd>{verification.claimType?.replaceAll('_', ' ')}</dd></div>
        <div><dt>Hasil</dt><dd>{verification.result?.replaceAll('_', ' ')}</dd></div>
        {verification.reviewStatus && <div><dt>Review</dt><dd>{verification.reviewStatus.replaceAll('_', ' ')}</dd></div>}
        <div className="imported-audit-hash"><dt>SHA-256</dt><dd>{verification.bundleHash}</dd></div>
      </dl>
      {verification.synthetic && <p className="imported-audit-caution"><strong>DEMO sintesis</strong> · audit ini bukan kasus MARS atau bukti mitigasi nyata.</p>}
      <p>{receiptLabel(verification.receipt)}</p>
      {verification.exportContext === 'not_in_audit_hash' && <p className="imported-audit-caution">Field pembungkus ekspor—misalnya metadata dataset dan daftar observasi di luar bundle—tidak tercakup oleh digest audit ini.</p>}
      {verification.exportContext === 'manifest_valid' && <p className="imported-audit-caution">Checksum ekspor SHA-256 cocok untuk konteks dataset dan observasi. Checksum ini tidak ditandatangani atau ditambatkan ke blockchain.</p>}
      {verification.exportContext === 'manifest_unavailable' && <p className="imported-audit-caution">Bundle audit dapat diperiksa, tetapi Web Crypto tidak tersedia untuk memeriksa checksum konteks ekspor.</p>}
      <p className="imported-audit-limit">Digest membuktikan integritas isi bundle terhadap hash tersimpan. Itu tidak membuktikan keaslian dokumen, mitigasi fisik, atau pengurangan emisi.</p>
      {verification.receipt === 'metadata_matches_event_unverified' && <p className="imported-audit-limit">Untuk memeriksa event dan issuer di Sepolia, gunakan verifier CLI dengan RPC baca-saja dan alamat registry yang sesuai.</p>}
    </div>}
    {verification?.localDigest === 'invalid' && <div className="imported-audit-result imported-audit-error" role="alert">
      <strong>Verifikasi bundle gagal.</strong>
      <p>{verification.message || 'Digest bundle atau metadata audit tidak cocok.'}</p>
    </div>}
    {verification?.localDigest === 'unavailable' && <div className="imported-audit-result imported-audit-caution" role="status">
      <strong>SHA-256 tidak tersedia di browser ini.</strong>
      <p>{verification.message}</p>
    </div>}
  </section>;
}
