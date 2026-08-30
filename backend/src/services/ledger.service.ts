import { v4 as uuidv4 } from 'uuid';
import { CryptoService } from './crypto.service';

/**
 * Appends a hash-chained record to blockchain_records: fetches the last record's
 * hash (row-locked to serialize concurrent writers), links this new record's
 * prev_hash to it, and inserts. Must be called within a transaction the caller
 * owns (BEGIN/COMMIT/ROLLBACK) on the same `client`, since it does not manage
 * its own transaction boundary.
 */
export async function appendBlockchainRecord(
  client: any,
  refType: string,
  refId: string,
  action: string,
  hash: string,
  txReference?: string
): Promise<string> {
  const lastRow = await client.query(
    `SELECT hash FROM blockchain_records ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
  );
  const prevHash = lastRow.rows[0]?.hash || CryptoService.GENESIS_HASH;
  const txRef = txReference || `TX-${Math.floor(100000 + Math.random() * 900000)}`;
  const id = uuidv4();

  await client.query(
    `INSERT INTO blockchain_records (id, ref_type, ref_id, action, hash, prev_hash, tx_reference)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, refType, refId, action, hash, prevHash, txRef]
  );
  return txRef;
}
