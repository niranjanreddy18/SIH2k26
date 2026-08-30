import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { logAuditEvent } from '../db/audit';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest, requireRole } from '../middlewares/auth';
import { StorageService } from '../services/storage.service';
import { CryptoService } from '../services/crypto.service';

const router = Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

// ─── Helper: fetch document row with current version (joined) ─────────────────
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function getDocumentWithVersion(docId: string) {
  if (!docId || !isUUID(docId)) return null;
  const row = await pool.query(
    `SELECT d.id, d.case_id, d.name, d.type, d.classification,
            d.current_version_id, d.created_at,
            u.id AS created_by_id, u.name AS created_by_name,
            dv.id AS ver_id, dv.version_no, dv.hash, dv.storage_key,
            dv.file_size, dv.mime_type, dv.status AS ver_status,
            dv.comment, dv.created_at AS ver_created_at,
            vu.name AS ver_created_by_name, vu.id AS ver_created_by_id
     FROM documents d
     JOIN users u  ON d.created_by = u.id
     LEFT JOIN document_versions dv ON d.current_version_id = dv.id
     LEFT JOIN users vu ON dv.created_by = vu.id
     WHERE d.id = $1`,
    [docId]
  );
  return row.rows[0] || null;
}

// ─── POST /cases/:caseId/documents — Upload new document ──────────────────────
router.post('/cases/:caseId/documents', authenticateJWT, upload.single('file'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { caseId } = req.params;
  const { name, type, classification } = req.body;
  const user = req.user!;

  const caseRow = await pool.query(`SELECT id FROM cases WHERE id = $1`, [caseId]);
  if (!caseRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Case ${caseId} not found.`, 404);
  }
  if (!name || !type) {
    return sendError(res, 'VALIDATION_ERROR', 'Document name and type are required.', 400);
  }

  const fileBuffer  = req.file ? req.file.buffer : Buffer.from(`Sample content for ${name}`, 'utf8');
  const originalName = req.file ? req.file.originalname : `${name}.pdf`;
  const mimeType    = req.file ? req.file.mimetype : 'application/pdf';

  const { storageKey, hash, fileSize } = await StorageService.saveFile(fileBuffer, originalName);

  const docId = uuidv4();
  const verId = uuidv4();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO documents (id, case_id, name, type, classification, created_by)
       VALUES ($1, $2, $3, $4::document_type, $5::classification_tier, $6)`,
      [docId, caseId, name, type, classification || 'INTERNAL', user.id]
    );

    await client.query(
      `INSERT INTO document_versions (id, document_id, version_no, hash, storage_key, file_size, mime_type, status, comment, created_by)
       VALUES ($1, $2, 1, $3, $4, $5, $6, 'DRAFT'::version_status, 'Initial upload', $7)`,
      [verId, docId, hash, storageKey, fileSize, mimeType, user.id]
    );

    await client.query(
      `UPDATE documents SET current_version_id = $1 WHERE id = $2`,
      [verId, docId]
    );

    // Register DOCUMENT_CREATED on blockchain ledger
    await appendBlockchainRecord(client, 'DOCUMENT_VERSION', verId, 'DOCUMENT_CREATED', hash);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await logAuditEvent(user.id, 'DOCUMENT_UPLOADED', 'DOCUMENT', docId);

  return sendSuccess(res, {
    id: docId, caseId, name, type, classification: classification || 'INTERNAL',
    currentVersion: { id: verId, versionNo: 1, hash, status: 'DRAFT' },
  }, 201);
});

