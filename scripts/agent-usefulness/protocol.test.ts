import { describe, expect, test } from 'bun:test';
import { CONDITION, PERSONAS, TASK_FAMILIES, buildDesign, buildRunnerPrompt } from './protocol';

describe('frozen synthetic-agent protocol', () => {
  test('schedules 24 matched pairs and 48 balanced episodes', () => {
    const design = buildDesign();
    expect(design.pairs).toHaveLength(24);
    expect(design.episodes).toHaveLength(48);
    for (const pair of design.pairs) {
      const episodes = design.episodes.filter(episode => episode.pairId === pair.pairId);
      expect(episodes.map(episode => episode.condition).sort()).toEqual([CONDITION.C0, CONDITION.C1].sort());
      expect(episodes.map(episode => episode.sequence).sort()).toEqual([1, 2]);
    }
  });

  test('passes each persona goal and limits into its runner prompt', () => {
    const design = buildDesign();
    const task = TASK_FAMILIES[0]!;
    for (const persona of PERSONAS) {
      const episode = design.episodes.find(item => item.personaId === persona.id && item.taskId === task.id && item.condition === CONDITION.C1)!;
      const prompt = buildRunnerPrompt(persona, task, episode);
      expect(prompt).toContain(persona.role);
      expect(prompt).toContain(persona.goal);
      expect(prompt).toContain(persona.constraints);
    }
  });

  test('keeps P8 open-ended without exposing a click list or frozen answers', () => {
    const persona = PERSONAS.find(item => item.id === 'P8')!;
    const episode = buildDesign().episodes.find(item => item.personaId === persona.id && item.taskId === 'T1' && item.condition === CONDITION.C1)!;
    const prompt = buildRunnerPrompt(persona, TASK_FAMILIES[0]!, episode);
    expect(prompt).not.toMatch(/getByRole|\/dashboard\/|click the [A-Za-z ]+ button/i);
    expect(prompt).not.toMatch(/selectedSourceIds|reportDigest|claimTextSha256/i);
  });

  test('labels the matched browser and manual-packet conditions distinctly', () => {
    const persona = PERSONAS[0]!;
    const design = buildDesign();
    const browserEpisode = design.episodes.find(item => item.personaId === persona.id && item.taskId === 'T1' && item.condition === CONDITION.C1)!;
    const packetEpisode = design.episodes.find(item => item.personaId === persona.id && item.taskId === 'T1' && item.condition === CONDITION.C0)!;
    expect(buildRunnerPrompt(persona, TASK_FAMILIES[0]!, browserEpisode)).toContain('assigned browser environment');
    expect(buildRunnerPrompt(persona, TASK_FAMILIES[0]!, packetEpisode)).toContain('assigned manual-packet environment');
  });
});
