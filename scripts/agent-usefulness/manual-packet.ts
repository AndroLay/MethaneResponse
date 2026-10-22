import { PlannerInput, plannerScores, type PlannerCandidate } from '../../packages/shared/src/investigation-planner';
import type { FunctionTool } from './provider';

type CandidateRow = PlannerCandidate & { rank: number | null; weightedScore: number | null; magnitudePoints: number | null; recurrencePoints: number | null };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function candidateRow(candidate: PlannerCandidate, rank: number | null, score?: { magnitudePoints: number; recurrencePoints: number; score: number }): CandidateRow {
  return {
    sourceId: candidate.sourceId,
    country: candidate.country,
    sector: candidate.sector,
    medianFluxKgHr: candidate.medianFluxKgHr,
    medianUncertaintyKgHr: candidate.medianUncertaintyKgHr,
    distinctDates: candidate.distinctDates,
    observationCount: candidate.observationCount,
    missingFluxCount: candidate.missingFluxCount,
    lastObserved: candidate.lastObserved,
    rank,
    weightedScore: score?.score ?? null,
    magnitudePoints: score?.magnitudePoints ?? null,
    recurrencePoints: score?.recurrencePoints ?? null,
  };
}

/** Read-only spreadsheet-like access to the frozen C0 packet; it never selects or activates a plan. */
export function createManualPacketTool(rawPacket: unknown): {
  definition: FunctionTool;
  execute: (arguments_: unknown) => Record<string, unknown>;
} {
  const packet = record(rawPacket);
  const input = PlannerInput.parse({ dataset: packet.dataset, parameters: packet.parameters, candidates: packet.candidates });
  const scoreMap = plannerScores(input.candidates, input.parameters);
  const ranked = input.candidates.filter(row => scoreMap.has(row.sourceId)).sort((a, b) =>
    scoreMap.get(b.sourceId)!.score - scoreMap.get(a.sourceId)!.score || a.sourceId.localeCompare(b.sourceId));
  const rankById = new Map(ranked.map((row, index) => [row.sourceId, index + 1]));

  return {
    definition: {
      type: 'function',
      function: {
        name: 'read_manual_packet',
        description: 'Read a bounded page of the frozen source table sorted by the written weighted score, or look up named source rows. This tool does not apply country quotas, select a plan, or reveal a gold answer.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            operation: { type: 'string', enum: ['ranked_page', 'find_sources'] },
            offset: { type: 'integer', minimum: 0 },
            limit: { type: 'integer', minimum: 1, maximum: 50 },
            sourceIds: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 128 } },
          },
          required: ['operation'],
        },
      },
    },
    execute(arguments_) {
      const args = record(arguments_);
      if (args.operation === 'ranked_page') {
        const offset = args.offset === undefined ? 0 : args.offset;
        const limit = args.limit === undefined ? 25 : args.limit;
        if (!Number.isSafeInteger(offset) || Number(offset) < 0) throw new Error('offset must be a nonnegative integer');
        if (!Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > 50) throw new Error('limit must be between 1 and 50');
        return {
          totalEligible: ranked.length,
          offset,
          rows: ranked.slice(Number(offset), Number(offset) + Number(limit)).map((row, index) => candidateRow(row, Number(offset) + index + 1, scoreMap.get(row.sourceId))),
        };
      }
      if (args.operation === 'find_sources') {
        if (!Array.isArray(args.sourceIds) || args.sourceIds.length > 10 || args.sourceIds.some(id => typeof id !== 'string')) {
          throw new Error('sourceIds must contain at most 10 string IDs');
        }
        const requested = new Set(args.sourceIds as string[]);
        return {
          rows: input.candidates.filter(row => requested.has(row.sourceId)).map(row => candidateRow(row, rankById.get(row.sourceId) ?? null, scoreMap.get(row.sourceId))),
          notFound: [...requested].filter(id => !input.candidates.some(row => row.sourceId === id)),
        };
      }
      throw new Error('operation must be ranked_page or find_sources');
    },
  };
}
