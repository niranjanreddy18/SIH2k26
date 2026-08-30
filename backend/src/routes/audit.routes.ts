import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { sendPaginated, sendSuccess, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';
import { CryptoService } from '../services/crypto.service';
import { parsePagination } from '../utils/pagination';
import { hasCaseAccess } from '../utils/access';

const router = Router();

// ─── GET /documents/:id/audit ─────────────────────────────────────────────────
router.get('/documents/:id/audit', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { page, limit, offset } = parsePagination(req);
  const action = req.query.action as string | undefined;
  const from   = req.query.from   as string | undefined;
  const to     = req.query.to     as string | undefined;

  const docRow = await pool.query(`SELECT id, case_id FROM documents WHERE id = $1`, [id]);
  if (!docRow.rows[0] || !(await hasCaseAccess(docRow.rows[0].case_id, req.user!))) {
    return sendError(res, 'NOT_FOUND', `Document ${id} not found.`, 404);
  }

  // All versions of this document (for target_id matching)
  const verIds = await pool.query(
    `SELECT id FROM document_versions WHERE document_id = $1`, [id]
  );
  const versionIds = verIds.rows.map(r => r.id);
  const allTargets = [id, ...versionIds];

  const conditions: string[] = [`ae.target_id = ANY($1::uuid[])`];
  const params: any[] = [allTargets];

  if (action) { params.push(action); conditions.push(`ae.action = $${params.length}`); }
  if (from)   { params.push(from);   conditions.push(`ae.created_at >= $${params.length}`); }
  if (to)     { params.push(to);     conditions.push(`ae.created_at <= $${params.length}`); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRow = await pool.query(
    `SELECT COUNT(*) FROM audit_events ae ${where}`, params
  );
  const total = parseInt(countRow.rows[0].count);

  params.push(limit, offset);
  const rows = await pool.query(
    `SELECT ae.id, ae.action, ae.target_type, ae.target_id, ae.result, ae.created_at,
            u.id AS actor_id, u.name AS actor_name
     FROM audit_events ae
     JOIN users u ON ae.actor_id = u.id
     ${where}
     ORDER BY ae.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const items = rows.rows.map(e => ({
    id: e.id, action: e.action, targetType: e.target_type,
    actor: { id: e.actor_id, name: e.actor_name },
    result: e.result, createdAt: e.created_at,
  }));

  return sendPaginated(res, items, page, limit, total);
});

// ─── GET /cases/:id/audit ─────────────────────────────────────────────────────
router.get('/cases/:id/audit', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { page, limit, offset } = parsePagination(req);
  const action = req.query.action as string | undefined;
  const from   = req.query.from   as string | undefined;
  const to     = req.query.to     as string | undefined;

  const caseRow = await pool.query(`SELECT id FROM cases WHERE id = $1`, [id]);
  if (!caseRow.rows[0] || !(await hasCaseAccess(id, req.user!))) {
    return sendError(res, 'NOT_FOUND', `Case ${id} not found.`, 404);
  }

  // Gather all entity IDs related to this case
  const docIds = await pool.query(`SELECT id FROM documents WHERE case_id = $1`, [id]);
  const evIds  = await pool.query(`SELECT id FROM evidence  WHERE case_id = $1`, [id]);
  const docVersionIds = docIds.rows.length
    ? await pool.query(
        `SELECT id FROM document_versions WHERE document_id = ANY($1::uuid[])`,
        [docIds.rows.map(r => r.id)]
      )
    : { rows: [] };

  const allTargets = [
    id,
    ...docIds.rows.map(r => r.id),
    ...evIds.rows.map(r => r.id),
    ...docVersionIds.rows.map(r => r.id),
  ];

  const conditions: string[] = [`ae.target_id = ANY($1::uuid[])`];
  const params: any[] = [allTargets];

  if (action) { params.push(action); conditions.push(`ae.action = $${params.length}`); }
  if (from)   { params.push(from);   conditions.push(`ae.created_at >= $${params.length}`); }
  if (to)     { params.push(to);     conditions.push(`ae.created_at <= $${params.length}`); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRow = await pool.query(
    `SELECT COUNT(*) FROM audit_events ae ${where}`, params
  );
  const total = parseInt(countRow.rows[0].count);

  params.push(limit, offset);
  const rows = await pool.query(
    `SELECT ae.id, ae.action, ae.target_type, ae.target_id, ae.result, ae.created_at,
            u.id AS actor_id, u.name AS actor_name
     FROM audit_events ae
     JOIN users u ON ae.actor_id = u.id
     ${where}
     ORDER BY ae.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const items = rows.rows.map(e => ({
    id: e.id, action: e.action, targetType: e.target_type, targetId: e.target_id,
    actor: { id: e.actor_id, name: e.actor_name },
    result: e.result, createdAt: e.created_at,
  }));

  return sendPaginated(res, items, page, limit, total);
});

// ─── GET /audit/verify-chain — Validate the full audit hash-chain ─────────────
// Recomputes every event hash and compares to stored values.
// Any tampered row will cause a chain break detectable here.
router.get('/audit/verify-chain', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const rows = await pool.query(
    `SELECT ae.id, ae.actor_id, ae.action, ae.target_id, ae.created_at,
            ae.prev_event_hash, ae.event_hash
     FROM audit_events ae
     ORDER BY ae.created_at ASC`
  );

  let prevHash = CryptoService.GENESIS_HASH;
  let intact   = true;
  let brokenAt: string | null = null;

  for (const row of rows.rows) {
    const expected = CryptoService.computeAuditEventHash(
      row.actor_id, row.action, row.target_id,
      new Date(row.created_at).toISOString(), prevHash
    );
    if (expected !== row.event_hash) {
      intact    = false;
      brokenAt  = row.id;
      break;
    }
    prevHash = row.event_hash;
  }

  return sendSuccess(res, {
    status:      intact ? 'CHAIN_INTACT' : 'CHAIN_BROKEN',
    totalEvents: rows.rows.length,
    brokenAt,
    verifiedAt:  new Date().toISOString(),
  });
});

export default router;
