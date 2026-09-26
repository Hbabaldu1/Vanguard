import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

// In-memory active session tokens: map token -> { email: string; expiresAt: number }
const activeSessions = new Map<string, { email: string; expiresAt: number }>();

// Ephemeral server session secret if SESSION_SECRET is not provided in env
const SERVER_SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Retrieves configured admin credentials strictly from environment variables.
 * Returns null if not configured, enforcing NO hardcoded fallback password.
 */
export function getAdminCredentials(): { email: string; passwordHash: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  return { email, passwordHash };
}

/**
 * Verifies admin login credentials using constant-time buffer comparison.
 * Returns false safely if credentials are not configured in environment variables.
 */
export function verifyAdminCredentials(inputEmail: string, inputPassword: string): boolean {
  const creds = getAdminCredentials();
  if (!creds) {
    console.warn('[Security] Admin authentication attempt rejected: ADMIN_EMAIL or ADMIN_PASSWORD is not configured in environment.');
    return false;
  }

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
 * Creates a cryptographically random session token signed with the server session secret.
 */
export function createAdminSession(email: string): string {
  const rawId = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(rawId).digest('hex').slice(0, 16);
  const token = `vgd_${rawId}_${signature}`;
  
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, { email, expiresAt });
  return token;
}

/**
 * Validates a session token, checking signature and expiration.
 */
export function validateSessionToken(token: string | undefined): { isValid: boolean; email?: string } {
  if (!token || !token.startsWith('vgd_')) return { isValid: false };
  
  const session = activeSessions.get(token);
  if (!session) return { isValid: false };

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return { isValid: false };
  }

  return { isValid: true, email: session.email };
}

/**
 * Revokes a session token on logout.
 */
export function revokeSessionToken(token: string | undefined): void {
  if (token) {
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
  if (!isValid) {
    return res.status(401).json({
      error: 'Unauthorized: Valid administrative session token required',
      code: 'AUTH_REQUIRED',
    });
  }

  (req as any).adminUser = { email };
  next();
}
