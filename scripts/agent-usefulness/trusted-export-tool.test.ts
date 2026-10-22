import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { investigationDigest } from '../../packages/shared/src/investigation-dossier';
import { createTrustedExportTool } from './trusted-export-tool';
const path = 'docs/evidence/r12-recovery-2026-10-21/frozen-investigation-decision.json';
const pin = '0x24d360507d8b6e4bfc6354863233ec661e894a4c6aba41311cc0fa04c31b6e1e';

test('read-only export tool uses the separately pinned TKM decision and never implies chain or physical proof',async () => {
  const result = await createTrustedExportTool({path,expectedDigest:pin}).execute({});
  expect(result).toMatchObject({valid:true,sourceId:'TKM_S_021',revision:1,digest:pin,chainStatus:'NOT_VERIFIED',physicalOutcomeEstablished:false});
  expect(result).not.toHaveProperty('reviewerId');
  expect(result).not.toHaveProperty('dossier');
});

test('tool rejects agent path/digest overrides, missing files, symlinks and altered then rehashed content',async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(),'methane-trusted-export-'));
  try {
    const tool = createTrustedExportTool({path,expectedDigest:pin});
    await expect(tool.execute({path:'/etc/passwd'})).rejects.toThrow();
    await expect(tool.execute({expectedDigest:'0x'+'a'.repeat(64)})).rejects.toThrow();
    expect(await createTrustedExportTool({path:join(directory,'missing'),expectedDigest:pin}).execute({})).toMatchObject({valid:false});
    const link = join(directory,'link'); await symlink(resolve(path),link);
    expect(await createTrustedExportTool({path:link,expectedDigest:pin}).execute({})).toMatchObject({valid:false});
    const raw = JSON.parse(await readFile(path,'utf8'));
    raw.decision.rationale = 'DEMO manipulated rationale after publication.';
    const {digest,...payload} = raw.decision; raw.decision.digest = await investigationDigest(payload);
    const altered = join(directory,'altered.json'); await writeFile(altered,JSON.stringify(raw));
    expect(await createTrustedExportTool({path:altered,expectedDigest:pin}).execute({})).toMatchObject({valid:false,physicalOutcomeEstablished:false});
  } finally {await rm(directory,{recursive:true,force:true});}
});
