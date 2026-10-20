import { createRemoteJWKSet, jwtVerify } from 'jose';
import { db } from './db';
import { NextRequest } from 'next/server';
let verifier: ReturnType<typeof createRemoteJWKSet> | undefined;
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function jwks() {
  if (!verifier) {
    const issuer = process.env.IS_ISSUER;
    if (!issuer || !issuer.startsWith('https://')) throw new Error('IS_ISSUER must be HTTPS');
    const base = new URL(issuer);
    const url = process.env.IS_JWKS_URL ? new URL(process.env.IS_JWKS_URL) : new URL('/.well-known/jwks.json', base);
    if (url.protocol !== 'https:') throw new Error('IS_JWKS_URL must be HTTPS');
    verifier = createRemoteJWKSet(url);
  }
  return verifier;
}
export async function identity(req: NextRequest): Promise<string> {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '');
  if (!match) throw new HttpError(401, 'Bearer access token required');
  const issuer = process.env.IS_ISSUER, audience = process.env.IS_AUDIENCE;
  if (!issuer || !audience) throw new Error('IS issuer/audience are not configured');
  try {
    const { payload } = await jwtVerify(match[1], jwks(), { issuer, audience,
      algorithms: ['RS256','ES256','PS256'], clockTolerance: 5 });
    if (!payload.sub) throw new Error('Missing subject');
    return payload.sub;
  } catch { throw new HttpError(401, 'Invalid IS access token'); }
}
export async function requireOperator(req: NextRequest): Promise<string> {
  const subject = await identity(req);
  const result = await db().query('SELECT 1 FROM platform_operators WHERE subject=$1 AND enabled=true', [subject]);
  if (!result.rowCount) throw new HttpError(403, 'Nexus operator role required');
  return subject;
}
