-- SLIDMS PostgreSQL Database Schema
-- Matches SLIDMS_API_Contract.md exactly

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('INVESTIGATOR', 'SENIOR_OFFICER', 'FORENSIC_OFFICER', 'ADMIN');

CREATE TYPE case_status AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'UNDER_REVIEW', 'CHARGESHEET_PREPARED', 'COURT_SUBMITTED', 'CLOSED', 'ARCHIVED');

CREATE TYPE classification_tier AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL');

CREATE TYPE document_type AS ENUM (
  'FIR', 'COMPLAINT', 'WITNESS_STATEMENT', 'INVESTIGATION_REPORT', 
  'FORENSIC_REPORT', 'MEDICAL_REPORT', 'SEIZURE_MEMO', 'ARREST_MEMO', 
  'CHARGE_SHEET', 'COURT_FILING', 'COURT_ORDER', 'LEGAL_NOTICE', 
  'JUDGMENT', 'EVIDENCE', 'OTHER'
);

CREATE TYPE version_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'APPROVED', 'SIGNED', 'LOCKED', 'ARCHIVED');

CREATE TYPE approval_decision AS ENUM ('APPROVED', 'REJECTED');

CREATE TYPE evidence_status AS ENUM ('REGISTERED', 'COLLECTED', 'UPLOADED', 'STORED', 'TRANSFERRED', 'RECEIVED', 'ANALYZED', 'REPORT_GENERATED', 'SUBMITTED', 'ARCHIVED');

CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAILURE');

-- Tables

-- 1. User
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" user_role NOT NULL,
  "department" VARCHAR(120),
  "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Case
CREATE TABLE IF NOT EXISTS "cases" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fir_number" VARCHAR(60) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "crime_type" VARCHAR(120),
  "status" case_status NOT NULL DEFAULT 'OPEN',
  "classification" classification_tier NOT NULL DEFAULT 'INTERNAL',
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CaseAssignment
CREATE TABLE IF NOT EXISTS "case_assignments" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_case_user" UNIQUE("case_id", "user_id")
);

-- 4. Document
CREATE TABLE IF NOT EXISTS "documents" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "type" document_type NOT NULL,
  "classification" classification_tier NOT NULL,
  "current_version_id" UUID, -- Foreign key added below after DocumentVersion created
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. DocumentVersion
CREATE TABLE IF NOT EXISTS "document_versions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "version_no" INTEGER NOT NULL,
  "hash" CHAR(64) NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "file_size" BIGINT NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "status" version_status NOT NULL DEFAULT 'DRAFT',
  "comment" TEXT,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "unique_document_version" UNIQUE("document_id", "version_no")
);

-- Foreign key circular reference resolution
ALTER TABLE "documents" 
  ADD CONSTRAINT "fk_current_version" 
  FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;

-- 6. Approval
CREATE TABLE IF NOT EXISTS "approvals" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE CASCADE,
  "reviewer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "decision" approval_decision NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Signature
CREATE TABLE IF NOT EXISTS "signatures" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE CASCADE,
  "signer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "hash" CHAR(64) NOT NULL,
  "reference" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Evidence
CREATE TABLE IF NOT EXISTS "evidence" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
  "type" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "status" evidence_status NOT NULL DEFAULT 'REGISTERED',
  "collected_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "collected_at" TIMESTAMPTZ NOT NULL
);

-- 9. EvidenceCustodyEvent
CREATE TABLE IF NOT EXISTS "evidence_custody_events" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "evidence_id" UUID NOT NULL REFERENCES "evidence"("id") ON DELETE CASCADE,
  "from_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "to_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "action" VARCHAR(60) NOT NULL,
  "reason" TEXT,
  "hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. AuditEvent
CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "action" VARCHAR(60) NOT NULL,
  "target_type" VARCHAR(40) NOT NULL,
  "target_id" UUID NOT NULL,
  "result" audit_result NOT NULL,
  "prev_event_hash" CHAR(64) NOT NULL,
  "event_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Share
CREATE TABLE IF NOT EXISTS "shares" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE CASCADE,
  "recipient_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "can_view" BOOLEAN NOT NULL DEFAULT true,
  "can_download" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. BlockchainRecord
CREATE TABLE IF NOT EXISTS "blockchain_records" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ref_type" VARCHAR(40) NOT NULL,
  "ref_id" UUID NOT NULL,
  "action" VARCHAR(60) NOT NULL,
  "hash" CHAR(64) NOT NULL,
  "tx_reference" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS "idx_cases_fir" ON "cases"("fir_number");
CREATE INDEX IF NOT EXISTS "idx_documents_case" ON "documents"("case_id");
CREATE INDEX IF NOT EXISTS "idx_doc_versions_doc" ON "document_versions"("document_id");
CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "audit_events"("actor_id");
CREATE INDEX IF NOT EXISTS "idx_audit_target" ON "audit_events"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "idx_evidence_case" ON "evidence"("case_id");

