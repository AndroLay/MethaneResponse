/** Issue a short-lived scoped capability locally; never run this in CI logs. */
import { issueReviewerToken, type ReviewerScope } from '../apps/api/src/reviewer-auth';

const [reviewerId, rawScopes = 'private_read,review', rawSeconds = '3600'] = process.argv.slice(2);
if (!reviewerId || !process.env.REVIEWER_AUTH_SECRET) {
  console.error('Usage: REVIEWER_AUTH_SECRET=<server-secret> bun scripts/issue-reviewer-token.ts REVIEWER_ID private_read,review[,anchor] [seconds]');
  process.exit(2);
}

try {
  const scopes = rawScopes.split(',') as ReviewerScope[];
  const token = issueReviewerToken(process.env.REVIEWER_AUTH_SECRET, reviewerId, scopes, Number(rawSeconds));
  // The returned bearer capability is sensitive: store it in a password manager
  // or session secret store. Do not paste it into tickets, chat, or source control.
  process.stdout.write(`${token}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Cannot issue reviewer token');
  process.exit(2);
}
