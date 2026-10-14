export type OperatorMetadataSource = {
  sourceId: string;
  name?: string;
  region?: string;
  country?: string;
  sector?: string;
  notified?: string;
  feedback?: string;
  feedbackOperator?: string;
  feedbackGovernment?: string;
};

export type OperatorMetadataFilter = 'all' | 'notification' | 'feedback' | 'both';

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function hasApplicableStatus(value?: string | null): boolean {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && normalized !== 'not applicable' && normalized !== 'n/a');
}

export function hasNotificationMetadata(source: OperatorMetadataSource): boolean {
  return hasApplicableStatus(source.notified);
}

export function hasFeedbackMetadata(source: OperatorMetadataSource): boolean {
  return hasApplicableStatus(source.feedback)
    || hasApplicableStatus(source.feedbackOperator)
    || hasApplicableStatus(source.feedbackGovernment);
}

export function summarizeOperatorMetadata(sources: OperatorMetadataSource[]) {
  let withNotificationMetadata = 0;
  let withFeedbackMetadata = 0;
  let withBoth = 0;
  for (const source of sources) {
    const hasNotification = hasNotificationMetadata(source);
    const hasFeedback = hasFeedbackMetadata(source);
    if (hasNotification) withNotificationMetadata += 1;
    if (hasFeedback) withFeedbackMetadata += 1;
    if (hasNotification && hasFeedback) withBoth += 1;
  }
  return {
    sourceCount: sources.length,
    withNotificationMetadata,
    withFeedbackMetadata,
    withBoth,
    withAnyMetadata: sources.filter(source => hasNotificationMetadata(source) || hasFeedbackMetadata(source)).length,
  };
}

export function filterOperatorRecords<T extends OperatorMetadataSource>(
  sources: T[],
  query: string,
  filter: OperatorMetadataFilter,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return sources.filter(source => {
    const hasNotification = hasNotificationMetadata(source);
    const hasFeedback = hasFeedbackMetadata(source);
    const matchesFilter = filter === 'all'
      ? hasNotification || hasFeedback
      : filter === 'notification'
        ? hasNotification
        : filter === 'feedback'
          ? hasFeedback
          : hasNotification && hasFeedback;
    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;
    return [source.sourceId, source.name, source.region, source.country, source.sector, source.notified, source.feedback, source.feedbackOperator, source.feedbackGovernment]
      .filter(hasText)
      .some(value => value!.toLocaleLowerCase().includes(normalizedQuery));
  });
}
