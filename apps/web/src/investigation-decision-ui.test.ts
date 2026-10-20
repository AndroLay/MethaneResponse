import { expect, test } from 'bun:test';
import { DecisionHistoryResponse, decisionLabel, chainStatusLabel, revisitLabel } from './investigation-decision-ui';
test('decision history validates identifiers, bounded versions, receipt metadata and configured targets', () => {
  const raw = {decisions:[{digest:'0x'+'a'.repeat(64),revision:1,workRevision:5,reviewerId:'DEMO-reviewer',reviewedAt:'2026-10-20T10:00:00.000Z',disposition:'request_more_evidence',receipt:null}],target:null};
  expect(DecisionHistoryResponse.parse(raw).decisions[0].workRevision).toBe(5);
  expect(DecisionHistoryResponse.safeParse({...raw,decisions:[{...raw.decisions[0],digest:'altered'}]}).success).toBe(false);
  expect(DecisionHistoryResponse.safeParse({...raw,decisions:[{...raw.decisions[0],revision:0}]}).success).toBe(false);
  expect(DecisionHistoryResponse.safeParse({...raw,target:{chainId:1,registryAddress:'not-an-address',issuer:null,writeEnabled:true}}).success).toBe(false);
});
test('workflow labels distinguish evidence review, integrity and incorporated historical changes', () => {
  expect(decisionLabel('request_more_evidence')).toBe('Request further evidence');
  expect(chainStatusLabel('not_anchored')).toBe('No confirmed blockchain receipt');
  expect(revisitLabel('already_in_decision_snapshot')).toBe('This historical comparison is already included in the decision snapshot');
});
