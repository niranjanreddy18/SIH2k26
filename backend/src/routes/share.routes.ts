import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { logAuditEvent } from '../db/audit';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';
import { hasCaseAccess } from '../utils/access';
import { parsePagination } from '../utils/pagination';

const router = Router();

// ─── POST /documents/:id/share — Share document with a user ──────────────────
router.post('/documents/:id/share', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { recipientId, canView, canDownload, expiresAt } = req.body;
  const user = req.user!;

  if (!recipientId || !expiresAt) {
    return sendError(res, 'VALIDATION_ERROR', 'recipientId and expiresAt are required.', 400);
  }

  // Fetch document + current version
  const docRow = await pool.query(
    `SELECT d.id, d.name, d.current_version_id, d.case_id, d.created_by
     FROM documents d WHERE d.id = $1`,
    [id]
  );
  if (!docRow.rows[0] || !docRow.rows[0].current_version_id) {
    return sendError(res, 'NOT_FOUND', `Document ${id} not found.`, 404);
  }

  const isUploader = docRow.rows[0].created_by === user.id;
  if (!isUploader && !(await hasCaseAccess(docRow.rows[0].case_id, user))) {
    return sendError(res, 'FORBIDDEN_CLASSIFICATION', 'You do not have access to share this document.', 403);
  }

  const recipientRow = await pool.query(
    `SELECT id, name FROM users WHERE id = $1`, [recipientId]
  );
  if (!recipientRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Recipient user ${recipientId} not found.`, 404);
  }

  if (new Date(expiresAt) <= new Date()) {
    return sendError(res, 'VALIDATION_ERROR', 'expiresAt must be in the future.', 400);
  }

  const row = await pool.query(
    `INSERT INTO shares (id, document_version_id, recipient_id, can_view, can_download, expires_at, created_by)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
     RETURNING id, document_version_id, recipient_id, can_view, can_download, expires_at, created_at`,
    [docRow.rows[0].current_version_id, recipientId,
     canView !== false, canDownload === true, expiresAt, user.id]
  );

  await logAuditEvent(user.id, 'ACCESS_GRANTED', 'DOCUMENT', id);

  const s = row.rows[0];
  return sendSuccess(res, {
    id: s.id,
    document: { id, name: docRow.rows[0].name },
    recipient: { id: recipientRow.rows[0].id, name: recipientRow.rows[0].name },
    canView: s.can_view, canDownload: s.can_download,
    expiresAt: s.expires_at, createdAt: s.created_at,
  }, 201);
});

// ─── GET /documents/shared-with-me — Active shares for the current user ───────
router.get('/documents/shared-with-me', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { page, limit, offset } = parsePagination(req, 20);
  const user  = req.user!;

  const countRow = await pool.query(
    `SELECT COUNT(*) FROM shares s
     WHERE s.recipient_id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [user.id]
  );
  const total = parseInt(countRow.rows[0].count);

  const rows = await pool.query(
    `SELECT s.id, s.can_view, s.can_download, s.expires_at, s.created_at,
            d.id AS doc_id, d.name AS doc_name, d.type AS doc_type, dv.mime_type,
            c.id AS case_id, c.fir_number
     FROM shares s
     JOIN document_versions dv ON s.document_version_id = dv.id
     JOIN documents d ON dv.document_id = d.id
     JOIN cases c ON d.case_id = c.id
     WHERE s.recipient_id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [user.id, limit, offset]
  );

  const items = rows.rows.map(s => ({
    shareId: s.id, canView: s.can_view, canDownload: s.can_download,
    expiresAt: s.expires_at, createdAt: s.created_at,
    document: { id: s.doc_id, name: s.doc_name, type: s.doc_type, mimeType: s.mime_type },
    case: { id: s.case_id, firNumber: s.fir_number },
  }));

  return sendPaginated(res, items, page, limit, total);
});

// ─── GET /cases/:id/shares — All share grants for documents in a case ─────────
router.get('/cases/:id/shares', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  const caseRow = await pool.query(`SELECT id FROM cases WHERE id = $1`, [id]);
  if (!caseRow.rows[0] || !(await hasCaseAccess(id, req.user!))) {
    return sendError(res, 'NOT_FOUND', `Case ${id} not found.`, 404);
  }

  const rows = await pool.query(
    `SELECT s.id, s.can_view, s.can_download, s.expires_at, s.created_at, s.revoked_at, s.created_by,
            d.id AS doc_id, d.name AS doc_name,
            ru.id AS recipient_id, ru.name AS recipient_name,
            cu.id AS creator_id, cu.name AS creator_name
     FROM shares s
     JOIN document_versions dv ON s.document_version_id = dv.id
     JOIN documents d ON dv.document_id = d.id
     JOIN users ru ON s.recipient_id = ru.id
     JOIN users cu ON s.created_by = cu.id
     WHERE d.case_id = $1
     ORDER BY s.created_at DESC`,
    [id]
  );

  const items = rows.rows.map(s => ({
    shareId: s.id,
    document: { id: s.doc_id, name: s.doc_name },
    recipient: { id: s.recipient_id, name: s.recipient_name },
    createdBy: { id: s.creator_id, name: s.creator_name },
    canView: s.can_view, canDownload: s.can_download,
    expiresAt: s.expires_at, createdAt: s.created_at,
    revokedAt: s.revoked_at,
    status: s.revoked_at ? 'REVOKED' : (new Date(s.expires_at) <= new Date() ? 'EXPIRED' : 'ACTIVE'),
  }));

  return sendSuccess(res, { caseId: id, items });
});

// ─── POST /shares/:id/revoke — Revoke an active share ─────────────────────────
router.post('/shares/:id/revoke', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const user = req.user!;

  const shareRow = await pool.query(
    `SELECT s.id, s.created_by, s.revoked_at,
            d.id AS doc_id
     FROM shares s
     JOIN document_versions dv ON s.document_version_id = dv.id
     JOIN documents d ON dv.document_id = d.id
     WHERE s.id = $1`,
    [id]
  );

  if (!shareRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Share ${id} not found.`, 404);
  }

  const share = shareRow.rows[0];

  if (share.revoked_at) {
    return sendError(res, 'VALIDATION_ERROR', 'This share has already been revoked.', 409);
  }

  // Only the creator or an admin can revoke
  if (share.created_by !== user.id && user.role !== 'ADMIN') {
    return sendError(res, 'FORBIDDEN_CLASSIFICATION', 'You did not create this share.', 403);
  }

  await pool.query(
    `UPDATE shares SET revoked_at = now() WHERE id = $1`, [id]
  );

  await logAuditEvent(user.id, 'ACCESS_REVOKED', 'DOCUMENT', share.doc_id);

  return sendSuccess(res, { id, revoked: true, revokedAt: new Date().toISOString() });
});

export default router;
