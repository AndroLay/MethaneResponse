export type IntelligenceCapability = {
  documentModelConfigured: boolean;
  humanReviewConfigured: boolean;
  chainConfigured: boolean;
  modelMode: string;
};

export function canSubmitHumanReview(
  capability: Pick<IntelligenceCapability, 'humanReviewConfigured'> | null | undefined,
  reviewerToken: string,
  reviewNote: string,
  isSaving: boolean,
) {
  return capability?.humanReviewConfigured === true
    && reviewerToken.trim().length > 0
    && reviewNote.trim().length >= 12
    && !isSaving;
}
