import path from 'path';
import fs from 'fs';
import { pool } from './pool';

/**
 * Runs the schema.sql migration + any supplementary DDL that extends it.
 * Safe to call on every server startup — uses IF NOT EXISTS / DO blocks.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // ----- 1. Enable uuid extension -----
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ----- 2. Create ENUM types (idempotent via DO block) -----
    const enumDefs: [string, string[]][] = [
      ['user_role', ['INVESTIGATOR', 'SENIOR_OFFICER', 'FORENSIC_OFFICER', 'ADMIN']],
      ['case_status', ['OPEN', 'UNDER_INVESTIGATION', 'UNDER_REVIEW', 'CHARGESHEET_PREPARED', 'COURT_SUBMITTED', 'CLOSED', 'ARCHIVED']],
      ['classification_tier', ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL']],
      ['document_type', ['FIR', 'COMPLAINT', 'WITNESS_STATEMENT', 'INVESTIGATION_REPORT', 'FORENSIC_REPORT', 'MEDICAL_REPORT', 'SEIZURE_MEMO', 'ARREST_MEMO', 'CHARGE_SHEET', 'COURT_FILING', 'COURT_ORDER', 'LEGAL_NOTICE', 'JUDGMENT', 'EVIDENCE', 'OTHER']],
      ['version_status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'APPROVED', 'SIGNED', 'LOCKED', 'ARCHIVED']],
      ['approval_decision', ['APPROVED', 'REJECTED']],
      ['evidence_status', ['REGISTERED', 'COLLECTED', 'UPLOADED', 'STORED', 'TRANSFERRED', 'RECEIVED', 'ANALYZED', 'REPORT_GENERATED', 'SUBMITTED', 'ARCHIVED']],
      ['audit_result', ['SUCCESS', 'FAILURE']],
    ];

    for (const [typeName, values] of enumDefs) {
      const valuesStr = values.map(v => `'${v}'`).join(', ');
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE ${typeName} AS ENUM (${valuesStr});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }

    // ----- 3. Core tables -----
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name"          VARCHAR(120) NOT NULL,
        "email"         VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "role"          user_role NOT NULL,
        "department"    VARCHAR(120),
        "mfa_enabled"   BOOLEAN NOT NULL DEFAULT false,
        "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
        "locked_until"  TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "cases" (
        "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fir_number"     VARCHAR(60) NOT NULL,
        "title"          VARCHAR(255) NOT NULL,
        "description"    TEXT,
        "crime_type"     VARCHAR(120),
        "status"         case_status NOT NULL DEFAULT 'OPEN',
        "classification" classification_tier NOT NULL DEFAULT 'INTERNAL',
        "created_by"     UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "case_assignments" (
        "id"      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "unique_case_user" UNIQUE("case_id", "user_id")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id"                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "case_id"            UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
        "name"               VARCHAR(255) NOT NULL,
        "type"               document_type NOT NULL,
        "classification"     classification_tier NOT NULL,
        "current_version_id" UUID,
        "created_by"         UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "document_versions" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
        "version_no"  INTEGER NOT NULL,
        "hash"        CHAR(64) NOT NULL,
        "storage_key" VARCHAR(500) NOT NULL,
        "file_size"   BIGINT NOT NULL,
        "mime_type"   VARCHAR(100) NOT NULL,
        "status"      version_status NOT NULL DEFAULT 'DRAFT',
        "comment"     TEXT,
        "created_by"  UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "unique_document_version" UNIQUE("document_id", "version_no")
      );
    `);

    // Resolve circular FK after both tables exist
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "documents" ADD CONSTRAINT "fk_current_version"
          FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "approvals" (
        "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE CASCADE,
        "reviewer_id"         UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "decision"            approval_decision NOT NULL,
        "comment"             TEXT,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "signatures" (
        "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE CASCADE,
        "signer_id"           UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "hash"                CHAR(64) NOT NULL,
        "reference"           VARCHAR(255) NOT NULL,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "evidence" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "case_id"      UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
        "type"         VARCHAR(120) NOT NULL,
        "description"  TEXT,
        "status"       evidence_status NOT NULL DEFAULT 'REGISTERED',
        "collected_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "collected_at" TIMESTAMPTZ NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "evidence_custody_events" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "evidence_id" UUID NOT NULL REFERENCES "evidence"("id") ON DELETE CASCADE,
        "from_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "to_user_id"  UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "action"      VARCHAR(60) NOT NULL,
        "reason"      TEXT,
        "hash"        CHAR(64) NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "audit_events" (
        "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actor_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "action"         VARCHAR(60) NOT NULL,
        "target_type"    VARCHAR(40) NOT NULL,
        "target_id"      UUID NOT NULL,
        "result"         audit_result NOT NULL,
        "prev_event_hash" CHAR(64) NOT NULL,
        "event_hash"     CHAR(64) NOT NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "shares" (
        "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE CASCADE,
        "recipient_id"        UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "can_view"            BOOLEAN NOT NULL DEFAULT true,
        "can_download"        BOOLEAN NOT NULL DEFAULT false,
        "expires_at"          TIMESTAMPTZ NOT NULL,
        "revoked_at"          TIMESTAMPTZ,
        "created_by"          UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "blockchain_records" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ref_type"    VARCHAR(40) NOT NULL,
        "ref_id"      UUID NOT NULL,
        "action"      VARCHAR(60) NOT NULL,
        "hash"        CHAR(64) NOT NULL,
        "prev_hash"   CHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
        "tx_reference" VARCHAR(255) NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // ----- 4. Refresh token table for session revocation (§44) -----
    await client.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" CHAR(64) NOT NULL UNIQUE,
        "revoked_at" TIMESTAMPTZ,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // ----- 5. Indexes -----
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "idx_cases_fir" ON "cases"("fir_number")`,
      `CREATE INDEX IF NOT EXISTS "idx_documents_case" ON "documents"("case_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_doc_versions_doc" ON "document_versions"("document_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "audit_events"("actor_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_audit_target" ON "audit_events"("target_type", "target_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_evidence_case" ON "evidence"("case_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_hash" ON "refresh_tokens"("token_hash")`,
      `CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens"("user_id")`,
    ];
    for (const idx of indexes) {
      await client.query(idx);
    }

    console.log('✅ Database migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow running directly: ts-node src/db/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

