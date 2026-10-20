import type { InvestigationDecision } from './investigation-decision';
import type { SharedCaseWork } from './index';
import { evidenceUtcDay } from './evidence-policy';
import type { SnapshotTransition } from './snapshot-transition';
import { plannerCanonical } from './investigation-planner';
/** Decision dependencies, not an automatic rewrite of a historical determination. */
export function investigationDecisionRevisit(decision: InvestigationDecision, latest: SharedCaseWork, transition?: SnapshotTransition) {
  const frozen = decision.dossier.history.at(-1)!, reasons: { code:string; impact:'review_recommended'|'context_notice'; ids:string[] }[] = [];
  const add = (code:string,impact:'review_recommended'|'context_notice',ids:string[]) => { if (ids.length) reasons.push({code,impact,ids}); };
  if (plannerCanonical(frozen.context) !== plannerCanonical(latest.context) || frozen.workId !== latest.workId || latest.revision < frozen.revision) throw new Error('Revisit must match the same investigation history.');
  if (plannerCanonical(frozen.assessmentLink || null) !== plannerCanonical(latest.assessmentLink || null)) add('assessment_revision_changed','review_recommended',[latest.assessmentLink?.auditId || 'assessment_removed']);
  if (frozen.acceptanceCriteria !== latest.acceptanceCriteria) add('acceptance_criteria_changed','review_recommended',['acceptanceCriteria']);
  if (plannerCanonical(frozen.planLink || null) !== plannerCanonical(latest.planLink || null)) add('allocation_changed','context_notice',[latest.planLink?.planId || 'allocation_removed']);
  const priorResponses = new Set((frozen.requestEvents || []).filter(e => e.type === 'response_received').map(e => e.responseId));
  add('new_authorized_response','review_recommended',(latest.requestEvents || []).filter(e => e.type === 'response_received' && !priorResponses.has(e.responseId)).map(e => e.type === 'response_received' ? e.responseId : ''));
  const priorReviews = new Set((frozen.requestEvents || []).filter(e => e.type === 'response_reviewed').map(e => e.responseId));
  add('response_review_changed','review_recommended',(latest.requestEvents || []).filter(e => e.type === 'response_reviewed' && !priorReviews.has(e.responseId)).map(e => e.type === 'response_reviewed' ? e.responseId : ''));
  let snapshotComparison = transition ? 'not_applicable' : 'unavailable';
  if (transition?.before.datasetSnapshotId === frozen.context.datasetSnapshotId && transition.before.provenance.archiveSha256 === frozen.context.archiveSha256) {
    snapshotComparison = 'next_snapshot_compared';
    const scoped = transition.observationChanges.filter(c => [c.before,c.after].some(row => {
      const day = evidenceUtcDay(String(row?.date || ''));
      return row?.sourceId === frozen.context.sourceId && Boolean(day && frozen.scope && day >= frozen.scope.startDate && day <= frozen.scope.endDate && (!frozen.scope.observationId || frozen.scope.observationId === c.id));
    }));
    add('scoped_observation_changed','review_recommended',scoped.map(c => c.id));
    const fields = transition.sourceChanges.find(c => c.id === frozen.context.sourceId)?.changedFields || [];
    add('source_identity_changed','review_recommended',fields.filter(f => ['lat','lon'].includes(f)));
    add('source_context_metadata_changed','context_notice',fields.filter(f => !['lat','lon'].includes(f)));
  } else if (transition?.after.datasetSnapshotId === frozen.context.datasetSnapshotId && transition.after.provenance.archiveSha256 === frozen.context.archiveSha256) snapshotComparison = 'already_in_decision_snapshot';
  return { state:reasons.some(r => r.impact === 'review_recommended') ? 'review_recommended' : reasons.length ? 'context_notice' : 'no_new_dependency_changes',
    frozenWorkRevision:frozen.revision, latestWorkRevision:latest.revision, snapshotComparison, reasons, historicalDecisionUnchanged:true, physicalOutcomeEstablished:false };
}