// ─── GET /cases/:caseId/documents — List documents for a case ─────────────────
router.get('/cases/:caseId/documents', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { caseId } = req.params;
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(200, parseInt(req.query.limit as string) || 50);
  const typeFilter   = req.query.type as string | undefined;
  const statusFilter = req.query.status as string | undefined;
  const offset = (page - 1) * limit;

  const caseRow = await pool.query(`SELECT id FROM cases WHERE id = $1`, [caseId]);
  if (!caseRow.rows[0]) {
    return sendError(res, 'NOT_FOUND', `Case ${caseId} not found.`, 404);
  }

  const conditions: string[] = [`d.case_id = $1`];
  const params: any[] = [caseId];

  if (typeFilter) {
    params.push(typeFilter);
    conditions.push(`d.type = $${params.length}::document_type`);
  }
  if (statusFilter) {
    params.push(statusFilter);
    conditions.push(`dv.status = $${params.length}::version_status`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRow = await pool.query(
    `SELECT COUNT(*) FROM documents d
     LEFT JOIN document_versions dv ON d.current_version_id = dv.id
     ${where}`, params
  );
  const total = parseInt(countRow.rows[0].count);

  params.push(limit, offset);
  const rows = await pool.query(
    `SELECT d.id, d.name, d.type, d.classification, d.created_at,
            u.name AS created_by_name,
            dv.id AS ver_id, dv.version_no, dv.hash, dv.status, dv.file_size, dv.mime_type
     FROM documents d
     LEFT JOIN document_versions dv ON d.current_version_id = dv.id
     JOIN users u ON d.created_by = u.id
     ${where}
     ORDER BY d.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const items = rows.rows.map(d => ({
    id: d.id, name: d.name, type: d.type, classification: d.classification,
    createdBy: { name: d.created_by_name }, createdAt: d.created_at,
    currentVersion: d.ver_id ? {
      id: d.ver_id, versionNo: d.version_no, hash: d.hash,
      status: d.status, fileSize: d.file_size, mimeType: d.mime_type,
    } : null,
  }));

  return sendPaginated(res, items, page, limit, total);
});

// ─── GET /documents/:id — Document detail with version history ────────────────
router.get('/documents/:id', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const doc = await getDocumentWithVersion(id);

  if (!doc) {
    return sendError(res, 'NOT_FOUND', `Document ${id} not found.`, 404);
  }

  const versions = await pool.query(
    `SELECT version_no, status, created_at FROM document_versions
     WHERE document_id = $1 ORDER BY version_no ASC`,
    [id]
  );

  // Blockchain reference for current version
  const bcRow = await pool.query(
    `SELECT tx_reference FROM blockchain_records WHERE ref_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [doc.ver_id]
  );

  await logAuditEvent(req.user!.id, 'DOCUMENT_VIEWED', 'DOCUMENT', id);

  return sendSuccess(res, {
    id: doc.id, caseId: doc.case_id, name: doc.name, type: doc.type,
    classification: doc.classification,
    createdBy: { id: doc.created_by_id, name: doc.created_by_name },
    createdAt: doc.created_at,
    currentVersion: doc.ver_id ? {
      id: doc.ver_id, versionNo: doc.version_no, hash: doc.hash,
      status: doc.ver_status, fileSize: doc.file_size, mimeType: doc.mime_type,
      comment: doc.comment,
      createdBy: { id: doc.ver_created_by_id, name: doc.ver_created_by_name },
      createdAt: doc.ver_created_at,
      blockchainRef: bcRow.rows[0]?.tx_reference || null,
    } : null,
    versionHistory: versions.rows.map(v => ({
      versionNo: v.version_no, status: v.status, createdAt: v.created_at,
    })),
  });
});

// ─── GET /documents/:id/download — Stream file to client ─────────────────────
router.get('/documents/:id/download', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const doc = await getDocumentWithVersion(id);

  if (!doc || !doc.storage_key) {
    return sendError(res, 'NOT_FOUND', `Document ${id} or its file not found.`, 404);
  }

  // Check share grant if user is not the creator or a senior officer
  const user = req.user!;
  const isOwnerOrSenior = user.role === 'SENIOR_OFFICER' || user.role === 'ADMIN';
  if (!isOwnerOrSenior) {
    const shareRow = await pool.query(
      `SELECT id FROM shares
       WHERE document_version_id = $1 AND recipient_id = $2
         AND can_download = true AND revoked_at IS NULL AND expires_at > now()`,
      [doc.ver_id, user.id]
    );
    // Allow if user is the document creator
    const isCreator = doc.created_by_id === user.id;
    if (!isCreator && !shareRow.rows[0]) {
      return sendError(res, 'FORBIDDEN_CLASSIFICATION', 'You do not have download permission for this document.', 403);
    }
  }

  try {
    const fileBuffer = await StorageService.getFile(doc.storage_key);
    await logAuditEvent(user.id, 'DOCUMENT_DOWNLOADED', 'DOCUMENT', id);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());
    return res.send(fileBuffer);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', `File not available in storage: ${err.message}`, 404);
  }
});

