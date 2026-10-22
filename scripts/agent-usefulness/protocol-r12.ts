/**
 * Frozen protocol primitives for the synthetic agent practical-usefulness lab.
 *
 * This module contains no task answers. Gold outputs live beside the scenarios
 * and must never be exposed to a persona runner.
 */

export const PROTOCOL_ID = 'agent-practical-usefulness-2026-10-21-r12';
export const PROTOCOL_VERSION = 10;
export const EVIDENCE_DIRECTORY = 'docs/evidence/agent-practical-usefulness-2026-10-21-r12';

export const CONDITION = {
  C0: 'C0_MANUAL_PACKET',
  C1: 'C1_APPLICATION_BROWSER',
} as const;
export type Condition = (typeof CONDITION)[keyof typeof CONDITION];
export const CONDITIONS: readonly Condition[] = [CONDITION.C0, CONDITION.C1];

export type PersonaId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';
export type TaskId = 'T1' | 'T2' | 'T3';

export type Persona = {
  id: PersonaId;
  role: string;
  goal: string;
  constraints: string;
  /** Claims this role may assess. Out-of-scope claims must be delegated, not decided. */
  claimTypes: readonly ('source_detected' | 'operator_notified' | 'mitigation_confirmed')[];
  /** Capabilities provisioned only in the disposable localhost browser condition. */
  browserCapabilities: readonly string[];
};

export const PERSONAS: readonly Persona[] = [
  {
    id: 'P1',
    role: 'Environmental investigation analyst',
    goal: 'Choose sources under a bounded investigation capacity and explain the trade-off.',
    constraints: 'Must explain why a source is selected or excluded and cannot approve a repair.',
    claimTypes: ['source_detected', 'operator_notified'],
    browserCapabilities: ['cases', 'planner', 'evidence-auditor'],
  },
  {
    id: 'P2',
    role: 'Satellite methane researcher',
    goal: 'Inspect source and plume metadata, timestamps, flux, standard deviation and instrument coverage limits.',
    constraints: 'May describe observation metadata only; missing or later observations do not establish zero emissions or repair.',
    claimTypes: ['source_detected', 'mitigation_confirmed'],
    browserCapabilities: ['cases', 'map', 'evidence-auditor'],
  },
  {
    id: 'P3',
    role: 'MRV / claims auditor',
    goal: 'Test whether relevant evidence exists, separate declared authenticity from verified authenticity, and identify follow-up.',
    constraints: 'Cannot certify document authenticity or a physical mitigation outcome from a hash or a declared reference.',
    claimTypes: ['source_detected', 'operator_notified', 'mitigation_confirmed'],
    browserCapabilities: ['cases', 'evidence-auditor', 'decision-lab', 'verification'],
  },
  {
    id: 'P4',
    role: 'Public-sector case coordinator',
    goal: 'Assign an owner, next action and due date without asserting emissions reduction.',
    constraints: 'Has coordination authority only; no authority to declare reduced emissions or completed field work.',
    claimTypes: ['source_detected', 'operator_notified'],
    browserCapabilities: ['cases', 'planner', 'shared-work'],
  },
  {
    id: 'P5',
    role: 'Oil & gas response liaison',
    goal: 'Interpret an evidence request and produce a usable response format.',
    constraints: 'Cannot state that field work has occurred; feedback or an intent is not a post-action measurement.',
    claimTypes: ['operator_notified', 'mitigation_confirmed'],
    browserCapabilities: ['cases', 'evidence-request'],
  },
  {
    id: 'P6',
    role: 'NGO investigator',
    goal: 'Use open sources, trace provenance and avoid unsupported accusations.',
    constraints: 'Must preserve source and scope identifiers and must not convert omission into evidence of wrongdoing.',
    claimTypes: ['source_detected', 'operator_notified', 'mitigation_confirmed'],
    browserCapabilities: ['cases', 'evidence-auditor', 'observation-crosscheck'],
  },
  {
    id: 'P7',
    role: 'Security and blockchain engineer',
    goal: 'Review authorization, version chronology, tamper tests and local Anvil versus public-chain differences.',
    constraints: 'A receipt proves integrity and chronology only; it does not prove physical truth or reviewer identity.',
    claimTypes: ['source_detected', 'operator_notified', 'mitigation_confirmed'],
    browserCapabilities: ['verification', 'decision-freeze', 'anchor'],
  },
  {
    id: 'P8',
    role: 'Nontechnical first-time user',
    goal: 'Follow the interface, understand the result and identify the next step without prior repository knowledge.',
    constraints: 'Receives no click-by-click list and no internal procedure. Must abstain when the interface is ambiguous.',
    claimTypes: ['source_detected'],
    browserCapabilities: ['dashboard', 'cases', 'evidence-request'],
  },
];

export type TaskFamily = {
  id: TaskId;
  name: 'PLAN' | 'INVESTIGATE_REQUEST' | 'REVIEW_REVISIT_VERIFY';
  prompt: string;
  requiredOutputFields: readonly string[];
  stepLimit: number;
  timeLimitSeconds: number;
};

