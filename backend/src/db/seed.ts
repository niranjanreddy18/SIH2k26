import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './pool';
import { CryptoService } from '../services/crypto.service';
import { StorageService } from '../services/storage.service';

/**
 * Seeds the database with demo data for the SIH demonstration.
 * Idempotent — safe to run multiple times (uses ON CONFLICT DO NOTHING with fixed UUIDs).
 *
 * Demo users (all password: Password123!):
 *   investigator@police.gov.in  — INVESTIGATOR
 *   senior@police.gov.in        — SENIOR_OFFICER
 *   forensic@lab.gov.in         — FORENSIC_OFFICER
 *   admin@slidms.gov.in         — ADMIN
 */
export async function seedDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = bcrypt.hashSync('Password123!', 12);

    // ─── Users ────────────────────────────────────────────────────────────────
    const U1 = '11111111-1111-1111-1111-111111111111';
    const U2 = '22222222-2222-2222-2222-222222222222';
    const U3 = '33333333-3333-3333-3333-333333333333';
    const U4 = '44444444-4444-4444-4444-444444444444';

    const users = [
      [U1, 'Inspector Vikram Singh',  'investigator@police.gov.in', 'INVESTIGATOR',    'Cyber Crime Cell'],
      [U2, 'ACP Rajeshwar Sharma',    'senior@police.gov.in',       'SENIOR_OFFICER',  'Special Branch'],
      [U3, 'Dr. Ananya Roy',          'forensic@lab.gov.in',        'FORENSIC_OFFICER','Central Forensic Science Laboratory'],
      [U4, 'Admin Desk Officer',      'admin@slidms.gov.in',        'ADMIN',           'IT & Cyber Security Directorate'],
    ];

    for (const [id, name, email, role, dept] of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, department, mfa_enabled)
         VALUES ($1, $2, $3, $4, $5::user_role, $6, true)
         ON CONFLICT (id) DO NOTHING`,
        [id, name, email, passwordHash, role, dept]
      );
    }

    // ─── Cases ────────────────────────────────────────────────────────────────
    const C1 = 'aaaaaaaa-1111-1111-1111-111111111111';
    const C2 = 'aaaaaaaa-2222-2222-2222-222222222222';

    await client.query(
      `INSERT INTO cases (id, fir_number, title, description, crime_type, status, classification, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::case_status, $7::classification_tier, $8)
       ON CONFLICT (id) DO NOTHING`,
      [C1, 'FIR-2026-9042',
       'Cyber Infrastructure Security Breach & Financial Heist',
       'Unauthorized access into state data repository resulting in encryption of sensitive investigation logs.',
       'Cyber Crime & Financial Fraud', 'UNDER_INVESTIGATION', 'CONFIDENTIAL', U1]
    );

    await client.query(
      `INSERT INTO cases (id, fir_number, title, description, crime_type, status, classification, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::case_status, $7::classification_tier, $8)
       ON CONFLICT (id) DO NOTHING`,
      [C2, 'FIR-2026-1029',
       'Illegal Ordnance Procurement Network',
       'Interstate trafficking of illegal weapons and counterfeit documentation.',
       'Arms Act & Smuggling', 'OPEN', 'INTERNAL', U1]
    );

    // ─── Case assignments ─────────────────────────────────────────────────────
    for (const userId of [U1, U2]) {
      await client.query(
        `INSERT INTO case_assignments (id, case_id, user_id)
         VALUES (uuid_generate_v4(), $1, $2)
         ON CONFLICT ON CONSTRAINT unique_case_user DO NOTHING`,
        [C1, userId]
      );
    }

    // ─── Sample document (LOCKED + SIGNED for instant demo) ───────────────────
    const DOC1  = 'bbbbbbbb-1111-1111-1111-111111111111';
    const VER1  = 'cccccccc-1111-1111-1111-111111111111';

    // Write sample file to storage so verify endpoint works.
    // Always (re)write the canonical bytes on every boot — this storage key is a
    // fixed demo fixture that /documents/:id/tamper-demo intentionally corrupts,
    // so seeding must be self-healing rather than trusting whatever is on disk
    // (a stale tampered copy would otherwise get "locked in" as the registered hash).
    const sampleContent = 'SLIDMS Official Witness Statement — FIR 2026-9042. Witness: Key Informant Alpha.';
    const storageKey1 = `doc_sample_witness_statement.txt`;
    const { hash: hash1 } = await StorageService.saveFileWithKey(
      Buffer.from(sampleContent, 'utf8'),
      storageKey1
    );

    // Insert document (without current_version_id first, resolve circular FK after)
    const docExists = await client.query(`SELECT id FROM documents WHERE id = $1`, [DOC1]);
    if (docExists.rows.length === 0) {
      await client.query(
        `INSERT INTO documents (id, case_id, name, type, classification, created_by)
         VALUES ($1, $2, $3, $4::document_type, $5::classification_tier, $6)`,
        [DOC1, C1, 'Primary Witness Statement - Informant Alpha', 'WITNESS_STATEMENT', 'CONFIDENTIAL', U1]
      );

      await client.query(
        `INSERT INTO document_versions (id, document_id, version_no, hash, storage_key, file_size, mime_type, status, comment, created_by)
         VALUES ($1, $2, 1, $3, $4, $5, 'text/plain', 'SIGNED'::version_status, 'Initial statement recorded and verified by lead investigator.', $6)`,
        [VER1, DOC1, hash1, storageKey1, Buffer.byteLength(sampleContent), U1]
      );

      await client.query(
        `UPDATE documents SET current_version_id = $1 WHERE id = $2`,
        [VER1, DOC1]
      );

      // Signature record
      const SIG1 = uuidv4();
      await client.query(
        `INSERT INTO signatures (id, document_version_id, signer_id, hash, reference)
         VALUES ($1, $2, $3, $4, 'SIG-GENESIS-001')`,
        [SIG1, VER1, U2, hash1]
      );
    } else {
      // Self-heal: an earlier run may have registered this fixed-path fixture
      // while a stale tamper-demo copy was on disk. Re-sync the registered hash
      // to the canonical content so /verify starts every boot in a VERIFIED state.
      await client.query(
        `UPDATE document_versions SET hash = $1 WHERE id = $2`,
        [hash1, VER1]
      );
    }

    // ─── Blockchain record for the signed document ─────────────────────────────
    const BC1 = 'dddddddd-1111-1111-1111-111111111111';
    await client.query(
      `INSERT INTO blockchain_records (id, ref_type, ref_id, action, hash, prev_hash, tx_reference)
       VALUES ($1, 'DOCUMENT_VERSION', $2, 'DOCUMENT_SIGNED', $3,
               '0000000000000000000000000000000000000000000000000000000000000000', 'TX-839201')
       ON CONFLICT (id) DO NOTHING`,
      [BC1, VER1, hash1]
    );

    // ─── Evidence ──────────────────────────────────────────────────────────────
    const EV1 = 'eeeeeeee-1111-1111-1111-111111111111';

    await client.query(
      `INSERT INTO evidence (id, case_id, type, description, status, collected_by, collected_at)
       VALUES ($1, $2, $3, $4, 'ANALYZED'::evidence_status, $5, now() - interval '5 hours')
       ON CONFLICT (id) DO NOTHING`,
      [EV1, C1,
       'Encrypted Solid State Drive (SSD 1TB)',
       'Extracted from primary command console at crime scene. Serial #SSD-99482.',
       U1]
    );

    // Custody event: Investigator → Forensic Officer
    await client.query(
      `INSERT INTO evidence_custody_events (id, evidence_id, from_user_id, to_user_id, action, reason, hash)
       VALUES ($1, $2, $3, $4, 'TRANSFERRED', 'Forensic extraction & disk image recovery.', $5)
       ON CONFLICT (id) DO NOTHING`,
      ['11111111-eeee-1111-1111-111111111111', EV1, U1, U3,
       CryptoService.calculateStringHash(`TRANSFERRED${U1}${U3}${EV1}`)]
    );

    // ─── Genesis audit event ───────────────────────────────────────────────────
    const AUDIT1 = 'ffffffff-1111-1111-1111-111111111111';
    const auditExists = await client.query(`SELECT id FROM audit_events WHERE id = $1`, [AUDIT1]);
    if (auditExists.rows.length === 0) {
      const ts = new Date('2026-08-10T14:30:00Z').toISOString();
      const genesisHash = CryptoService.computeAuditEventHash(
        U1, 'CASE_CREATED', C1, ts, CryptoService.GENESIS_HASH
      );
      await client.query(
        `INSERT INTO audit_events (id, actor_id, action, target_type, target_id, result, prev_event_hash, event_hash, created_at)
         VALUES ($1, $2, 'CASE_CREATED', 'CASE', $3, 'SUCCESS'::audit_result, $4, $5, $6)`,
        [AUDIT1, U1, C1, CryptoService.GENESIS_HASH, genesisHash, ts]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded with demo data');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow running directly: ts-node src/db/seed.ts
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
