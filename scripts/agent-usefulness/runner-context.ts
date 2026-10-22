type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

/** Keep the non-cleared linked report metadata out of all model requests. */
export function providerSafePacket(rawPacket: unknown): JsonObject {
  const packet = structuredClone(object(rawPacket));
  delete packet.externalEvidenceMetadata;
  packet.providerProcessingNote = 'External report metadata withheld; it was not cleared for provider processing. The linked report body is not included.';
  return packet;
}

/** Assignment details are shared with C1 without substituting for application evidence. */
export function buildTaskAssignment(taskId: 'T1' | 'T2' | 'T3', rawPacket: unknown): JsonObject {
  const packet = object(rawPacket);
  if (taskId === 'T1') {
    return {
      taskId,
      task: packet.task,
      parameters: packet.parameters,
      dataset: packet.dataset,
      candidateCount: packet.candidateCount,
    };
  }
  if (taskId === 'T2') {
    const safe = providerSafePacket(packet);
    return {
      taskId,
      dataset: safe.dataset,
      claim: safe.claim,
      demoSafetyNote: safe.demoSafetyNote,
      providerProcessingNote: safe.providerProcessingNote,
      requiredOutputFields: safe.requiredOutputFields,
    };
  }
  const decision = object(packet.historicalDecision);
  const revision = object(packet.newWorkRevision);
  return {
    taskId,
    label: packet.label,
    synthetic: packet.synthetic,
    workId: revision.workId ?? decision.workId,
    trustedDigest: packet.trustedDigest,
    verificationCommand: packet.verificationCommand,
    requiredOutputFields: packet.requiredOutputFields,
    limitations: packet.limitations,
  };
}

/** Redact exact values from report metadata if the local application renders them. */
export function redactProviderText(text: string, rawPacket: unknown): string {
  const packet = object(rawPacket);
  const entries = Array.isArray(packet.externalEvidenceMetadata) ? packet.externalEvidenceMetadata : [];
  const blocked = new Set<string>();
  for (const rawEntry of entries) {
    const entry = object(rawEntry);
    for (const value of Object.values(entry)) {
      if (typeof value === 'string' && value.trim().length >= 4) blocked.add(value.trim());
    }
  }
  let result = text;
  let redacted = false;
  for (const value of blocked) {
    if (result.includes(value)) {
      result = result.replaceAll(value, '[external report metadata withheld]');
      redacted = true;
    }
  }
  return redacted ? result : text;
}
