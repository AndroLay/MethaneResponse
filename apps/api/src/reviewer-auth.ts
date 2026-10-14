import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ReviewerScope = 'private_read' | 'review' | 'anchor';
export type ReviewerIdentity = { reviewerId: string; scopes: ReviewerScope[] };

const audience = 'methane-response-reviewer-v1';
const allowedScopes: readonly ReviewerScope[] = ['private_read', 'review', 'anchor'];
const reviewerIdPattern = /^[a-zA-Z0-9._:@-]{3,96}$/;
const tokenPartPattern = /^[A-Za-z0-9_-]+$/;

type ReviewerPayload = {
  aud: typeof audience;
  sub: string;
  scopes: ReviewerScope[];
  iat: number;
  exp: number;
  nonce: string;
};

function hasStrongSecret(secret: string | undefined): secret is string {
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32
    && Buffer.byteLength(secret, 'utf8') <= 4096;
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(`mrv1.${payload}`).digest('base64url');
}

export function scopedReviewerAuthConfigured(secret: string | undefined) {
  return hasStrongSecret(secret);
}

export function issueReviewerToken(
  secret: string,
  reviewerId: string,
  scopes: ReviewerScope[],
  expiresInSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!hasStrongSecret(secret)) throw new Error('REVIEWER_AUTH_SECRET must be at least 32 bytes long');
  if (!reviewerIdPattern.test(reviewerId)) throw new Error('Invalid reviewer identity');
  if (!Array.isArray(scopes) || scopes.length === 0 || scopes.some(scope => !allowedScopes.includes(scope))) {
    throw new Error('Invalid reviewer scopes');
  }
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 86_400) {
    throw new Error('Token lifetime must be 1 minute to 24 hours');
  }
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 1 || !Number.isSafeInteger(nowSeconds + expiresInSeconds)) {
    throw new Error('Invalid token issue time');
  }
  const payload: ReviewerPayload = {
    aud: audience,
    sub: reviewerId,
    scopes: [...new Set(scopes)],
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
    nonce: randomBytes(16).toString('base64url'),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `mrv1.${body}.${signature(body, secret)}`;
}

function isPayload(value: unknown): value is ReviewerPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return payload.aud === audience
    && typeof payload.sub === 'string' && reviewerIdPattern.test(payload.sub)
    && Array.isArray(payload.scopes) && payload.scopes.length > 0
    && payload.scopes.every(scope => typeof scope === 'string' && allowedScopes.includes(scope as ReviewerScope))
    && new Set(payload.scopes).size === payload.scopes.length
    && Number.isSafeInteger(payload.iat) && Number.isSafeInteger(payload.exp)
    && typeof payload.nonce === 'string' && /^[A-Za-z0-9_-]{12,64}$/.test(payload.nonce);
}

export function verifyReviewerToken(
  header: string | undefined,
  secret: string | undefined,
  requiredScope: ReviewerScope,
  nowSeconds = Math.floor(Date.now() / 1000),
): ReviewerIdentity | null {
  if (!hasStrongSecret(secret) || !allowedScopes.includes(requiredScope) || !header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  if (token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'mrv1' || !tokenPartPattern.test(parts[1]) || !tokenPartPattern.test(parts[2])) return null;
  const expected = Buffer.from(signature(parts[1], secret));
  const supplied = Buffer.from(parts[2]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!isPayload(payload) || !Number.isSafeInteger(nowSeconds)
      || payload.iat > nowSeconds + 30 || payload.exp <= nowSeconds
      || payload.exp > payload.iat + 86_400 || !payload.scopes.includes(requiredScope)) return null;
    return { reviewerId: payload.sub, scopes: payload.scopes };
  } catch {
    return null;
  }
}
