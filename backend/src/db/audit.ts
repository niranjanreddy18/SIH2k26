import { pool } from './pool';
import { CryptoService } from '../services/crypto.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Appends a tamper-evident audit event to the audit_events table.
 * Every record is hash-chained to the previous one (§21.1 of the spec).
 * The hash formula: SHA256(actorId + action + targetId + timestamp + prevEventHash)
 */
export async function logAuditEvent(
  actorId: string,
  action: string,
  targetType: 'DOCUMENT' | 'CASE' | 'EVIDENCE' | 'USER',
  targetId: string,
  result: 'SUCCESS' | 'FAILURE' = 'SUCCESS'
): Promise<void> {
  const client = await pool.connect();
  try {
    // Serialise the insert: get the last event hash inside a transaction
    // so the chain is always consistent even under concurrent writes.
    await client.query('BEGIN');

    const lastRow = await client.query(
      `SELECT event_hash FROM audit_events ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
    );

    const prevEventHash =
      lastRow.rows.length > 0 ? lastRow.rows[0].event_hash : CryptoService.GENESIS_HASH;

    const timestamp = new Date().toISOString();
    const eventHash = CryptoService.computeAuditEventHash(
      actorId,
      action,
      targetId,
      timestamp,
      prevEventHash
    );

    await client.query(
      `INSERT INTO audit_events (id, actor_id, action, target_type, target_id, result, prev_event_hash, event_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [uuidv4(), actorId, action, targetType, targetId, result, prevEventHash, eventHash, timestamp]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    // Audit logging failure must not crash the application; log and continue.
    console.error('[AuditLog] Failed to write audit event:', err);
  } finally {
    client.release();
  }
}
