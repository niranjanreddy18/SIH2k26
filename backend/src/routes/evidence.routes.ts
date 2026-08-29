import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { logAuditEvent } from '../db/audit';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';
import { CryptoService } from '../services/crypto.service';

const router = Router();

// ─── POST /cases/:caseId/evidence — Register evidence item ───────────────────
router.post('/cases/:caseId/evidence', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { caseId } = req.params;
  const { type, description, collectedAt } = req.body;
  const user = req.user!;

  const caseRow = await pool.query(`SELECT id FROM cases WHERE id = $1`, [caseId]);
  if (!caseRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Case ${caseId} not found.`, 404);
  }
  if (!type) {
    return sendError(res, 'VALIDATION_ERROR', 'Evidence type is required.', 400);
  }

  const id = uuidv4();
  const row = await pool.query(
    `INSERT INTO evidence (id, case_id, type, description, status, collected_by, collected_at)
     VALUES ($1, $2, $3, $4, 'REGISTERED'::evidence_status, $5, $6)
     RETURNING id, case_id, type, description, status, collected_at`,
    [id, caseId, type, description || null, user.id, collectedAt || new Date().toISOString()]
  );

  await logAuditEvent(user.id, 'EVIDENCE_REGISTERED', 'EVIDENCE', id);

  const e = row.rows[0];
  return sendSuccess(res, {
    id: e.id, caseId: e.case_id, type: e.type, description: e.description,
    status: e.status, collectedBy: { id: user.id, name: user.name }, collectedAt: e.collected_at,
  }, 201);
});

// ─── GET /cases/:caseId/evidence — List evidence for a case ──────────────────
router.get('/cases/:caseId/evidence', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { caseId } = req.params;
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
  const offset = (page - 1) * limit;

  const caseRow = await pool.query(`SELECT id FROM cases WHERE id = $1`, [caseId]);
  if (!caseRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Case ${caseId} not found.`, 404);
  }

  const countRow = await pool.query(
    `SELECT COUNT(*) FROM evidence WHERE case_id = $1`, [caseId]
  );
  const total = parseInt(countRow.rows[0].count);

  const rows = await pool.query(
    `SELECT e.id, e.type, e.description, e.status, e.collected_at,
            u.id AS cb_id, u.name AS cb_name,
            (SELECT COUNT(*) FROM evidence_custody_events WHERE evidence_id = e.id) AS custody_events
     FROM evidence e
     JOIN users u ON e.collected_by = u.id
     WHERE e.case_id = $1
     ORDER BY e.collected_at DESC
     LIMIT $2 OFFSET $3`,
    [caseId, limit, offset]
  );

  const items = rows.rows.map(e => ({
    id: e.id, type: e.type, description: e.description, status: e.status,
    collectedBy: { id: e.cb_id, name: e.cb_name }, collectedAt: e.collected_at,
    custodyEventCount: parseInt(e.custody_events),
  }));

  return sendPaginated(res, items, page, limit, total);
});

// ─── GET /evidence/:id — Single evidence item ─────────────────────────────────
router.get('/evidence/:id', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  const row = await pool.query(
    `SELECT e.id, e.case_id, e.type, e.description, e.status, e.collected_at,
            u.id AS cb_id, u.name AS cb_name
     FROM evidence e
     JOIN users u ON e.collected_by = u.id
     WHERE e.id = $1`,
    [id]
  );

  if (!row.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Evidence ${id} not found.`, 404);
  }

  const e = row.rows[0];
  return sendSuccess(res, {
    id: e.id, caseId: e.case_id, type: e.type, description: e.description,
    status: e.status, collectedBy: { id: e.cb_id, name: e.cb_name },
    collectedAt: e.collected_at,
  });
});

// ─── POST /evidence/:id/transfer — Custody transfer ──────────────────────────
router.post('/evidence/:id/transfer', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { toUserId, reason } = req.body;
  const user = req.user!;

  if (!toUserId) {
    return sendError(res, 'VALIDATION_ERROR', 'toUserId is required.', 400);
  }

  const evRow = await pool.query(
    `SELECT id, status FROM evidence WHERE id = $1`, [id]
  );
  if (!evRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Evidence ${id} not found.`, 404);
  }

  const recipientRow = await pool.query(
    `SELECT id, name FROM users WHERE id = $1`, [toUserId]
  );
  if (!recipientRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Recipient user ${toUserId} not found.`, 404);
  }

  const custodyHash = CryptoService.calculateStringHash(
    `TRANSFERRED${user.id}${toUserId}${id}${new Date().toISOString()}`
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO evidence_custody_events (id, evidence_id, from_user_id, to_user_id, action, reason, hash)
       VALUES (uuid_generate_v4(), $1, $2, $3, 'TRANSFERRED', $4, $5)`,
      [id, user.id, toUserId, reason || null, custodyHash]
    );

    await client.query(
      `UPDATE evidence SET status = 'TRANSFERRED'::evidence_status WHERE id = $1`, [id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await logAuditEvent(user.id, 'EVIDENCE_TRANSFERRED', 'EVIDENCE', id);

  return sendSuccess(res, {
    evidenceId: id, action: 'TRANSFERRED',
    from: { id: user.id, name: user.name },
    to: { id: recipientRow.rows[0].id, name: recipientRow.rows[0].name },
    reason: reason || null,
  });
});

// ─── GET /evidence/:id/custody — Ordered chain of custody timeline ────────────
router.get('/evidence/:id/custody', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  const evRow = await pool.query(`SELECT id FROM evidence WHERE id = $1`, [id]);
  if (!evRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Evidence ${id} not found.`, 404);
  }

  const rows = await pool.query(
    `SELECT ce.id, ce.action, ce.reason, ce.created_at,
            fu.id AS from_id, fu.name AS from_name,
            tu.id AS to_id,   tu.name AS to_name
     FROM evidence_custody_events ce
     LEFT JOIN users fu ON ce.from_user_id = fu.id
     JOIN users tu ON ce.to_user_id = tu.id
     WHERE ce.evidence_id = $1
     ORDER BY ce.created_at ASC`,
    [id]
  );

  const items = rows.rows.map(c => ({
    id: c.id, action: c.action, reason: c.reason, createdAt: c.created_at,
    from: c.from_id ? { id: c.from_id, name: c.from_name } : null,
    to:   { id: c.to_id, name: c.to_name },
  }));

  return sendSuccess(res, { evidenceId: id, items });
});

export default router;
