import { describe, expect, test } from 'bun:test';

const operatorMetadataModule = await import('./operator-metadata').catch(() => null);

describe('MARS operator response metadata', () => {
  test('filters and counts only source-published notification and feedback fields', () => {
    expect(operatorMetadataModule).not.toBeNull();
    if (!operatorMetadataModule) return;

    const sources = [
      { sourceId: 'MARS-1', name: 'Alpha', region: 'North', notified: 'Yes', feedback: 'Received' },
      { sourceId: 'MARS-2', name: 'Beta', region: 'South', notified: 'No', feedback: '' , feedbackOperator: 'Published operator field' },
      { sourceId: 'MARS-3', name: 'Gamma', region: 'West', notified: '', feedback: '' },
    ];

    expect(operatorMetadataModule.summarizeOperatorMetadata(sources)).toEqual({
      sourceCount: 3,
      withNotificationMetadata: 2,
      withFeedbackMetadata: 2,
      withBoth: 2,
      withAnyMetadata: 2,
    });
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'all').map(source => source.sourceId)).toEqual(['MARS-1', 'MARS-2']);
    expect(operatorMetadataModule.filterOperatorRecords(sources, 'south', 'feedback').map(source => source.sourceId)).toEqual(['MARS-2']);
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'notification').map(source => source.sourceId)).toEqual(['MARS-1', 'MARS-2']);
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'both').map(source => source.sourceId)).toEqual(['MARS-1', 'MARS-2']);
  });

  test('excludes not-applicable sentinels but retains an explicit No status', () => {
    expect(operatorMetadataModule).not.toBeNull();
    if (!operatorMetadataModule) return;

    const sources = [
      { sourceId: 'NO-STATUS', notified: 'No', feedback: 'No' },
      { sourceId: 'NOTIFICATION-ONLY', notified: 'Yes', feedback: ' NOT APPLICABLE ', feedbackOperator: 'N/A' },
      { sourceId: 'FEEDBACK-ONLY', notified: 'Not Applicable', feedback: 'Not Applicable', feedbackOperator: 'Yes' },
      { sourceId: 'NOT-APPLICABLE', notified: 'Not Applicable', feedback: ' N/A ', feedbackOperator: 'Not Applicable', feedbackGovernment: 'not applicable' },
    ];

    expect(operatorMetadataModule.summarizeOperatorMetadata(sources)).toEqual({
      sourceCount: 4,
      withNotificationMetadata: 2,
      withFeedbackMetadata: 2,
      withBoth: 1,
      withAnyMetadata: 3,
    });
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'all').map(source => source.sourceId))
      .toEqual(['NO-STATUS', 'NOTIFICATION-ONLY', 'FEEDBACK-ONLY']);
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'notification').map(source => source.sourceId))
      .toEqual(['NO-STATUS', 'NOTIFICATION-ONLY']);
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'feedback').map(source => source.sourceId))
      .toEqual(['NO-STATUS', 'FEEDBACK-ONLY']);
    expect(operatorMetadataModule.filterOperatorRecords(sources, '', 'both').map(source => source.sourceId))
      .toEqual(['NO-STATUS']);
  });
});
