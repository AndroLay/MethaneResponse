import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import type { AgentTaskTool } from './agent-loop';
import { verifyInvestigationDecision } from '../../packages/shared/src/investigation-decision';

export type TrustedExportFixture = {path:string;expectedDigest:string};
/** Only the lab operator sets the fixture path and trust pin. The agent cannot
 * choose a file, override the digest, execute a shell or send data to a provider. */
export function createTrustedExportTool(fixture:TrustedExportFixture):AgentTaskTool {
  return {
    definition:{type:'function',function:{name:'verify_export',description:'Independently verify the operator-provisioned decision export against its separately supplied trusted digest. Read-only; does not verify blockchain receipts or physical outcomes.',parameters:{type:'object',additionalProperties:false,properties:{},required:[]}}},
    async execute(args) {
      if(!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length) throw Error('verify_export accepts no path, digest or other arguments.');
      if(!/^0x[a-f0-9]{64}$/.test(fixture.expectedDigest)) throw Error('Trusted export is not configured.');
      let handle:Awaited<ReturnType<typeof open>>|undefined;
      try {
        handle = await open(fixture.path,constants.O_RDONLY|constants.O_NOFOLLOW);
        const stat = await handle.stat();
        if(!stat.isFile() || stat.size > 16*1024*1024) throw Error('Invalid fixture');
        const raw = JSON.parse(await handle.readFile('utf8'));
        const decision = raw.decision || raw;
        const valid = await verifyInvestigationDecision(decision,fixture.expectedDigest);
        return {valid,expectedDigest:fixture.expectedDigest,digest:valid?decision.digest:null,sourceId:valid?decision.dossier.context.sourceId:null,
          revision:valid?decision.revision:null,chainStatus:'NOT_VERIFIED',physicalOutcomeEstablished:false,
          limitation:'Canonical decision and dossier integrity against the configured trust pin only. No blockchain RPC, human identity or physical outcome is verified.'};
      } catch { return {valid:false,chainStatus:'NOT_VERIFIED',physicalOutcomeEstablished:false,limitation:'Export unavailable or failed trusted integrity verification. No raw file or error content is disclosed.'}; }
      finally { await handle?.close(); }
    },
  };
}
