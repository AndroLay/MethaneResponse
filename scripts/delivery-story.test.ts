import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const narration = JSON.parse(readFileSync(new URL('docs/demo/delivery-2026-10-18/narration-en-story-v4.json', root), 'utf8')) as {
  durationSeconds: number;
  syntheticVoice: boolean;
  segments: { startSeconds: number; endSeconds: number; text: string }[];
};
const captions = readFileSync(new URL('docs/demo/delivery-2026-10-18/06-Captions-EN-story-v4.srt', root), 'utf8').trim();
const capture = readFileSync(new URL('scripts/capture-delivery-demo.ts', root), 'utf8');
const storyboard = readFileSync(new URL('docs/demo/delivery-2026-10-18/04-Storyboard-story-v4.md', root), 'utf8');

function parseSrtTime(value: string): number {
  const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(value);
  if (!match) throw new Error(`Invalid SRT time: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1_000;
}

test('story v4 narration, captions, and actual capture beats share one 4:50 timeline', () => {
  expect(narration.durationSeconds).toBe(290);
  expect(narration.syntheticVoice).toBe(true);
  expect(narration.segments[0]?.startSeconds).toBe(0);
  expect(narration.segments.at(-1)?.endSeconds).toBe(290);
  for (let index = 0; index < narration.segments.length; index += 1) {
    const current = narration.segments[index]!;
    expect(current.endSeconds).toBeGreaterThan(current.startSeconds);
    if (index > 0) expect(current.startSeconds).toBe(narration.segments[index - 1]!.endSeconds);
  }

  const cues = captions.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    const match = /^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/.exec(lines[1] || '');
    if (!match) throw new Error(`Invalid SRT cue: ${block}`);
    return { start: parseSrtTime(match[1]!), end: parseSrtTime(match[2]!), text: lines.slice(2).join('\n') };
  });
  expect(cues).toHaveLength(narration.segments.length);
  expect(cues.map(cue => [cue.start, cue.end])).toEqual(narration.segments.map(segment => [segment.startSeconds, segment.endSeconds]));
  expect(cues.every(cue => cue.text.split('\n').length <= 2)).toBe(true);

  const captureMarks = [...capture.matchAll(/mark\((\d+),/g)].map(match => Number(match[1]));
  expect(captureMarks).toEqual(narration.segments.map(segment => segment.startSeconds));
  expect(capture).toContain("'10-original-report-restored.png'");
  expect(capture).toContain('await holdUntil(273)');
  expect(capture).toContain('process.env.TMPDIR = tempRuntime.tempAlias');
  expect(capture).toContain('HOME: stateDir');
});

test('story states the evidence boundary and avoids unsupported outcome claims', () => {
  const narrativeText = narration.segments.map(segment => segment.text).join(' ').toLowerCase();
  expect(narrativeText).toContain('insufficient evidence');
  expect(narrativeText).toContain('does not contradict it or say the action failed');
  expect(narrativeText).toContain('does not contact an operator');
  expect(narrativeText).toContain('not live ai or public blockchain');
  expect(narrativeText).toContain('emissions avoided and reviewer time saved have not been measured');
  expect(storyboard).toContain('What the proof establishes');
  expect(storyboard).toContain('not that mitigation occurred');
});
