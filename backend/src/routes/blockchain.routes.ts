import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { sendSuccess, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest, requireRole } from '../middlewares/auth';
import { CryptoService } from '../services/crypto.service';
import { StorageService } from '../services/storage.service';
import { FabricService } from '../services/fabric.service';

const router = Router();

/**
 * POST /blockchain/register — Register a document on the blockchain ledger
 * Dual-write: Fabric (if connected) + PostgreSQL (always)
 */
router.post('/register', authenticateJWT, requireRole('SENIOR_OFFICER'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { documentId, versionId, action } = req.body;
  const user = req.user!;

  if (!documentId) {
    return sendError(res, 'VALIDATION_ERROR', 'documentId is required.', 400);
  }

  // Find target document and version
  let targetVerId = versionId;
  let targetHash = '';

  if (!targetVerId) {
    const docRow = await pool.query(
      `SELECT d.id, d.name, d.type, d.classification, d.case_id, d.current_version_id, dv.hash
       FROM documents d
       LEFT JOIN document_versions dv ON d.current_version_id = dv.id
       WHERE d.id = $1`,
      [documentId]
    );
    if (!docRow.rows[0] || !docRow.rows[0].current_version_id) {
      return sendError(res, 'NOT_FOUND', `Document or active version for ID ${documentId} not found.`, 404);
    }
    targetVerId = docRow.rows[0].current_version_id;
    targetHash = docRow.rows[0].hash;

    // ── Fabric: Register document on-chain ──
    const fabricResult = await FabricService.registerDocument(
      documentId,
      docRow.rows[0].case_id,
      docRow.rows[0].name,
      docRow.rows[0].type,
      targetHash,
      user.id,
      user.name,
      docRow.rows[0].classification,
      1
    );

    // ── PostgreSQL: Always write to local ledger as backup ──
    const client = await pool.connect();
    const id = uuidv4();
    const act = action || 'DOCUMENT_REGISTERED';
    let txReference = fabricResult.source === 'FABRIC' ? fabricResult.txId : '';

    try {
      await client.query('BEGIN');
      const lastRow = await client.query(
        `SELECT hash FROM blockchain_records ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
      );
      const prevHash = lastRow.rows[0]?.hash || CryptoService.GENESIS_HASH;
      if (!txReference) {
        txReference = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      await client.query(
        `INSERT INTO blockchain_records (id, ref_type, ref_id, action, hash, prev_hash, tx_reference)
         VALUES ($1, 'DOCUMENT_VERSION', $2, $3, $4, $5, $6)`,
        [id, targetVerId, act, targetHash, prevHash, txReference]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return sendSuccess(res, {
      id,
      refType: 'DOCUMENT_VERSION',
      refId: targetVerId,
      action: act,
      hash: targetHash,
      txReference,
      fabricSource: fabricResult.source,
      fabricTxId: fabricResult.txId,
      createdAt: new Date().toISOString()
    }, 201);
  } else {
    const verRow = await pool.query(
      `SELECT hash FROM document_versions WHERE id = $1 AND document_id = $2`,
      [targetVerId, documentId]
    );
    if (!verRow.rows[0]) {
      return sendError(res, 'NOT_FOUND', `Version ${targetVerId} for document ${documentId} not found.`, 404);
    }
    targetHash = verRow.rows[0].hash;

    const client = await pool.connect();
    let txReference = '';
    const id = uuidv4();
    const act = action || 'DOCUMENT_REGISTERED';

    try {
      await client.query('BEGIN');
      const lastRow = await client.query(
        `SELECT hash FROM blockchain_records ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
      );
      const prevHash = lastRow.rows[0]?.hash || CryptoService.GENESIS_HASH;
      txReference = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

      await client.query(
        `INSERT INTO blockchain_records (id, ref_type, ref_id, action, hash, prev_hash, tx_reference)
         VALUES ($1, 'DOCUMENT_VERSION', $2, $3, $4, $5, $6)`,
        [id, targetVerId, act, targetHash, prevHash, txReference]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return sendSuccess(res, {
      id,
      refType: 'DOCUMENT_VERSION',
      refId: targetVerId,
      action: act,
      hash: targetHash,
      txReference,
      fabricSource: 'FALLBACK',
      createdAt: new Date().toISOString()
    }, 201);
  }
});

/**
 * GET /blockchain/records/:documentId — Get all blockchain ledger records for a document.
 * If Fabric is connected, fetches real Fabric history. Otherwise falls back to PostgreSQL.
 */
router.get('/records/:documentId', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { documentId } = req.params;

  // Get version IDs for PostgreSQL fallback query
  const verRows = await pool.query(
    `SELECT id, version_no FROM document_versions WHERE document_id = $1 ORDER BY version_no ASC`,
    [documentId]
  );

  if (verRows.rows.length === 0) {
    return sendError(res, 'NOT_FOUND', `No versions found for document ${documentId}.`, 404);
  }

  // ── Try Fabric first ──
  if (FabricService.isConnected()) {
    try {
      const fabricHistory = await FabricService.getDocumentHistory(documentId);
      if (fabricHistory.length > 0) {
        const records = fabricHistory.map((entry, idx) => ({
          id: entry.txId,
          refType: 'DOCUMENT_VERSION',
          refId: documentId,
          versionNo: (entry.record as any)?.versionNo || idx + 1,
          action: entry.record?.status ? `DOCUMENT_${entry.record.status}` : 'DOCUMENT_REGISTERED',
          hash: entry.record?.hash || '',
          prevHash: idx > 0 ? fabricHistory[idx - 1].txId : CryptoService.GENESIS_HASH,
          txReference: entry.txId,
          createdAt: entry.timestamp,
          source: 'FABRIC',
        }));

        return sendSuccess(res, {
          documentId,
          records,
          source: 'HYPERLEDGER_FABRIC',
          network: FabricService.getConnectionInfo(),
        });
      }
    } catch (err: any) {
      console.error('Fabric history query failed, falling back to PostgreSQL:', err.message);
    }
  }

  // ── Fallback to PostgreSQL ──
  const verIds = verRows.rows.map(v => v.id);
  const bcRows = await pool.query(
    `SELECT id, ref_type, ref_id, action, hash, prev_hash, tx_reference, created_at
     FROM blockchain_records
     WHERE ref_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [verIds]
  );

  const verMap = new Map(verRows.rows.map(v => [v.id, v.version_no]));
  const records = bcRows.rows.map(r => ({
    id: r.id,
    refType: r.ref_type,
    refId: r.ref_id,
    versionNo: verMap.get(r.ref_id) || 1,
    action: r.action,
    hash: r.hash,
    prevHash: r.prev_hash,
    txReference: r.tx_reference,
    createdAt: r.created_at,
    source: 'POSTGRESQL',
  }));

  return sendSuccess(res, {
    documentId,
    records,
    source: FabricService.isConnected() ? 'HYPERLEDGER_FABRIC' : 'POSTGRESQL_LEDGER',
    network: FabricService.getConnectionInfo(),
  });
});

/**
 * POST /blockchain/verify/:documentId — Verify document integrity against ledger
 * Cross-verifies against both Fabric (if connected) and storage hash.
 */
router.post('/verify/:documentId', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const { documentId } = req.params;

  const docRow = await pool.query(
    `SELECT d.id, d.current_version_id, dv.id AS ver_id, dv.hash, dv.storage_key
     FROM documents d
     LEFT JOIN document_versions dv ON d.current_version_id = dv.id
     WHERE d.id = $1`,
    [documentId]
  );

  if (!docRow.rows[0] || !docRow.rows[0].current_version_id) {
    return sendError(res, 'NOT_FOUND', `Document or active version for ID ${documentId} not found.`, 404);
  }

  const ver = docRow.rows[0];

  // Re-compute hash from live storage file
  let currentHash = '';
  let storageError = '';
  try {
    const fileBuffer = await StorageService.getFile(ver.storage_key);
    currentHash = CryptoService.calculateBufferHash(fileBuffer);
  } catch (err: any) {
    storageError = err.message;
  }

  const dbMatch = currentHash === ver.hash;

  // ── Fabric verification ──
  let fabricVerification: any = null;
  if (FabricService.isConnected()) {
    fabricVerification = await FabricService.verifyDocument(documentId, currentHash || ver.hash);
  }

  // PostgreSQL blockchain reference
  const bcRow = await pool.query(
    `SELECT tx_reference, hash, prev_hash
     FROM blockchain_records
     WHERE ref_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [ver.ver_id]
  );

  const txReference = bcRow.rows[0] ? bcRow.rows[0].tx_reference : null;

  return sendSuccess(res, {
    status: dbMatch ? 'VERIFIED' : 'MISMATCH',
    registeredHash: ver.hash,
    currentHash: currentHash || null,
    storageError: storageError || undefined,
    txReference,
    fabricVerification: fabricVerification || undefined,
    fabricConnected: FabricService.isConnected(),
    checkedAt: new Date().toISOString()
  });
});

/**
 * GET /blockchain/status — Fabric network status and connection info
 */
router.get('/status', authenticateJWT, async (_req: AuthRequest, res: Response): Promise<any> => {
  return sendSuccess(res, FabricService.getConnectionInfo());
});

export default router;
