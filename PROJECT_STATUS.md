# SLIDMS — Secure Legal & Investigation Document Management System

> **Smart India Hackathon 2026 (SIH'26)**
> Team Project | Status: **Active Development — MVP Phase**
> Repository: `https://github.com/niranjanreddy18/SIH2k26.git`

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Repository Structure](#-repository-structure)
4. [Database Schema (PostgreSQL)](#-database-schema-postgresql)
5. [Backend API Endpoints](#-backend-api-endpoints)
6. [Frontend Pages & Components](#-frontend-pages--components)
7. [Application Flow (End-to-End)](#-application-flow-end-to-end)
8. [Security & Cryptographic Model](#-security--cryptographic-model)
9. [Blockchain Ledger Architecture](#-blockchain-ledger-architecture)
10. [Current Status & What's Done](#-current-status--whats-done)
11. [What's Remaining / Next Steps](#-whats-remaining--next-steps)
12. [How to Run Locally](#-how-to-run-locally)
13. [Demo Accounts](#-demo-accounts)

---

## 🎯 Project Overview

SLIDMS is a **tamper-proof, blockchain-anchored document management system** built for Indian law enforcement and judicial departments. It ensures that legal documents (FIRs, charge sheets, forensic reports, witness statements, seizure memos, court filings) remain **cryptographically verifiable** throughout their lifecycle — from initial filing to court submission.

### Core Problem It Solves

- **Document Tampering**: Legal evidence gets modified after filing → SLIDMS SHA-256 hashes every version at upload and anchors it to an immutable blockchain ledger.
- **Broken Chain of Custody**: Physical evidence changes hands without records → SLIDMS tracks every handover with hashed custody events.
- **Unauthorized Access**: Sensitive case files accessed without authorization → SLIDMS uses role-based access control (RBAC), classification tiers (Public → Highly Confidential), and time-bounded sharing.
- **Audit Trail Gaps**: No record of who accessed/modified what → SLIDMS maintains a hash-chained audit log (Merkle-style) where every event's hash depends on the previous event, making silent deletion or reordering impossible.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend Runtime** | Node.js + Express.js | REST API server |
| **Backend Language** | TypeScript | Type-safe server code |
| **Database** | PostgreSQL 15+ | Relational persistence with UUID primary keys |
| **Authentication** | JWT (Access + Refresh tokens) | Stateless auth with token rotation |
| **Password Hashing** | bcryptjs | Secure password storage |
| **Cryptographic Hashing** | SHA-256 (Node.js `crypto`) | Document fingerprinting & chain verification |
| **File Storage** | Local filesystem (`storage_data/`) | Document binary storage (MinIO/S3 ready) |
| **Frontend Framework** | React 18 + TypeScript | SPA with component architecture |
| **Frontend Build** | Vite 5 | Fast HMR development server |
| **Styling** | Tailwind CSS 4.0 | Utility-first CSS framework |
| **Icons** | Lucide React | Modern icon library |
| **HTTP Client** | Axios | API communication with interceptors |
| **Routing** | React Router v7 | Client-side navigation |

---

## 📂 Repository Structure

```
SIH26/
├── .gitignore
├── PROJECT_STATUS.md              ← You are here
├── SLIDMS_API_Contract.md         ← API specification document
├── SLIDMS_Backend_Team_Spec.md    ← Backend requirements spec
├── SLIDMS_Frontend_Team_Spec.md   ← Frontend requirements spec
├── SLIDMS_Backend_Implementation_Guide (1).md  ← Step-by-step backend guide
├── Secure_Legal___Investigation_Document_Management_System_v2.md ← Full system design doc
│
├── backend/
│   ├── .env                       ← Environment variables (PostgreSQL, JWT, Storage)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts              ← Express app entry point, route mounting, startup
│       ├── db/
│       │   ├── pool.ts            ← PostgreSQL connection pool (pg.Pool)
│       │   ├── migrate.ts         ← Idempotent DDL migrations (ENUMs, tables, indexes)
│       │   ├── seed.ts            ← Demo data seeder (4 officers, 2 cases, documents, evidence)
│       │   ├── audit.ts           ← Serialized hash-chained audit event logger
│       │   ├── schema.sql         ← Reference SQL schema
│       │   └── store.ts           ← Legacy in-memory store (replaced by PostgreSQL)
│       ├── routes/
│       │   ├── auth.routes.ts     ← Login, refresh, logout, /me, brute-force lockout
│       │   ├── cases.routes.ts    ← CRUD for cases, case detail with stats
│       │   ├── documents.routes.ts← Upload, download, versioning, workflow transitions, verify, tamper-demo
│       │   ├── evidence.routes.ts ← Evidence registration, custody transfer, timeline
│       │   ├── share.routes.ts    ← Time-bounded document sharing & revocation
│       │   ├── blockchain.routes.ts ← Ledger registration, records query, live verification
│       │   ├── audit.routes.ts    ← Audit log queries & full chain verification
│       │   └── admin.routes.ts    ← User management, role changes, account unlock, master audit
│       ├── middlewares/
│       │   ├── auth.ts            ← JWT verification middleware (authenticateJWT)
│       │   └── errorHandler.ts    ← Centralized Express error handler
│       ├── services/
│       │   ├── crypto.service.ts  ← SHA-256 hashing utilities
│       │   └── storage.service.ts ← File system read/write/tamper operations
│       ├── types/                 ← TypeScript interfaces
│       └── utils/                 ← Response helpers (sendSuccess, sendError, sendPaginated)
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts             ← Dev server proxy to backend :5000
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx               ← React app mount point
│       ├── App.tsx                ← Root layout + React Router routes
│       ├── index.css              ← Base Tailwind imports + custom scrollbar styles
│       ├── types/index.ts         ← TypeScript interfaces matching backend responses
│       ├── services/
│       │   └── api.ts             ← Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.tsx     ← React Context for auth state & token management
│       ├── pages/
│       │   ├── LoginPage.tsx      ← Login form + 1-click persona demo buttons
│       │   ├── DashboardPage.tsx  ← Metrics cards + recent cases table
│       │   ├── CasesPage.tsx      ← Full case repository with search & filter
│       │   ├── CaseDetailPage.tsx ← Case inspection, documents, evidence, workflow actions
│       │   ├── SharedPage.tsx     ← Documents shared with current user
│       │   ├── AuditPage.tsx      ← Hash-chained audit log viewer + chain verification
│       │   └── AdminPage.tsx      ← User directory, role management, account unlock
│       └── components/
│           ├── Header.tsx         ← Top navigation bar with user info
│           ├── Sidebar.tsx        ← Left navigation with role-based menu items
│           ├── StatusBadge.tsx    ← Colored badges for status, classification, verification
│           ├── NewCaseModal.tsx   ← Create new case form
│           ├── DocumentUploadModal.tsx ← Upload document with SHA-256 fingerprinting
│           ├── EvidenceModal.tsx  ← Register physical/digital evidence
│           ├── EvidenceTimelineModal.tsx ← Chain of custody timeline + transfer form
│           ├── BlockchainLedgerModal.tsx ← Blockchain transaction explorer
│           ├── ShareModal.tsx     ← Time-bounded document sharing form
│           └── VerificationModal.tsx ← Cryptographic integrity verification + tamper demo
│
└── scripts/                       ← Utility scripts
```

---

## 🗄 Database Schema (PostgreSQL)

### Tables (13 total)

| # | Table | Purpose | Key Columns |
|---|---|---|---|
| 1 | `users` | Officer accounts | `id (UUID PK)`, `email`, `password_hash`, `role (ENUM)`, `department`, `failed_login_attempts`, `locked_until` |
| 2 | `cases` | Investigation case files | `id`, `fir_number`, `title`, `description`, `crime_type`, `status (ENUM)`, `classification (ENUM)`, `created_by → users` |
| 3 | `case_assignments` | Many-to-many: users ↔ cases | `case_id → cases`, `user_id → users`, UNIQUE constraint |
| 4 | `documents` | Logical document entries per case | `id`, `case_id → cases`, `name`, `type (ENUM)`, `classification`, `current_version_id → document_versions` |
| 5 | `document_versions` | Immutable version snapshots | `id`, `document_id → documents`, `version_no`, `hash (SHA-256, CHAR 64)`, `storage_key`, `file_size`, `status (ENUM)` |
| 6 | `approvals` | Approval / rejection decisions | `document_version_id → document_versions`, `reviewer_id → users`, `decision (ENUM)` |
| 7 | `signatures` | Digital signature records | `document_version_id → document_versions`, `signer_id → users`, `hash`, `reference` |
| 8 | `evidence` | Physical/digital evidence items | `id`, `case_id → cases`, `type`, `status (ENUM)`, `collected_by → users`, `collected_at` |
| 9 | `evidence_custody_events` | Chain-of-custody transfer log | `evidence_id → evidence`, `from_user_id`, `to_user_id`, `action`, `reason`, `hash (SHA-256)` |
| 10 | `audit_events` | Hash-chained audit trail | `actor_id → users`, `action`, `target_type`, `target_id`, `prev_event_hash`, `event_hash` |
| 11 | `shares` | Time-bounded document access grants | `document_version_id`, `recipient_id`, `can_view`, `can_download`, `expires_at`, `revoked_at` |
| 12 | `blockchain_records` | Permissioned ledger transactions | `ref_type`, `ref_id`, `action`, `hash`, `prev_hash`, `tx_reference` |
| 13 | `refresh_tokens` | JWT refresh token rotation | `user_id`, `token_hash`, `revoked_at`, `expires_at` |

### ENUMs (8 total)

| ENUM Type | Values |
|---|---|
| `user_role` | INVESTIGATOR, SENIOR_OFFICER, FORENSIC_OFFICER, ADMIN |
| `case_status` | OPEN, UNDER_INVESTIGATION, UNDER_REVIEW, CHARGESHEET_PREPARED, COURT_SUBMITTED, CLOSED, ARCHIVED |
| `classification_tier` | PUBLIC, INTERNAL, CONFIDENTIAL, HIGHLY_CONFIDENTIAL |
| `document_type` | FIR, COMPLAINT, WITNESS_STATEMENT, INVESTIGATION_REPORT, FORENSIC_REPORT, MEDICAL_REPORT, SEIZURE_MEMO, ARREST_MEMO, CHARGE_SHEET, COURT_FILING, COURT_ORDER, LEGAL_NOTICE, JUDGMENT, EVIDENCE, OTHER |
| `version_status` | DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED, APPROVED, SIGNED, LOCKED, ARCHIVED |
| `approval_decision` | APPROVED, REJECTED |
| `evidence_status` | REGISTERED, COLLECTED, UPLOADED, STORED, TRANSFERRED, RECEIVED, ANALYZED, REPORT_GENERATED, SUBMITTED, ARCHIVED |
| `audit_result` | SUCCESS, FAILURE |

### Database Indexes

- `idx_cases_fir` → Fast FIR number lookup
- `idx_documents_case` → Documents by case
- `idx_doc_versions_doc` → Versions by document
- `idx_audit_actor` → Audit events by actor
- `idx_audit_target` → Audit events by target entity
- `idx_evidence_case` → Evidence items by case
- `idx_refresh_tokens_hash` → Token lookup for rotation
- `idx_refresh_tokens_user` → Tokens per user for revocation

---

## 🔗 Backend API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/login` | Login with email/password. Returns JWT access + refresh tokens. Implements brute-force lockout (5 attempts / 15 min). | No |
| `POST` | `/auth/refresh` | Rotate refresh token. Old token is revoked. | No (cookie) |
| `POST` | `/auth/logout` | Revoke current refresh token. | Yes |
| `GET` | `/auth/me` | Get current user profile from JWT. | Yes |

### Cases (`/cases`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/cases` | List all cases (paginated, search by `?q=`, filter by `?status=`) |
| `POST` | `/cases` | Create a new case file (FIR number, title, classification) |
| `GET` | `/cases/:id` | Case detail with document count, evidence count, pending approvals, audit count, active shares |
| `PATCH` | `/cases/:id` | Update case status (workflow transitions) |

### Documents (`/cases/:caseId/documents`, `/documents`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/cases/:caseId/documents` | List documents for a case (paginated) |
| `POST` | `/cases/:caseId/documents` | Upload new document (multipart/form-data). Auto-generates SHA-256 hash. |
| `GET` | `/documents/:id` | Document detail with version history and blockchain reference |
| `GET` | `/documents/:id/download` | Download document binary (streams file from storage) |
| `POST` | `/documents/:id/new-version` | Upload a new version (increments version_no, new SHA-256 hash) |
| `POST` | `/documents/:id/workflow` | Transition workflow status: DRAFT → SUBMITTED → APPROVED → SIGNED → LOCKED |
| `POST` | `/documents/:id/verify` | Re-compute SHA-256 from live storage file and compare against registered hash |
| `POST` | `/documents/:id/tamper-demo` | Demo: Corrupt the physical file on disk to simulate out-of-band tampering |

### Evidence (`/cases/:caseId/evidence`, `/evidence`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/cases/:caseId/evidence` | List evidence items for a case |
| `POST` | `/cases/:caseId/evidence` | Register new evidence item (type, description, collection timestamp) |
| `GET` | `/evidence/:id` | Evidence detail with current custodian |
| `GET` | `/evidence/:id/custody` | Full custody event timeline (chain of custody) |
| `POST` | `/evidence/:id/transfer` | Transfer custody to another officer (creates hashed custody event) |

### Sharing (`/documents`, `/shares`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/:id/share` | Grant time-bounded access to another officer |
| `GET` | `/documents/shared-with-me` | List documents shared with the current user |
| `POST` | `/shares/:id/revoke` | Revoke an active share (only creator or admin) |

### Blockchain Ledger (`/blockchain`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/blockchain/register` | Manually anchor a document hash to the ledger |
| `GET` | `/blockchain/records/:documentId` | Fetch all ledger transactions for a document |
| `POST` | `/blockchain/verify/:documentId` | Verify live storage hash against ledger record |

### Audit Trail (`/audit`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/documents/:id/audit` | Audit events for a specific document |
| `GET` | `/cases/:id/audit` | Audit events for a case and its documents |
| `GET` | `/audit/verify-chain` | Full hash chain verification (recalculates all hashes from genesis) |

### Admin (`/admin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | List all user accounts |
| `POST` | `/admin/users` | Create a new user account |
| `PATCH` | `/admin/users/:id/role` | Change a user's role |
| `PATCH` | `/admin/users/:id/unlock` | Unlock a locked account (reset failed attempts) |
| `GET` | `/admin/audit` | Master audit log (all events, paginated) |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check (returns OK + persistence type) |

---

## 🖥 Frontend Pages & Components

### Pages (7)

| Page | Route | Description |
|---|---|---|
| **LoginPage** | `/login` | Email + password login with 4 **1-click persona demo buttons** (Investigator, Senior Officer, Forensic Officer, Admin). |
| **DashboardPage** | `/` | Overview metrics: Total Cases, Open Investigations, Total Documents, Pending Approvals. Recent cases table. |
| **CasesPage** | `/cases` | Full case repository table with live search (`?q=`) and status filter. Create new case button. |
| **CaseDetailPage** | `/cases/:id` | Detailed case view: stats cards, documents table (download, workflow actions, verify, share, view blockchain ledger), evidence table (view custody timeline, register new evidence). All modals launch from here. |
| **SharedPage** | `/shared` | Documents shared with the current user. Download and revoke actions. |
| **AuditPage** | `/audit` | Paginated audit event log. "Verify Hash Chain" button that checks the entire chain integrity. |
| **AdminPage** | `/admin` | User directory table: create users, change roles, unlock accounts. Master audit log tab. *(Only visible to ADMIN role)* |

### Components (10)

| Component | Purpose |
|---|---|
| `Header` | Top bar with SLIDMS branding, user name, role badge, logout button |
| `Sidebar` | Left navigation: Dashboard, Cases, Shared Documents, Audit Trail, Administration (admin only) |
| `StatusBadge` | Colored pill badges for document status, classification tier, and verification result |
| `NewCaseModal` | Form: FIR number, title, crime type, classification, description |
| `DocumentUploadModal` | Upload form: name, type, classification tier, file selector. SHA-256 fingerprinted on upload. |
| `EvidenceModal` | Register evidence: type/item name, collection details |
| `EvidenceTimelineModal` | Visual vertical timeline of custody events. Transfer form to hand evidence to another officer. |
| `BlockchainLedgerModal` | Lists all blockchain ledger transactions for a document. Shows block hash, prev hash, TX reference. Copy hash buttons. |
| `ShareModal` | Grant time-bounded access: recipient selector, view/download permissions, expiration period (1-30 days) |
| `VerificationModal` | Runs live SHA-256 re-computation against stored hash. Shows VERIFIED/TAMPERED status. Includes **"Demo Tamper Climax"** button to corrupt the file on disk and re-verify. |

---

## 🔄 Application Flow (End-to-End)

### 1. Authentication Flow

```
User enters credentials → POST /auth/login
  ├── Check email exists in users table
  ├── Check account not locked (failed_login_attempts < 5 OR locked_until expired)
  ├── Verify bcrypt password hash
  ├── Generate JWT access token (15min) + refresh token (7days)
  ├── Store refresh token hash in refresh_tokens table
  ├── Set refresh token in HTTP-only cookie
  ├── Log AUTHENTICATION audit event (hash-chained)
  └── Return { accessToken, user profile }

Token Refresh → POST /auth/refresh
  ├── Extract refresh token from cookie
  ├── Verify signature & check revocation in DB
  ├── Revoke old token, issue new pair
  └── Rotate cookie

Logout → POST /auth/logout
  ├── Revoke current refresh token in DB
  └── Clear cookie
```

### 2. Document Lifecycle Flow

```
                    ┌──────────┐
                    │  DRAFT   │ ← Document uploaded, SHA-256 computed
                    └────┬─────┘
                         │ POST /documents/:id/workflow {action: "submit"}
                    ┌────▼─────┐
                    │SUBMITTED │ ← Awaiting senior officer review
                    └────┬─────┘
                         │ POST /documents/:id/workflow {action: "approve"}
                    ┌────▼─────┐
                    │ APPROVED │ ← Verified by senior authority
                    └────┬─────┘
                         │ POST /documents/:id/workflow {action: "sign"}
                    ┌────▼─────┐
                    │  SIGNED  │ ← Digitally signed, blockchain-anchored
                    └────┬─────┘
                         │ POST /documents/:id/workflow {action: "lock"}
                    ┌────▼─────┐
                    │  LOCKED  │ ← Immutable. No further edits allowed.
                    └──────────┘

At each transition:
  → Audit event logged (hash-chained)
  → Blockchain ledger record created (hash-linked)
  → Document status updated in document_versions table
```

### 3. Evidence Chain of Custody Flow

```
Officer registers evidence → POST /cases/:caseId/evidence
  ├── Evidence created with status: REGISTERED
  ├── Initial custody event: action = "REGISTERED", to = collecting officer
  ├── Custody event hash = SHA-256(evidenceId + action + fromId + toId + timestamp)
  └── Audit event logged

Transfer custody → POST /evidence/:id/transfer
  ├── New custody event: action = "TRANSFERRED"
  ├── from = current custodian, to = recipient officer
  ├── New hash computed (includes previous custody state)
  └── Audit event logged
```

### 4. Document Verification Flow

```
User clicks "Verify Integrity" → POST /documents/:id/verify
  ├── Read storageKey from document_versions table
  ├── Stream file from storage disk
  ├── Re-compute SHA-256 hash of the live file bytes
  ├── Compare against registeredHash in DB
  │
  ├── MATCH → Status: VERIFIED ✅
  │   └── "File on disk matches the cryptographic fingerprint recorded at upload"
  │
  └── MISMATCH → Status: TAMPERED 🚨
      └── "File has been modified since registration. Possible data breach or corruption."
```

### 5. Blockchain Anchoring Flow

```
Document reaches a state milestone (SUBMITTED, APPROVED, SIGNED, LOCKED)
  ├── Fetch latest blockchain_records entry for this document
  ├── prevHash = last record's hash (or genesis: '0000...0000')
  ├── newHash = SHA-256(refType + refId + action + currentDocHash + prevHash + timestamp)
  ├── txReference = "TX-{6-digit-random}" (simulated transaction ID)
  ├── INSERT INTO blockchain_records (ref_type, ref_id, action, hash, prev_hash, tx_reference)
  └── Audit event logged
```

### 6. Audit Hash Chain Verification

```
GET /audit/verify-chain
  ├── Fetch ALL audit_events ordered by created_at ASC
  ├── Starting from genesis hash ('0000...0000'), for each event:
  │   ├── expectedHash = SHA-256(actorId + action + targetId + timestamp + prevEventHash)
  │   ├── Compare expectedHash with stored event_hash
  │   ├── If mismatch → chain broken at this event (tampering detected)
  │   └── Move to next event (prevHash = current event_hash)
  ├── If all hashes match → Chain is VALID ✅
  └── If any mismatch → Chain is BROKEN 🚨 (event details returned)
```

---

## 🔒 Security & Cryptographic Model

| Feature | Implementation |
|---|---|
| **Password Storage** | bcryptjs with salt rounds = 12 |
| **JWT Authentication** | Access token (15min) + Refresh token (7d, HTTP-only cookie) |
| **Token Rotation** | Refresh tokens stored as SHA-256 hashes in DB. Old tokens revoked on refresh. |
| **Brute-Force Protection** | 5 failed login attempts → account locked for 15 minutes |
| **Document Integrity** | Every file version hashed with SHA-256 at upload. Hash stored in `document_versions.hash`. |
| **Audit Chain Integrity** | Every audit event includes `prev_event_hash` → `event_hash`. Full chain verification via `/audit/verify-chain`. |
| **Custody Chain Integrity** | Evidence handover events include a SHA-256 hash binding evidence ID + actors + timestamp. |
| **Classification Tiers** | PUBLIC < INTERNAL < CONFIDENTIAL < HIGHLY_CONFIDENTIAL. Enforced at document & case level. |
| **Time-Bounded Sharing** | Share grants auto-expire. Can be revoked early by creator or admin. |
| **Role-Based Access** | 4 roles: INVESTIGATOR, SENIOR_OFFICER, FORENSIC_OFFICER, ADMIN. Admin panel restricted to ADMIN role. |

---

## ⛓ Blockchain Ledger Architecture

> **Type: Permissioned Cryptographic Hash-Chained Ledger (in PostgreSQL)**

This is **NOT** a decentralized multi-node blockchain (like Ethereum or Hyperledger). It is a **single-node, hash-chained, append-only ledger** stored in the `blockchain_records` PostgreSQL table. This approach is specified for government systems where:

- Full control over data sovereignty is required
- External consensus mechanisms are unnecessary (single trusted authority)
- The cryptographic hash chain provides the same tamper-evidence guarantees

### How It Works

```
Block 0 (Genesis):  prevHash = "0000...0000"
                    hash = SHA-256(refType + refId + action + docHash + prevHash + timestamp)
                    txRef = "TX-839201"

Block 1:            prevHash = Block 0's hash
                    hash = SHA-256(refType + refId + action + docHash + prevHash + timestamp)
                    txRef = "TX-742019"

Block N:            prevHash = Block (N-1)'s hash
                    hash = SHA-256(...)
                    txRef = "TX-XXXXXX"
```

**Tamper Detection**: If any block's data is modified, its hash changes, breaking the `prevHash` link of all subsequent blocks.

---

## ✅ Current Status & What's Done

### Backend — 100% MVP Complete ✅

- [x] PostgreSQL database with 13 tables, 8 ENUMs, 8 indexes
- [x] Idempotent schema migrations (`src/db/migrate.ts`)
- [x] Demo data seeder with 4 officers, 2 cases, documents, evidence (`src/db/seed.ts`)
- [x] JWT authentication with access + refresh token rotation
- [x] Brute-force account lockout (5 attempts / 15 min)
- [x] Full CRUD for cases (create, list, detail with stats, status update)
- [x] Document upload with SHA-256 fingerprinting
- [x] Document versioning (new versions maintain history)
- [x] Document workflow state machine (DRAFT → SUBMITTED → APPROVED → SIGNED → LOCKED)
- [x] Document download (file streaming from storage)
- [x] Cryptographic integrity verification (re-hash live file vs registered hash)
- [x] Tamper simulation demo endpoint
- [x] Evidence registration with chain of custody tracking
- [x] Evidence custody transfer with hashed events
- [x] Time-bounded document sharing with view/download permissions
- [x] Share revocation
- [x] Permissioned blockchain ledger (hash-chained records with TX references)
- [x] Blockchain verification endpoint
- [x] Hash-chained audit trail (Merkle-style, every event links to previous)
- [x] Full audit chain verification endpoint
- [x] Admin user management (create, role change, unlock)
- [x] Admin master audit log
- [x] Health check endpoint
- [x] Centralized error handler

### Frontend — 100% MVP Complete ✅

- [x] Login page with 1-click persona demo buttons
- [x] Auth context with JWT token management & auto-refresh
- [x] Dashboard with live metrics cards & recent cases table
- [x] Cases repository with search & status filter
- [x] Case detail page with documents table, evidence table, stats
- [x] Document upload modal with type & classification selection
- [x] Document download (direct file download from backend)
- [x] Document workflow transitions (Submit, Approve, Sign, Lock)
- [x] Cryptographic verification modal with VERIFIED/TAMPERED display
- [x] Tamper demo button ("Demo Tamper Climax")
- [x] Evidence registration modal
- [x] Evidence chain of custody timeline modal with transfer form
- [x] Blockchain ledger transaction explorer modal
- [x] Document sharing modal (recipient, permissions, expiry)
- [x] Shared documents page (shared-with-me) with revoke
- [x] Audit trail page with hash chain verification badge
- [x] Admin page (user directory, role management, account unlock, master audit)
- [x] Role-based sidebar navigation (Admin tab hidden for non-admin users)
- [x] Government-grade light color palette theme
- [x] Responsive layout with clean typography

---

## 🚧 What's Remaining / Next Steps

### High Priority (for SIH presentation)

- [ ] **End-to-end testing** — Walk through complete flows (login → create case → upload doc → verify → share → transfer evidence → audit)
- [ ] **Error handling UX** — Toast notifications instead of `alert()` for API errors
- [ ] **Loading skeletons** — Add skeleton loaders to pages during API fetch
- [ ] **Classification-based access control** — Enforce classification tier checks on backend (currently metadata-only)

### Medium Priority

- [ ] **Real MinIO/S3 integration** — Replace local filesystem storage with MinIO object storage
- [ ] **File preview** — Inline PDF/image preview in browser instead of download-only
- [ ] **Digital signature implementation** — Full PKI signature flow (currently records but doesn't perform cryptographic signing)
- [ ] **WebSocket real-time updates** — Live notifications for approvals, shares, and transfers
- [ ] **Dashboard charts** — Chart.js / Recharts for visual analytics
- [ ] **Multi-factor authentication (MFA)** — TOTP/OTP implementation (field exists in schema but not enforced)

### Lower Priority (Post-SIH)

- [ ] **Deployment** — Docker Compose setup for backend + PostgreSQL + MinIO
- [ ] **Rate limiting** — Express rate limiter middleware
- [ ] **Full-text search** — PostgreSQL `tsvector` for document content search
- [ ] **Notification system** — In-app + email notifications for workflow events
- [ ] **Mobile responsive** — Full mobile-optimized layout
- [ ] **Hyperledger Fabric integration** — Replace single-node ledger with multi-node permissioned blockchain

---

## 🚀 How to Run Locally

### Prerequisites

- **Node.js** 18+ installed
- **PostgreSQL** 15+ running on `localhost:5432`
- Database `slidms_db` created

### 1. Setup PostgreSQL

```sql
-- Connect to PostgreSQL and run:
CREATE DATABASE slidms_db;
```

### 2. Backend

```bash
cd backend
npm install

# Configure environment (edit .env if needed)
# Default: PostgreSQL on localhost:5432, user: postgres, password: postgres

npm run dev
# Server starts on http://localhost:5000
# Auto-runs migrations and seeds demo data on startup
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Vite dev server on http://localhost:5173
# Proxies API requests to backend :5000
```

### 4. Open Browser

Navigate to **http://localhost:5173** and use any demo account to log in.

---

## 👤 Demo Accounts

| Role | Name | Email | Password |
|---|---|---|---|
| **Investigator** | Inspector Vikram Singh | `investigator@police.gov.in` | `Password123!` |
| **Senior Officer** | ACP Rajeshwar Sharma | `senior@police.gov.in` | `Password123!` |
| **Forensic Officer** | Dr. Ananya Roy | `forensic@lab.gov.in` | `Password123!` |
| **System Admin** | Admin Desk Officer | `admin@slidms.gov.in` | `Password123!` |

> **Tip**: The Login page has **1-click persona demo buttons** — click any persona card to auto-fill credentials and log in instantly.

---

## 📊 Key Demo Scenarios for SIH Presentation

### Scenario 1: Document Integrity Verification (Tamper Detection Climax)

1. Login as **Investigator**
2. Open any case → Click a document → Click **"Verify Integrity"**
3. See **VERIFIED ✅** status (hashes match)
4. Click **"⚡ Demo Tamper Climax"** → File is corrupted on disk
5. Click **"Re-run Verification"** → See **TAMPERED 🚨** status (hashes mismatch)
6. *Proves the system detects even 1 byte of modification*

### Scenario 2: Full Document Lifecycle

1. Login as **Investigator** → Create new case → Upload document
2. Click **Submit** → Status becomes SUBMITTED
3. Login as **Senior Officer** → Click **Approve** → Status becomes APPROVED
4. Click **Sign** → Status becomes SIGNED (blockchain anchored)
5. Click **Lock** → Status becomes LOCKED (immutable, no further edits)
6. Open **Blockchain Ledger** → See all chained transactions

### Scenario 3: Evidence Chain of Custody

1. Login as **Investigator** → Open a case → Register evidence
2. Click **"View Custody Timeline"** → See initial registration event
3. Click **"Transfer Custody"** → Select forensic officer → Confirm handover
4. See new timeline node with from/to/reason and SHA-256 hash

### Scenario 4: Audit Trail Integrity

1. Login as any user → Navigate to **Audit Trail** page
2. Click **"Verify Hash Chain"** → See **VALID ✅** banner
3. *Each event's hash depends on the previous — deletion/reordering is detectable*

---

*Last updated: August 29, 2026*
