import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { logAuditEvent } from '../db/audit';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest, requireRole } from '../middlewares/auth';
import { UserRole } from '../types';
import { parsePagination } from '../utils/pagination';

const router = Router();

// All endpoints in this router require ADMIN role
router.use(authenticateJWT, requireRole('ADMIN'));

/**
 * GET /admin/users — List all system users with role, status, and department
 */
router.get('/users', async (req: AuthRequest, res: Response): Promise<any> => {
  const { page, limit, offset } = parsePagination(req);

  const countRow = await pool.query(`SELECT COUNT(*) FROM users`);
  const total = parseInt(countRow.rows[0].count);

  const rows = await pool.query(
    `SELECT id, name, email, role, department, mfa_enabled, 
            failed_login_attempts, locked_until, created_at
     FROM users
     ORDER BY created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const items = rows.rows.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    mfaEnabled: u.mfa_enabled,
    failedLoginAttempts: u.failed_login_attempts,
    lockedUntil: u.locked_until,
    isLocked: u.locked_until ? new Date(u.locked_until) > new Date() : false,
    createdAt: u.created_at
  }));

  return sendPaginated(res, items, page, limit, total);
});

/**
 * POST /admin/users — Create a new system user
 */
router.post('/users', async (req: AuthRequest, res: Response): Promise<any> => {
  const { name, email, password, role, department, mfaEnabled } = req.body;
  const admin = req.user!;

  if (!name || !email || !password || !role) {
    return sendError(res, 'VALIDATION_ERROR', 'Name, email, password, and role are required.', 400);
  }

  const validRoles: UserRole[] = ['INVESTIGATOR', 'SENIOR_OFFICER', 'FORENSIC_OFFICER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return sendError(res, 'VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }

  const existing = await pool.query(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (existing.rows[0]) {
    return sendError(res, 'VALIDATION_ERROR', 'A user with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  const row = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, department, mfa_enabled)
     VALUES ($1, $2, $3, $4, $5::user_role, $6, $7)
     RETURNING id, name, email, role, department, mfa_enabled, created_at`,
    [id, name, email, passwordHash, role, department || null, mfaEnabled === true]
  );

  await logAuditEvent(admin.id, 'USER_CREATED', 'USER', id);

  const u = row.rows[0];
  return sendSuccess(res, {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    mfaEnabled: u.mfa_enabled,
    createdAt: u.created_at
  }, 201);
});

/**
 * PATCH /admin/users/:id/role — Change a user's role
 */
router.patch('/users/:id/role', async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { role } = req.body;
  const admin = req.user!;

  const validRoles: UserRole[] = ['INVESTIGATOR', 'SENIOR_OFFICER', 'FORENSIC_OFFICER', 'ADMIN'];
  if (!role || !validRoles.includes(role)) {
    return sendError(res, 'VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }

  const userRow = await pool.query(`SELECT id, role FROM users WHERE id = $1`, [id]);
  if (!userRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `User ${id} not found.`, 404);
  }

  await pool.query(
    `UPDATE users SET role = $1::user_role WHERE id = $2`,
    [role, id]
  );

  await logAuditEvent(admin.id, 'USER_ROLE_UPDATED', 'USER', id);

  return sendSuccess(res, { id, role, message: `User role updated to ${role}.` });
});

/**
 * PATCH /admin/users/:id/unlock — Unlock a locked user account
 */
router.patch('/users/:id/unlock', async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const admin = req.user!;

  const userRow = await pool.query(`SELECT id FROM users WHERE id = $1`, [id]);
  if (!userRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `User ${id} not found.`, 404);
  }

  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [id]
  );

  await logAuditEvent(admin.id, 'USER_UNLOCKED', 'USER', id);

  return sendSuccess(res, { id, message: 'User account has been unlocked.' });
});

/**
 * GET /admin/audit — System-wide audit log for administrators
 */
router.get('/audit', async (req: AuthRequest, res: Response): Promise<any> => {
  const { page, limit, offset } = parsePagination(req);
  const targetType = req.query.targetType as string | undefined;
  const action = req.query.action as string | undefined;

  const conditions: string[] = [];
  const params: any[] = [];

  if (targetType) {
    params.push(targetType);
    conditions.push(`ae.target_type = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`ae.action = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await pool.query(`SELECT COUNT(*) FROM audit_events ae ${where}`, params);
  const total = parseInt(countRow.rows[0].count);

  params.push(limit, offset);
  const rows = await pool.query(
    `SELECT ae.id, ae.action, ae.target_type, ae.target_id, ae.result, ae.created_at,
            ae.prev_event_hash, ae.event_hash,
            u.id AS actor_id, u.name AS actor_name, u.email AS actor_email, u.role AS actor_role
     FROM audit_events ae
     JOIN users u ON ae.actor_id = u.id
     ${where}
     ORDER BY ae.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const items = rows.rows.map(e => ({
    id: e.id,
    action: e.action,
    targetType: e.target_type,
    targetId: e.target_id,
    result: e.result,
    actor: {
      id: e.actor_id,
      name: e.actor_name,
      email: e.actor_email,
      role: e.actor_role
    },
    eventHash: e.event_hash,
    prevEventHash: e.prev_event_hash,
    createdAt: e.created_at
  }));

  return sendPaginated(res, items, page, limit, total);
});

export default router;
