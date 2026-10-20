export { DecisionHistoryResponse, type DecisionSummary, type DecisionTarget } from '@methane/shared/investigation-decision-metadata';
const decisions:Record<string,string> = {request_more_evidence:'Request further evidence',accept_assessment:'Accept assessment record',reject_assessment:'Reject assessment record'};
const chains:Record<string,string> = {not_anchored:'No confirmed blockchain receipt',verified_latest:'Latest receipt verified against the configured chain',verified_historical:'Historical receipt verified against the configured chain'};
const revisits:Record<string,string> = {review_recommended:'Review recommended',context_notice:'Context update only',no_new_dependency_changes:'No new changes to decision dependencies',already_in_decision_snapshot:'This historical comparison is already included in the decision snapshot',next_snapshot_compared:'Compared against the next dataset snapshot',not_applicable:'No matching next-snapshot comparison',unavailable:'Next-snapshot comparison unavailable'};
export const decisionLabel = (value:string) => decisions[value] || value.replaceAll('_',' ');
export const chainStatusLabel = (value:string) => chains[value] || 'Chain status unavailable';
export const revisitLabel = (value:string) => revisits[value] || 'Review status unavailable';
