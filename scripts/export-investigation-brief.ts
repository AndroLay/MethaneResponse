import { writeFile } from 'node:fs/promises';
import { investigationBrief } from '../packages/shared/src/investigation-brief';
export { investigationBrief } from '../packages/shared/src/investigation-brief';

if (import.meta.main) {
  try {
    const [input, digestFlag, digest, outputFlag, output, ...rest] = process.argv.slice(2);
    if (!input || digestFlag !== '--expected-digest' || !digest || outputFlag !== '--output' || !output || rest.length) {
      throw new Error('Usage: bun run export:investigation-brief <decision.json> --expected-digest <trusted 0x SHA-256> --output <new-brief.md>');
    }
    const file = Bun.file(input);
    if (file.size > 16 * 1024 * 1024) throw new Error('Decision exceeds 16 MiB.');
    const brief = await investigationBrief(await file.json(), digest);
    await writeFile(output, brief, { flag: 'wx', mode: 0o600 });
    console.log('Private Markdown handoff written. JSON and the trusted digest remain the verification artifacts.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Brief export failed.');
    process.exitCode = 1;
  }
}
