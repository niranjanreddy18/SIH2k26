import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { logAuditEvent } from '../db/audit';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';
import { hasCaseAccess } from '../utils/access';
import { parsePagination } from '../utils/pagination';

const router = Router();

// ─── POST /cases ───────────────────────────────────────────────────────────────
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { firNumber, title, description, crimeType, classification } = req.body;
  const user = req.user!;

  if (!firNumber || !title) {
    return sendError(res, 'VALIDATION_ERROR', 'FIR Number and Title are required.', 400);
  }

  const id = uuidv4();
  const row = await pool.query(
    `INSERT INTO cases (id, fir_number, title, description, crime_type, classification, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::classification_tier, $7)
     RETURNING id, fir_number, title, description, crime_type, status, classification, created_at, updated_at`,
    [id, firNumber, title, description || null, crimeType || null,
     classification || 'INTERNAL', user.id]
  );

  // Auto-assign the creator
  await pool.query(
    `INSERT INTO case_assignments (id, case_id, user_id) VALUES (uuid_generate_v4(), $1, $2)
     ON CONFLICT ON CONSTRAINT unique_case_user DO NOTHING`,
    [id, user.id]
  );

  await logAuditEvent(user.id, 'CASE_CREATED', 'CASE', id);

  const c = row.rows[0];
  return sendSuccess(res, {
    id: c.id, firNumber: c.fir_number, title: c.title, description: c.description,
    crimeType: c.crime_type, status: c.status, classification: c.classification,
    createdBy: { id: user.id, name: user.name },
    createdAt: c.created_at, updatedAt: c.updated_at,
    counts: { documents: 0, evidence: 0, pendingApprovals: 0, auditEvents: 1, sharedDocuments: 0 },
  }, 201);
});

// ─── GET /cases?page=&limit=&status=&classification= ──────────────────────────
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { page, limit, offset } = parsePagination(req, 20);
  const status = req.query.status as string | undefined;
  const cls    = req.query.classification as string | undefined;

  const conditions: string[] = [];
  const params: any[]        = [];

  if (status) { params.push(status); conditions.push(`c.status = $${params.length}::case_status`); }
  if (cls)    { params.push(cls);    conditions.push(`c.classification = $${params.length}::classification_tier`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*) FROM cases c ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const rows = await pool.query(
    `SELECT c.id, c.fir_number, c.title, c.status, c.classification, c.created_at,
            u.name AS created_by_name,
            (SELECT COUNT(*) FROM documents   d  WHERE d.case_id  = c.id) AS doc_count,
            (SELECT COUNT(*) FROM evidence    e  WHERE e.case_id  = c.id) AS ev_count,
            (SELECT COUNT(*) FROM document_versions dv
               JOIN documents dd ON dv.document_id = dd.id
              WHERE dd.case_id = c.id AND dv.status IN ('SUBMITTED','UNDER_REVIEW')) AS pending
     FROM cases c
     JOIN users u ON c.created_by = u.id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const items = rows.rows.map(c => ({
    id: c.id, firNumber: c.fir_number, title: c.title,
    status: c.status, classification: c.classification,
    createdBy: { name: c.created_by_name },
    documentCount: parseInt(c.doc_count),
    evidenceCount: parseInt(c.ev_count),
    pendingApprovals: parseInt(c.pending),
    createdAt: c.created_at,
  }));

  return sendPaginated(res, items, page, limit, total);
});

// ─── GET /cases/:id ────────────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  const row = await pool.query(
    `SELECT c.id, c.fir_number, c.title, c.description, c.crime_type,
            c.status, c.classification, c.created_at, c.updated_at,
            u.id AS created_by_id, u.name AS created_by_name
     FROM cases c
     JOIN users u ON c.created_by = u.id
     WHERE c.id = $1`,
    [id]
  );

  if (!row.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Case ${id} not found.`, 404);
  }

  const [docs, evid, pending, auditCnt, sharedCnt] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM documents WHERE case_id = $1`, [id]),
    pool.query(`SELECT COUNT(*) FROM evidence WHERE case_id = $1`, [id]),
    pool.query(
      `SELECT COUNT(*) FROM document_versions dv
       JOIN documents d ON dv.document_id = d.id
       WHERE d.case_id = $1 AND dv.status IN ('SUBMITTED','UNDER_REVIEW')`, [id]),
    pool.query(
      `SELECT COUNT(*) FROM audit_events ae
       WHERE ae.target_id = $1
          OR ae.target_id IN (SELECT id FROM documents WHERE case_id = $1)`, [id]),
    pool.query(
      `SELECT COUNT(*) FROM shares s
       JOIN document_versions dv ON s.document_version_id = dv.id
       JOIN documents d ON dv.document_id = d.id
       WHERE d.case_id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`, [id]),
  ]);

  const c = row.rows[0];
  return sendSuccess(res, {
    id: c.id, firNumber: c.fir_number, title: c.title, description: c.description,
    crimeType: c.crime_type, status: c.status, classification: c.classification,
    createdBy: { id: c.created_by_id, name: c.created_by_name },
    createdAt: c.created_at, updatedAt: c.updated_at,
    counts: {
      documents:        parseInt(docs.rows[0].count),
      evidence:         parseInt(evid.rows[0].count),
      pendingApprovals: parseInt(pending.rows[0].count),
      auditEvents:      parseInt(auditCnt.rows[0].count),
      sharedDocuments:  parseInt(sharedCnt.rows[0].count),
    },
  });
});

// ─── PATCH /cases/:id ─────────────────────────────────────────────────────────
router.patch('/:id', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id }     = req.params;
  const { status, title, description } = req.body;
  const user       = req.user!;

  const existing = await pool.query(`SELECT id FROM cases WHERE id = $1`, [id]);
  if (!existing.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Case ${id} not found.`, 404);
  }

  if (!(await hasCaseAccess(id, user))) {
    return sendError(res, 'FORBIDDEN_CLASSIFICATION', 'You are not assigned to this case.', 403);
  }

  const updates: string[] = [];
  const params: any[]     = [];

  if (status) {
    params.push(status);
    updates.push(`status = $${params.length}::case_status`);
  }
  if (title) {
    params.push(title);
    updates.push(`title = $${params.length}`);
  }
  if (description !== undefined) {
    params.push(description);
    updates.push(`description = $${params.length}`);
  }

  if (!updates.length) {
    return sendError(res, 'VALIDATION_ERROR', 'No updatable fields provided.', 400);
  }

  updates.push(`updated_at = now()`);
  params.push(id);

  await pool.query(
    `UPDATE cases SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params
  );

  await logAuditEvent(user.id, 'CASE_UPDATED', 'CASE', id);
  return sendSuccess(res, { id, updated: true });
});

export default router;
