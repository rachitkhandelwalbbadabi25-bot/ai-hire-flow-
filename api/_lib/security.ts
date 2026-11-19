import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';

// Load Firebase projectId from local config (public identifier, safe to read)
let cachedProjectId: string | null = null;
function getFirebaseProjectId(): string {
  if (cachedProjectId) return cachedProjectId;
  if (process.env.FIREBASE_PROJECT_ID) {
    cachedProjectId = process.env.FIREBASE_PROJECT_ID.trim();
    return cachedProjectId;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg?.projectId) {
        cachedProjectId = String(cfg.projectId);
        return cachedProjectId;
      }
    }
  } catch {
    // Fallback below
  }
  cachedProjectId = 'gen-lang-client-0935933722';
  return cachedProjectId;
}

// =========================================================================
// 1. GOOGLE FIREBASE ID TOKEN CRYPTOGRAPHIC VERIFICATION (RS256)
// =========================================================================
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> | null = null;
let certsExpiresAt = 0;

async function fetchFirebasePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && cachedCerts && now < certsExpiresAt) {
    return cachedCerts;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(GOOGLE_CERTS_URL, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch Firebase public keys (HTTP ${res.status})`);
    }
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSec = maxAgeMatch ? Math.max(60, parseInt(maxAgeMatch[1], 10)) : 3600;
    const certs = (await res.json()) as Record<string, string>;
    cachedCerts = certs;
    certsExpiresAt = now + maxAgeSec * 1000;
    return certs;
  } finally {
    clearTimeout(timer);
  }
}

function base64UrlDecodeToBuffer(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

const ADMIN_EMAILS = new Set(['rrachitkhandelwal8@gmail.com']);

export async function verifyFirebaseIdToken(req: Request): Promise<VerifiedFirebaseUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: { alg?: string; kid?: string };
  let payload: {
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    exp?: number;
    iat?: number;
  };

  try {
    header = JSON.parse(base64UrlDecodeToBuffer(headerB64).toString('utf8'));
    payload = JSON.parse(base64UrlDecodeToBuffer(payloadB64).toString('utf8'));
  } catch {
    return null;
  }

  if (header.alg !== 'RS256' || !header.kid) return null;

  const projectId = getFirebaseProjectId();
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const nowSec = Math.floor(Date.now() / 1000);

  if (
    payload.aud !== projectId ||
    payload.iss !== expectedIssuer ||
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec ||
    typeof payload.iat !== 'number' ||
    payload.iat > nowSec + 300
  ) {
    return null;
  }

  try {
    let certs = await fetchFirebasePublicCerts(false);
    let certPem = certs[header.kid];
    if (!certPem) {
      certs = await fetchFirebasePublicCerts(true);
      certPem = certs[header.kid];
    }
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    const sigBuf = base64UrlDecodeToBuffer(signatureB64);
    const valid = verifier.verify(certPem, sigBuf);
    if (!valid) return null;

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    return {
      uid: payload.sub,
      email,
      emailVerified: Boolean(payload.email_verified),
      isAdmin: email.length > 0 && ADMIN_EMAILS.has(email),
    };
  } catch (err: any) {
    console.warn('[Security] Firebase token verification failed:', err?.message || err);
    return null;
  }
}

// =========================================================================
// 2. STRICT CORS ORIGIN ALLOWLIST
// =========================================================================
export function isAllowedOrigin(origin: string | undefined): boolean {
  // Same-origin requests or server-to-server calls without Origin header
  if (!origin) return true;

  const normalized = origin.replace(/\/+$/, '').toLowerCase();
  const staticAllowlist = new Set([
    'https://www.aihireflow.in',
    'https://aihireflow.in',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ]);

  if (process.env.APP_URL) {
    staticAllowlist.add(process.env.APP_URL.replace(/\/+$/, '').toLowerCase());
  }
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim().replace(/\/+$/, '').toLowerCase())
      .filter(Boolean)
      .forEach((o) => staticAllowlist.add(o));
  }

  if (staticAllowlist.has(normalized)) return true;

  // Allow Vercel preview deployments for this project
  if (/^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(normalized)) {
    return true;
  }

  return false;
}

// =========================================================================
// 3. SECURITY HEADERS MIDDLEWARE
// =========================================================================
export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(self)');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

// =========================================================================
// 4. IN-MEMORY SLIDING-WINDOW RATE LIMITER
// =========================================================================
interface RateBucket {
  timestamps: number[];
}

export function createRateLimiter({
  windowMs,
  maxRequests,
  keyPrefix,
}: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || 'unknown';

    const key = `${keyPrefix}:${rawIp}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length >= maxRequests) {
      const oldest = bucket.timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfterSec,
      });
    }

    bucket.timestamps.push(now);

    // Opportunistic memory bound cleanup
    if (buckets.size > 2000) {
      for (const [k, b] of buckets.entries()) {
        if (b.timestamps.length === 0 || now - b.timestamps[b.timestamps.length - 1] > windowMs) {
          buckets.delete(k);
        }
      }
    }

    return next();
  };
}

// =========================================================================
// 5. TIMING-SAFE HEX COMPARISON FOR HMAC SIGNATURES
// =========================================================================
export function timingSafeHexEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length || a.length === 0) return false;
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
