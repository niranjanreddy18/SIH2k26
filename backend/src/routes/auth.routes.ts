import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { logAuditEvent } from '../db/audit';
import { sendSuccess, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/** SHA-256 of the raw refresh token string (stored in DB, never the token itself) */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'VALIDATION_ERROR', 'Email and password are required.', 400);
  }

  const userRow = await pool.query(
    `SELECT id, name, email, password_hash, role, department, locked_until, failed_login_attempts
     FROM users WHERE lower(email) = lower($1)`,
    [email]
  );

  // Always compute a bcrypt compare even on unknown email to prevent timing attacks
  const user = userRow.rows[0];
  const dummyHash = '$2a$12$invalidhashforunknownemailprotecttiming';
  const hashToCompare = user ? user.password_hash : dummyHash;

  // Check if account is locked
  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    const unlockAt = new Date(user.locked_until).toISOString();
    return sendError(res, 'AUTH_ACCOUNT_LOCKED',
      `Account is temporarily locked due to repeated failed login attempts. Try again after ${unlockAt}.`, 423);
  }

  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    // Increment failed attempts (only for real accounts to avoid user enumeration timing)
    if (user) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const lockedUntil = newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;
      await pool.query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [newAttempts, lockedUntil, user.id]
      );
    }
    return sendError(res, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  // Successful login — reset failed attempts
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [user.id]
  );

  const userPayload = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, department: user.department,
  };

  const accessToken  = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Persist refresh token hash in DB for revocation support
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '7 days')`,
    [user.id, hashToken(refreshToken)]
  );

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await logAuditEvent(user.id, 'USER_LOGIN', 'USER', user.id, 'SUCCESS');

  return sendSuccess(res, { accessToken, user: userPayload });
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hashToken(refreshToken)]
    );
  }

  res.clearCookie('refreshToken');
  await logAuditEvent(req.user!.id, 'USER_LOGOUT', 'USER', req.user!.id, 'SUCCESS');
  return sendSuccess(res, { message: 'Logged out successfully.' });
});

// ─── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response): Promise<any> => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return sendError(res, 'AUTH_TOKEN_EXPIRED', 'No refresh token provided.', 401);
  }

  // Verify JWT signature first
  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    return sendError(res, 'AUTH_TOKEN_EXPIRED', 'Invalid or expired refresh token.', 401);
  }

  // Check the token exists in DB and has not been revoked (rotation/revocation)
  const tokenRow = await pool.query(
    `SELECT id, user_id, revoked_at FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > now()`,
    [hashToken(refreshToken)]
  );

  if (!tokenRow.rows[0] || tokenRow.rows[0].revoked_at) {
    return sendError(res, 'AUTH_TOKEN_EXPIRED', 'Refresh token has been revoked.', 401);
  }

  // Revoke old refresh token (rotation — one-time use)
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`,
    [hashToken(refreshToken)]
  );

  const userRow = await pool.query(
    `SELECT id, name, email, role, department FROM users WHERE id = $1`,
    [decoded.id]
  );
  if (!userRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', 'User not found.', 404);
  }

  const user = userRow.rows[0];
  const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department };

  const newAccessToken  = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
  const newRefreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '7 days')`,
    [user.id, hashToken(newRefreshToken)]
  );

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, { accessToken: newAccessToken, user: userPayload });
});

// ─── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const row = await pool.query(
    `SELECT id, name, email, role, department FROM users WHERE id = $1`,
    [req.user!.id]
  );
  if (!row.rows[0]) {
    return sendError(res, 'NOT_FOUND', 'User not found.', 404);
  }
  return sendSuccess(res, row.rows[0]);
});

export default router;
