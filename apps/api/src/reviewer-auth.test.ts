import { expect, test } from 'bun:test';
import { issueReviewerToken, verifyReviewerToken, scopedReviewerAuthConfigured } from './reviewer-auth';
const SECRET='c'.repeat(64);

test('signed reviewer token carries identity and least-privilege scope', () => {
  const token=issueReviewerToken(SECRET,'reviewer-alice',['private_read','review'],3600,1000);
  expect(verifyReviewerToken(`Bearer ${token}`,SECRET,'review',1200)?.reviewerId).toBe('reviewer-alice');
  expect(verifyReviewerToken(`Bearer ${token}`,SECRET,'private_read',1200)?.reviewerId).toBe('reviewer-alice');
  expect(verifyReviewerToken(`Bearer ${token}`,SECRET,'anchor',1200)).toBeNull();
});

test('tampering, expiry, future token and wrong secret fail closed', () => {
  const token=issueReviewerToken(SECRET,'reviewer-bob',['review'],3600,1000);
  expect(verifyReviewerToken(`Bearer ${token}x`,SECRET,'review',1200)).toBeNull();
  expect(verifyReviewerToken(`Bearer ${token}`,SECRET,'review',4600)).toBeNull();
  expect(verifyReviewerToken(`Bearer ${token}`,SECRET,'review',1)).toBeNull();
  expect(verifyReviewerToken(`Bearer ${token}`,'d'.repeat(64),'review',1200)).toBeNull();
});

test('weak secrets and impossible scopes or reviewer IDs are refused', () => {
  expect(scopedReviewerAuthConfigured('short')).toBe(false);
  expect(() => issueReviewerToken('short','alice',['review'],3600)).toThrow();
  expect(() => issueReviewerToken(SECRET,'space id',['review'],3600)).toThrow();
  expect(() => issueReviewerToken(SECRET,'alice',['anchor'],200_000)).toThrow();
});