export const TASK_FAMILIES: readonly TaskFamily[] = [
  {
    id: 'T1',
    name: 'PLAN',
    prompt: 'With capacity 10 and the stated geographic quota, select a plan and explain why source A (the sourceAId named in the packet) is included while source B (the sourceBId named in the packet) is excluded. Then change capacity to 20 without automatically replacing the active plan. Record the selection, rationale and timestamps.',
    requiredOutputFields: ['selectedStrategy', 'selectedSourceIds', 'includedRationale', 'excludedRationale', 'activationStateBeforeCapacityChange', 'activationStateAfterCapacityChange'],
    stepLimit: 60,
    timeLimitSeconds: 1800,
  },
  {
    id: 'T2',
    name: 'INVESTIGATE_REQUEST',
    prompt: 'Choose exactly one source ID, one claim and one UTC scope. Evaluate the supplied evidence, preserve exact identifiers, state limitations, and produce an evidence request that satisfies every acceptance criterion.',
    requiredOutputFields: ['sourceId', 'claimType', 'claimText', 'scope', 'verdict', 'limitations', 'requestedEvidence', 'whyNeeded', 'acceptanceCriteria', 'ownerRole', 'dueDateOrReasonUnset', 'references'],
    stepLimit: 60,
    timeLimitSeconds: 1800,
  },
  {
    id: 'T3',
    name: 'REVIEW_REVISIT_VERIFY',
    prompt: 'Complete the dossier and authorized review in the throwaway environment, add the supplied evidence or snapshot change, show the reason for revisit without rewriting the historical decision, and verify the export against the separately trusted digest.',
    requiredOutputFields: ['workId', 'decisionDigest', 'disposition', 'rationale', 'revisitState', 'revisitReasonCodes', 'historicalDecisionUnchanged', 'verificationValid', 'physicalOutcomeEstablished'],
    stepLimit: 90,
    timeLimitSeconds: 2700,
  },
];

export type Episode = {
  episodeId: string;
  pairId: string;
  personaId: PersonaId;
  taskId: TaskId;
  condition: Condition;
  sequence: 1 | 2;
  stepLimit: number;
  timeLimitSeconds: number;
};

export type Pair = {
  pairId: string;
  personaId: PersonaId;
  taskId: TaskId;
  first: Condition;
  second: Condition;
};

/** 8 personas x 3 task families = 24 pairs; each pair runs both conditions = 48 episodes. */
export function buildDesign(): { pairs: Pair[]; episodes: Episode[] } {
  const pairs: Pair[] = [];
  const episodes: Episode[] = [];
  let index = 0;
  for (const persona of PERSONAS) {
    for (const task of TASK_FAMILIES) {
      const pairId = `${persona.id}-${task.id}`;
      // Alternate method order across pairs; the pair itself is still a matched comparison.
      const first = index % 2 === 0 ? CONDITION.C1 : CONDITION.C0;
      const second = first === CONDITION.C1 ? CONDITION.C0 : CONDITION.C1;
      pairs.push({ pairId, personaId: persona.id, taskId: task.id, first, second });
      for (const [position, condition] of [first, second].entries()) {
        episodes.push({
          episodeId: `${pairId}-${condition}`,
          pairId,
          personaId: persona.id,
          taskId: task.id,
          condition,
          sequence: (position + 1) as 1 | 2,
          stepLimit: task.stepLimit,
          timeLimitSeconds: task.timeLimitSeconds,
        });
      }
      index += 1;
    }
  }
  return { pairs, episodes };
}

/** The runner prompt in the lab protocol, parameterized without leaking gold data. */
export function buildRunnerPrompt(persona: Persona, task: TaskFamily, episode: Episode, taskPrompt = task.prompt): string {
  return `You are a synthetic task-testing agent, configured with the professional perspective ${persona.role}. You are not a real human, certified expert, regulator, or representative of a named organization.

Role goal: ${persona.goal}
Role limits: ${persona.constraints}

Your task ID is ${episode.episodeId}. Use only the assigned ${episode.condition === CONDITION.C1 ? 'browser' : 'manual-packet'} environment and the supplied source records. Do not access the gold answer, developer source, scoring files, or other agents' outputs. Preserve exact source ID, claim type, scope, timestamps, units, uncertainty, dataset version, and DEMO labels. Do not assume a notification is a repair, that a missing observation means zero emissions, or that a blockchain hash certifies physical outcomes. Attempt the assigned task within ${episode.stepLimit} actions and ${episode.timeLimitSeconds} wall-clock seconds. Record steps, evidence IDs, errors, requests for help, and final output using the prescribed JSON schema. If the source is insufficient, explicitly abstain and request precise next evidence. Never fabricate operations, citations, tool responses, human consent, or real-world actions.

Task: ${taskPrompt}`;
}

/** Forbidden claims checked by the artifact gates and report text. */
export const FORBIDDEN_CLAIM_PATTERNS: readonly RegExp[] = [
  /human pilot/i,
  /expert validation/i,
  /user satisfaction/i,
  /human time savings/i,
  /real mitigation verified/i,
  /ai 100% accurate/i,
  /production-scalable/i,
  /independent scientific gold/i,
];

/** Secret shapes checked by the artifact gate. Digests (64 hex) are allowed deliberately. */
export const SECRET_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'bearer_token', pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/ },
  { name: 'reviewer_token', pattern: /mrv1\.[A-Za-z0-9._~+/=-]{20,}/ },
  { name: 'provider_key', pattern: /\b(?:sk|pk)-[A-Za-z0-9_-]{20,}/ },
  { name: 'assigned_secret', pattern: /(?:AI_API_KEY|REVIEWER_AUTH_SECRET|HUMAN_REVIEW_TOKEN|AI_REVIEW_TOKEN|SEPOLIA_PRIVATE_KEY)\s*=\s*\S{8,}/ },
];

export const SAFETY_LIMITS = {
  maximumSecretsInArtifacts: 0,
  maximumUnauthorizedApprovals: 0,
  maximumAcceptedPhysicalOutcomeOverclaims: 0,
  maximumAcceptedTamperCases: 0,
  requiredDemoLabels: true,
} as const;
