export type ContinuationAttempt = {
  episodeId: string;
  status: string;
  timing: {
    inputTokens: number | null;
    outputTokens: number | null;
    modelCalls: number;
    failures: string[];
  };
};

export type ContinuationAttemptSummary<T extends ContinuationAttempt> = {
  reusable: T[];
  capStopped: T[];
  usage: { totalTokens: number; providerCalls: number };
};

/** Rebinds only the revision identifier; every task datum remains byte-equivalent after JSON normalization. */
export function rebindProtocolId<T extends Record<string, unknown>>(value: T, parentProtocolId: string, childProtocolId: string, required = false): T {
  if (!Object.hasOwn(value, 'protocolId')) {
    if (required) throw new Error('inherited packet has no protocolId');
    return value;
  }
  if (value.protocolId !== parentProtocolId) throw new Error('inherited artifact protocolId does not match its parent revision');
  return { ...value, protocolId: childProtocolId };
}

export function normalizeProtocolId(value: unknown, protocolId: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return Object.hasOwn(record, 'protocolId') ? { ...record, protocolId } : value;
}

/** Accepts completed and abstained attempts, while retaining exactly one over-cap attempt for replay. */
export function summarizeContinuationAttempts<T extends ContinuationAttempt>(records: T[]): ContinuationAttemptSummary<T> {
  const ids = new Set<string>();
  let totalTokens = 0;
  let providerCalls = 0;
  const reusable: T[] = [];
  const capStopped: T[] = [];

  for (const record of records) {
    if (!record.episodeId || ids.has(record.episodeId)) throw new Error('parent attempts contain a missing or duplicate episodeId');
    ids.add(record.episodeId);
    const { inputTokens, outputTokens, modelCalls, failures } = record.timing;
    if (!Number.isSafeInteger(inputTokens) || Number(inputTokens) < 0
        || !Number.isSafeInteger(outputTokens) || Number(outputTokens) < 0
        || !Number.isSafeInteger(modelCalls) || modelCalls < 0 || !Array.isArray(failures)) {
      throw new Error(`parent attempt usage is invalid for ${record.episodeId}`);
    }
    totalTokens += Number(inputTokens) + Number(outputTokens);
    providerCalls += modelCalls;
    if (!Number.isSafeInteger(totalTokens) || !Number.isSafeInteger(providerCalls)) throw new Error('parent aggregate usage exceeds safe integer bounds');

    if (record.status === 'completed' || record.status === 'abstained') reusable.push(record);
    else if (record.status === 'failed' && failures.includes('lab_token_cap')) capStopped.push(record);
    else throw new Error(`parent attempt has an unsupported status or failure for ${record.episodeId}`);
  }

  if (capStopped.length !== 1) throw new Error(`expected exactly one parent attempt stopped by the token cap, found ${capStopped.length}`);
  return { reusable, capStopped, usage: { totalTokens, providerCalls } };
}
