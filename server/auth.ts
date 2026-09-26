import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

// Token revocation set
const revokedTokens = new Set<string>();

// Persistent server session secret derived deterministically if SESSION_SECRET is not provided
const DEFAULT_SESSION_SECRET = 'vanguard_opportunity_platform_admin_session_secret_key_2026';
const SERVER_SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.ADMIN_PASSWORD
    ? crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD + '_vgd_salt').digest('hex')
    : DEFAULT_SESSION_SECRET);

// In-memory active session tokens for legacy/fast lookup
const activeSessions = new Map<string, { email: string; expiresAt: number }>();

interface TokenPayload {
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Retrieves configured admin credentials from environment variables,
 * falling back to default administrator credentials if unset.
 */
export function getAdminCredentials(): { email: string; passwordHash: string } {
  const email = (process.env.ADMIN_EMAIL || 'hassanabdullahibkd2002@gmail.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'H@12345678';

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  return { email, passwordHash };
}

/**
 * Verifies admin login credentials using constant-time buffer comparison.
 */
export function verifyAdminCredentials(inputEmail: string, inputPassword: string): boolean {
  if (!inputEmail || !inputPassword) return false;

  const creds = getAdminCredentials();
  const normInputEmail = inputEmail.trim().toLowerCase();

  if (normInputEmail !== creds.email) {
    return false;
  }

  const inputHash = crypto.createHash('sha256').update(inputPassword).digest('hex');
  const inputBuffer = Buffer.from(inputHash, 'utf8');
  const targetBuffer = Buffer.from(creds.passwordHash, 'utf8');

  if (inputBuffer.length !== targetBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, targetBuffer);
}

/**
 * Creates a cryptographically signed, stateless session token.
 * Works seamlessly across serverless functions (Vercel) and traditional server processes.
 */
export function createAdminSession(email: string): string {
  const normEmail = email.trim().toLowerCase();
  const payload: TokenPayload = {
    email: normEmail,
    role: 'super_admin',
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days valid
  };

  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(data).digest('base64url');
  const token = `vgd.${data}.${signature}`;

  // Cache in-memory for fast lookup in single-process runtimes
  activeSessions.set(token, { email: normEmail, expiresAt: payload.exp });

  return token;
}

/**
 * Validates a session token, verifying signature and expiration.
 * Decodes stateless token payload, allowing cross-lambda verification on Vercel.
 */
export function validateSessionToken(token: string | undefined): { isValid: boolean; email?: string } {
  if (!token || typeof token !== 'string') {
    return { isValid: false };
  }

  if (revokedTokens.has(token)) {
    return { isValid: false };
  }

  // Stateless signed token: vgd.<data>.<sig>
  if (token.startsWith('vgd.')) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false };
    }

    const [, data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(data).digest('base64url');

    if (signature.length !== expectedSig.length) {
      return { isValid: false };
    }

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { isValid: false };
    }

    try {
      const json = Buffer.from(data, 'base64url').toString('utf8');
      const payload: TokenPayload = JSON.parse(json);

      if (Date.now() > payload.exp) {
        return { isValid: false };
      }

      return { isValid: true, email: payload.email };
    } catch {
      return { isValid: false };
    }
  }

  // Legacy format: vgd_<rawId>_<sig>
  if (token.startsWith('vgd_')) {
    const session = activeSessions.get(token);
    if (!session) return { isValid: false };

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return { isValid: false };
    }

    return { isValid: true, email: session.email };
  }

  return { isValid: false };
}

/**
 * Revokes a session token on logout.
 */
export function revokeSessionToken(token: string | undefined): void {
  if (token) {
    revokedTokens.add(token);
    activeSessions.delete(token);
  }
}

/**
 * Express middleware protecting all administrative routes.
 * Denies access with 401 Unauthorized if token is missing or invalid.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-admin-token'] as string);

  const { isValid, email } = validateSessionToken(token);
  if (!isValid || !email) {
    return res.status(401).json({
      error: 'Unauthorized: Valid administrative session token required',
      code: 'AUTH_REQUIRED',
    });
  }

  (req as any).adminUser = { email, role: 'super_admin' };
  next();
}