// ─── POST /documents/:id/versions — Create new version ───────────────────────
router.post('/documents/:id/versions', authenticateJWT, upload.single('file'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { id }    = req.params;
  const { comment } = req.body;
  const user      = req.user!;

  const doc = await getDocumentWithVersion(id);
  if (!doc) {
    return sendError(res, 'NOT_FOUND', `Document ${id} not found.`, 404);
  }

  // Enforce edit-lock: signed/locked documents cannot get new versions
  if (doc.ver_status === 'LOCKED' || doc.ver_status === 'SIGNED') {
    return sendError(res, 'FORBIDDEN_CLASSIFICATION',
      `Document is ${doc.ver_status} and cannot be modified. Create a new document instead.`, 409);
  }

  // Get next version number
  const lastVer = await pool.query(
    `SELECT MAX(version_no) AS max FROM document_versions WHERE document_id = $1`, [id]
  );
  const newVersionNo = (lastVer.rows[0].max || 0) + 1;

  const fileBuffer   = req.file ? req.file.buffer : Buffer.from(`Version ${newVersionNo} content for ${doc.name}`, 'utf8');
  const originalName = req.file ? req.file.originalname : `${doc.name}_v${newVersionNo}.pdf`;
  const mimeType     = req.file ? req.file.mimetype : 'application/pdf';

  const { storageKey, hash, fileSize } = await StorageService.saveFile(fileBuffer, originalName);
  const verId = uuidv4();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO document_versions (id, document_id, version_no, hash, storage_key, file_size, mime_type, status, comment, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT'::version_status, $8, $9)`,
      [verId, id, newVersionNo, hash, storageKey, fileSize, mimeType, comment || `Version ${newVersionNo}`, user.id]
    );

    await client.query(
      `UPDATE documents SET current_version_id = $1 WHERE id = $2`, [verId, id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await logAuditEvent(user.id, 'DOCUMENT_VERSION_CREATED', 'DOCUMENT', id);

  return sendSuccess(res, {
    id: verId, versionNo: newVersionNo, hash, status: 'DRAFT', fileSize, mimeType,
    createdBy: { id: user.id, name: user.name }, createdAt: new Date().toISOString(),
  });
});

// ─── POST /documents/:id/verify — Cryptographic integrity check ───────────────
router.post('/documents/:id/verify', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const doc = await getDocumentWithVersion(id);

  if (!doc || !doc.ver_id) {
    return sendError(res, 'NOT_FOUND', `Document ${id} not found.`, 404);
  }

  try {
    const fileBuffer   = await StorageService.getFile(doc.storage_key);
    const currentHash  = CryptoService.calculateBufferHash(fileBuffer);
    const isMatch      = doc.hash === currentHash;

    const bcRow = await pool.query(
      `SELECT tx_reference FROM blockchain_records WHERE ref_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [doc.ver_id]
    );

    await logAuditEvent(req.user!.id, 'DOCUMENT_VERIFIED', 'DOCUMENT', id);

    return sendSuccess(res, {
      status:         isMatch ? 'VERIFIED' : 'MISMATCH',
      registeredHash: doc.hash,
      currentHash,
      blockchainRef:  bcRow.rows[0]?.tx_reference || null,
      verifiedAt:     new Date().toISOString(),
    });
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', `Storage file missing or unreadable: ${err.message}`, 404);
  }
});

// ─── POST /documents/:id/submit ───────────────────────────────────────────────
router.post('/documents/:id/submit', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const doc = await getDocumentWithVersion(id);
  if (!doc?.ver_id) return sendError(res, 'NOT_FOUND', 'Document not found.', 404);
  if (doc.ver_status !== 'DRAFT' && doc.ver_status !== 'REJECTED') {
    return sendError(res, 'VALIDATION_ERROR', `Cannot submit a document in status: ${doc.ver_status}`, 409);
  }

  await pool.query(
    `UPDATE document_versions SET status = 'SUBMITTED'::version_status WHERE id = $1`, [doc.ver_id]
  );
  await logAuditEvent(req.user!.id, 'DOCUMENT_SUBMITTED', 'DOCUMENT', id);
  return sendSuccess(res, { status: 'SUBMITTED' });
});

// ─── POST /documents/:id/approve ─────────────────────────────────────────────
router.post('/documents/:id/approve', authenticateJWT, requireRole('SENIOR_OFFICER'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { comment } = req.body;
  const user = req.user!;
  const doc = await getDocumentWithVersion(id);
  if (!doc?.ver_id) return sendError(res, 'NOT_FOUND', 'Document not found.', 404);

  // Self-approval guard
  if (doc.ver_created_by_id === user.id) {
    return sendError(res, 'FORBIDDEN_CLASSIFICATION', 'You cannot approve a document you submitted.', 403);
  }
  if (doc.ver_status !== 'SUBMITTED' && doc.ver_status !== 'UNDER_REVIEW') {
    return sendError(res, 'VALIDATION_ERROR', `Cannot approve a document in status: ${doc.ver_status}`, 409);
  }

  await pool.query(
    `UPDATE document_versions SET status = 'APPROVED'::version_status WHERE id = $1`, [doc.ver_id]
  );
  await pool.query(
    `INSERT INTO approvals (id, document_version_id, reviewer_id, decision, comment)
     VALUES (uuid_generate_v4(), $1, $2, 'APPROVED'::approval_decision, $3)`,
    [doc.ver_id, user.id, comment || null]
  );
  await logAuditEvent(user.id, 'DOCUMENT_APPROVED', 'DOCUMENT', id);

  // Blockchain record for DOCUMENT_APPROVED (§25)
  const client = await pool.connect();
  try {
    await appendBlockchainRecord(client, 'DOCUMENT_VERSION', doc.ver_id, 'DOCUMENT_APPROVED', doc.hash);
  } finally {
    client.release();
  }

  return sendSuccess(res, { status: 'APPROVED', comment: comment || null });
});

// ─── POST /documents/:id/reject ──────────────────────────────────────────────
router.post('/documents/:id/reject', authenticateJWT, requireRole('SENIOR_OFFICER'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { comment } = req.body;
  const user = req.user!;
  const doc = await getDocumentWithVersion(id);
  if (!doc?.ver_id) return sendError(res, 'NOT_FOUND', 'Document not found.', 404);

  await pool.query(
    `UPDATE document_versions SET status = 'REJECTED'::version_status WHERE id = $1`, [doc.ver_id]
  );
  await pool.query(
    `INSERT INTO approvals (id, document_version_id, reviewer_id, decision, comment)
     VALUES (uuid_generate_v4(), $1, $2, 'REJECTED'::approval_decision, $3)`,
    [doc.ver_id, user.id, comment || null]
  );
  await logAuditEvent(user.id, 'DOCUMENT_REJECTED', 'DOCUMENT', id);
  return sendSuccess(res, { status: 'REJECTED', comment: comment || null });
});

// ─── POST /documents/:id/sign ─────────────────────────────────────────────────
router.post('/documents/:id/sign', authenticateJWT, requireRole('SENIOR_OFFICER'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const user = req.user!;
  const doc = await getDocumentWithVersion(id);
  if (!doc?.ver_id) return sendError(res, 'NOT_FOUND', 'Document not found.', 404);
  if (doc.ver_status !== 'APPROVED') {
    return sendError(res, 'VALIDATION_ERROR', `Document must be APPROVED before signing. Current status: ${doc.ver_status}`, 409);
  }

  const sigRef = `SIG-${uuidv4().substring(0, 8).toUpperCase()}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE document_versions SET status = 'SIGNED'::version_status WHERE id = $1`, [doc.ver_id]
    );
    await client.query(
      `INSERT INTO signatures (id, document_version_id, signer_id, hash, reference)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
      [doc.ver_id, user.id, doc.hash, sigRef]
    );

    // Blockchain record for DOCUMENT_SIGNED (§25)
    await appendBlockchainRecord(client, 'DOCUMENT_VERSION', doc.ver_id, 'DOCUMENT_SIGNED', doc.hash);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await logAuditEvent(user.id, 'DOCUMENT_SIGNED', 'DOCUMENT', id);

  return sendSuccess(res, {
    status: 'SIGNED',
    signature: {
      signer: { id: user.id, name: user.name },
      hash: doc.hash, reference: sigRef, timestamp: new Date().toISOString(),
    },
  });
});

// ─── POST /documents/:id/lock ─────────────────────────────────────────────────
router.post('/documents/:id/lock', authenticateJWT, requireRole('SENIOR_OFFICER'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const user = req.user!;
  const doc = await getDocumentWithVersion(id);
  if (!doc?.ver_id) return sendError(res, 'NOT_FOUND', 'Document not found.', 404);
  if (doc.ver_status !== 'SIGNED') {
    return sendError(res, 'VALIDATION_ERROR', `Document must be SIGNED before locking. Current status: ${doc.ver_status}`, 409);
  }

  const client = await pool.connect();
  let txRef = '';
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE document_versions SET status = 'LOCKED'::version_status WHERE id = $1`, [doc.ver_id]
    );
    txRef = await appendBlockchainRecord(client, 'DOCUMENT_VERSION', doc.ver_id, 'DOCUMENT_LOCKED', doc.hash);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await logAuditEvent(user.id, 'DOCUMENT_LOCKED', 'DOCUMENT', id);
  return sendSuccess(res, { status: 'LOCKED', txReference: txRef });
});

// ─── POST /documents/:id/tamper-demo — Demo: corrupt file bytes ───────────────
router.post('/documents/:id/tamper-demo', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const doc = await getDocumentWithVersion(id);
  if (!doc?.storage_key) return sendError(res, 'NOT_FOUND', 'Document not found.', 404);

  await StorageService.overwriteFileForTamperDemo(
    doc.storage_key,
    'UNAUTHORIZED OUT-OF-BAND MODIFICATION BY MALICIOUS ACTOR!'
  );

  return sendSuccess(res, {
    message: 'File on storage has been altered for demo purposes. Run /verify to detect the tampering.',
    storageKey: doc.storage_key, documentId: id,
  });
});

// ─── Internal: append a blockchain record with hash-chaining ──────────────────
async function appendBlockchainRecord(
  client: any,
  refType: string,
  refId: string,
  action: string,
  hash: string
): Promise<string> {
  const lastRow = await client.query(
    `SELECT hash FROM blockchain_records ORDER BY created_at DESC LIMIT 1`
  );
  const prevHash = lastRow.rows[0]?.hash || CryptoService.GENESIS_HASH;
  const txRef    = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
  const id       = uuidv4();

  await client.query(
    `INSERT INTO blockchain_records (id, ref_type, ref_id, action, hash, prev_hash, tx_reference)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, refType, refId, action, hash, prevHash, txRef]
  );
  return txRef;
}

export default router;
