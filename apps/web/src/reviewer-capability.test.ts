import { expect, test } from 'bun:test';
import { canSubmitHumanReview } from './reviewer-capability';

const configured = { humanReviewConfigured: true };

test('review submission stays disabled until reviewer configuration and required fields are ready', () => {
  expect(canSubmitHumanReview(null, 'reviewer-token', 'This decision is supported.', false)).toBe(false);
  expect(canSubmitHumanReview({ humanReviewConfigured: false }, 'reviewer-token', 'This decision is supported.', false)).toBe(false);
  expect(canSubmitHumanReview(configured, ' ', 'This decision is supported.', false)).toBe(false);
  expect(canSubmitHumanReview(configured, 'reviewer-token', 'too short', false)).toBe(false);
  expect(canSubmitHumanReview(configured, ' reviewer-token ', '  This is long enough.  ', false)).toBe(true);
  expect(canSubmitHumanReview(configured, 'reviewer-token', 'This decision is supported.', true)).toBe(false);
});
