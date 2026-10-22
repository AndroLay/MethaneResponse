import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { codexMcpBridgeExecutable } from './codex-cli-runner';
import { readBridgeDiagnostic } from './bridge-diagnostics';

test('the Codex bridge exposes only submit_result for a packet task without tools', async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'methane-mcp-test-'));
  const contextPath = join(directory, 'context.json');
  const resultPath = join(directory, 'result.json');
  const context = {
    episode: { episodeId: 'DEMO-T2-C0', pairId: 'DEMO', personaId: 'P1', taskId: 'T2', condition: 'C0_MANUAL_PACKET' },
    packet: { synthetic: true }, appOrigin: null, initialPath: null, stepLimit: 4,
  };
  await writeFile(contextPath, JSON.stringify(context), { encoding: 'utf8', mode: 0o600, flag: 'wx' });

  try {
    const child = spawn(codexMcpBridgeExecutable(process.env), [join(import.meta.dir, 'codex-mcp-server.ts')], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH || '/usr/bin:/bin',
        HOME: directory,
        TMPDIR: process.env.TMPDIR || tmpdir(),
        AGENT_LAB_CONTEXT_PATH: contextPath,
        AGENT_LAB_RESULT_PATH: resultPath,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const requests = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'submit_result', arguments: { status: 'completed', assistance: 'none', output: { synthetic: true } } } },
    ];
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on('data', chunk => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', chunk => stderrChunks.push(Buffer.from(chunk)));
    const closed = new Promise<number | null>((resolve, reject) => {
      child.once('close', resolve);
      child.once('error', reject);
    });
    child.stdin.end(requests.map(value => JSON.stringify(value)).join('\n') + '\n');
    const [exitCode] = await Promise.all([closed]);
    const stdout = Buffer.concat(stdoutChunks).toString('utf8');
    const stderr = Buffer.concat(stderrChunks).toString('utf8');
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    const replies = stdout.trim().split('\n').map(line => JSON.parse(line) as { id: number; result?: { tools?: Array<{ name: string }>; content?: Array<{ text?: string }> } });
    expect(replies[1]?.result?.tools?.map(tool => tool.name)).toEqual(['submit_result']);
    expect(JSON.parse(await readFile(resultPath, 'utf8'))).toMatchObject({ submitted: true, status: 'completed', output: { synthetic: true }, steps: 0 });
    expect(await readBridgeDiagnostic(resultPath)).toMatchObject({ stage: 'closed', submitted: true, steps: 0 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('browser initialization failure writes safe diagnostics without a submitted result', async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'methane-mcp-init-failure-'));
  const contextPath = join(directory,'context.json'), resultPath = join(directory,'result.json');
  await writeFile(contextPath, JSON.stringify({ episode:{condition:'C1_APPLICATION_BROWSER',taskId:'T3'},packet:{},appOrigin:'http://127.0.0.1:1',initialPath:'/dashboard/reports',stepLimit:4 }), {mode:0o600});
  try {
    const child = spawn(codexMcpBridgeExecutable(process.env), [join(import.meta.dir,'codex-mcp-server.ts')], {
      env:{PATH:process.env.PATH,HOME:directory,TMPDIR:directory,AGENT_LAB_CONTEXT_PATH:contextPath,AGENT_LAB_RESULT_PATH:resultPath,PLAYWRIGHT_CHROMIUM_EXECUTABLE:join(directory,'does-not-exist')},stdio:['pipe','ignore','ignore'],
    });
    child.stdin.end();
    const code = await new Promise<number|null>((resolve,reject) => {child.once('close',resolve);child.once('error',reject);});
    expect(code).toBe(1);
    expect(await readBridgeDiagnostic(resultPath)).toMatchObject({stage:'initialization_failed',submitted:false,steps:0,failureCount:1});
    await expect(readFile(resultPath,'utf8')).rejects.toThrow();
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('T3 explicitly provisioned export is verified through MCP without a shell or agent-controlled trust pin',async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(),'methane-mcp-verifier-'));
  const contextPath=join(directory,'context.json'),resultPath=join(directory,'result.json');
  await writeFile(contextPath,JSON.stringify({episode:{taskId:'T3',condition:'C0_MANUAL_PACKET'},packet:{},appOrigin:null,initialPath:null,stepLimit:3,
    verificationFixture:{path:resolve('docs/evidence/r12-recovery-2026-10-21/frozen-investigation-decision.json'),expectedDigest:'0x24d360507d8b6e4bfc6354863233ec661e894a4c6aba41311cc0fa04c31b6e1e'}}),{mode:0o600});
  try {
    const child=spawn(codexMcpBridgeExecutable(process.env),[join(import.meta.dir,'codex-mcp-server.ts')],{env:{PATH:process.env.PATH,HOME:directory,TMPDIR:directory,AGENT_LAB_CONTEXT_PATH:contextPath,AGENT_LAB_RESULT_PATH:resultPath},stdio:['pipe','pipe','pipe']});
    let stdout='';child.stdout.on('data',chunk=>stdout+=chunk.toString());child.stderr.on('data',()=>{});
    const closed=new Promise<number|null>((resolve,reject)=>{child.once('close',resolve);child.once('error',reject);});
    child.stdin.end([
      {jsonrpc:'2.0',id:1,method:'tools/list'},
      {jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'verify_export',arguments:{}}},
      {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'verify_export',arguments:{path:'/etc/passwd'}}},
    ].map(row=>JSON.stringify(row)).join('\n')+'\n');
    expect(await closed).toBe(0);
    const replies=stdout.trim().split('\n').map(line=>JSON.parse(line));
    expect(replies[0].result.tools.map((tool:{name:string})=>tool.name)).toEqual(['verify_export','submit_result']);
    expect(JSON.parse(replies[1].result.content[0].text)).toMatchObject({valid:true,sourceId:'TKM_S_021',chainStatus:'NOT_VERIFIED'});
    expect(replies[2].result.isError).toBe(true);
    expect(await readBridgeDiagnostic(resultPath)).toMatchObject({steps:2,submitted:false,toolNames:['verify_export','verify_export']});
  } finally {await rm(directory,{recursive:true,force:true});}
});
