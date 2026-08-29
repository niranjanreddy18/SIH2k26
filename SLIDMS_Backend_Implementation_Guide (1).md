# SLIDMS — Backend Implementation Guide
## Stage-by-stage build plan, derived from `SLIDMS_Backend_Team_Spec.md`

This document turns the backend spec's Part B (domain rules), Part C (API contract), and §46 (build order) into an actionable, stage-by-stage engineering plan. Each stage is independently demoable via curl/Postman against the API contract — no frontend required.

**How to use this doc:** work top to bottom. Do not start a stage until the previous stage's "Definition of Done" checklist is fully green. Each stage lists: goal, entities touched, endpoints built, concrete tasks, and acceptance tests.

---

## 0. Suggested Stack (swap freely — spec is stack-agnostic)

```text
Language/runtime : Node.js 20 + TypeScript
Framework        : Express (or NestJS if the team prefers structure-by-default)
Database         : PostgreSQL 15+
ORM              : Prisma
File storage     : MinIO (S3-compatible), SSE-S3 encryption at rest
Auth             : JWT (access) + rotating refresh tokens, bcrypt/argon2id
Validation       : zod (or class-validator if using NestJS)
Testing          : Jest + Supertest
Blockchain layer : Local hash-chain service (§26) — Fabric/Besu only as stretch goal
Process/env      : dotenv, docker-compose (Postgres + MinIO + API)
```

### Repo skeleton

```text
slidms-backend/
├── src/
│   ├── config/            # env loading, constants
│   ├── db/                # prisma schema, migrations, seed script
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── cases/
│   │   ├── documents/
│   │   ├── versions/
│   │   ├── workflow/       # submit/approve/reject/sign/lock
│   │   ├── audit/
│   │   ├── blockchain/
│   │   ├── evidence/
│   │   └── sharing/
│   ├── middleware/         # auth, rbac, error-handler, audit-logger
│   ├── lib/                # hashing, storage client, ntp-time, pagination
│   └── app.ts / server.ts
├── docker-compose.yml
├── .env.example
└── tests/
```

### `.env.example` (create in Stage 1)

```text
DATABASE_URL=postgresql://slidms:slidms@localhost:5432/slidms
JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme2
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=slidms-documents
NTP_SERVER=pool.ntp.org
MAX_UPLOAD_MB=100
```

---

## STAGE 1 — Project Foundation

**Goal:** a running, empty service with DB + object storage wired up, so every later stage is additive.

**Spec refs:** §53 (technical structure), §57.

**Entities touched:** none yet (just the migration tool + connection).

### Tasks
1. `npm init`, TypeScript config, ESLint/Prettier, `docker-compose.yml` with `postgres` + `minio` services.
2. Prisma init; confirm `prisma migrate dev` connects to Postgres.
3. MinIO client wrapper (`lib/storage.ts`) — `putObject`, `getObject`, `deleteObject`, bucket-exists check on boot; enable SSE-S3 per §42 Data Protection.
4. Base Express app: JSON body parser, request-id middleware, centralized error-handler middleware returning a **consistent error shape** the frontend can branch on:
   ```json
   { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
   ```
5. Health check: `GET /health` → `{ status: "ok", db: "ok", storage: "ok" }`.
6. NTP time helper (`lib/serverTime.ts`) — all timestamps in the system (audit, custody) come from here, never `req` or client payloads (§21, §30).
7. Pagination helper (`lib/pagination.ts`) implementing the `?page=&limit=` contract (default 50, cap 200) used by every list endpoint from Stage 3 onward.

### Definition of Done
- [ ] `docker-compose up` brings up Postgres + MinIO; API boots against both.
- [ ] `GET /health` returns 200 with all three sub-checks green.
- [ ] Error middleware returns the standard `{ error: {...} }` shape for a deliberately thrown error.
- [ ] `.env.example` committed; no secrets in source.

---

## STAGE 2 — Authentication

**Goal:** login/logout/me working, with the token model the rest of the system depends on.

**Spec refs:** §42 Security Requirements, §44 Database Concept.

**Entities:** `User`, `RefreshToken`.

### Schema

```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String
  role          Role
  department    String?
  createdAt     DateTime @default(now())
}

enum Role {
  INVESTIGATOR
  SENIOR_OFFICER
  FORENSIC_OFFICER
  ADMIN
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String
  issuedAt   DateTime  @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?
  replacedBy String?
}
```

### Endpoints (Part C contract)

```text
POST /auth/login    { username, password } → { accessToken, refreshToken, user }
POST /auth/logout   revokes the presented refresh token
GET  /auth/me       returns current user from access token
```

### Tasks
1. Password hashing: bcrypt cost 12 (or argon2id) — decide once, document it, never log plaintext (§42).
2. Access token: JWT, 15 min TTL, payload = `{ userId, role, sessionId }`. `sessionId` is the field every future audit event uses as "actor" — get this right now.
3. Refresh token: opaque random string, **hashed** before storing in `RefreshToken.tokenHash` (never store raw), 7-day TTL, rotated on every use (issue new, revoke old, set `replacedBy`).
4. `auth` middleware: verifies access token, attaches `req.user = { userId, role, sessionId }`.
5. `requireRole(...)` middleware for coarse checks; **for APPROVE/SIGN/ADMINISTER actions specifically, re-fetch the user's role from the DB** rather than trusting the token claim alone (§42).
6. Login lockout: track failed attempts per username (in-memory or DB), exponential backoff / lock after 5 failures (§42 — this is the first thing judges test).
7. MFA hook point: a no-op `mfaRequired` flag on the login flow, so TOTP can be dropped in later without restructuring.
8. Seed script stub: create the 4 demo users from §48 (Officer 1024, Senior Officer 2051, Forensic Officer 52, Admin 001) with known passwords for local testing.

### Acceptance tests
```bash
curl -X POST /auth/login -d '{"username":"officer1024","password":"..."}'
# → 200, accessToken + refreshToken
curl /auth/me -H "Authorization: Bearer <token>"
# → 200, user profile
curl /auth/me -H "Authorization: Bearer garbage"
# → 401
# 6 failed logins in a row → 429 / locked response
```

### Definition of Done
- [ ] Login, logout, me all work against seeded users.
- [ ] Refresh rotation verified: reusing an old refresh token fails.
- [ ] Lockout triggers after 5 failed attempts.
- [ ] No password ever appears in logs or responses.

---

## STAGE 3 — Case Management

**Goal:** cases can be created, listed (paginated/filterable), fetched, and updated; status changes are gated and will later feed the audit log.

**Spec refs:** §6, §7.

**Entities:** `Case`.

### Schema

```prisma
model Case {
  id                    String   @id @default(uuid())
  caseNumber            String   @unique   // e.g. CASE-2026-1042
  firNumber             String
  title                 String
  description           String?
  crimeType             String
  applicableSections    String[]
  policeStation         String
  investigatingOfficerId String
  status                CaseStatus @default(OPEN)
  classification        Classification @default(INTERNAL)
  retentionPolicy       String?   // DPDP Act placeholder, §42
  legalHold             Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum CaseStatus {
  OPEN
  UNDER_INVESTIGATION
  UNDER_REVIEW
  CHARGESHEET_PREPARED
  COURT_SUBMITTED
  CLOSED
  ARCHIVED
}

enum Classification {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  HIGHLY_CONFIDENTIAL
}
```

### Endpoints

```text
POST  /cases                                    create
GET   /cases?page=&limit=&status=&sort=          list
GET   /cases/:id                                 detail
PATCH /cases/:id                                 update (incl. status change)
```

### Tasks
1. Create/update validated with zod; `caseNumber` auto-generated (`CASE-<year>-<seq>`) or accepted from input — decide and document.
2. Status transitions: only `SENIOR_OFFICER`/`ADMIN` (or the assigned investigator, per your role table) may change `status`; invalid transitions rejected (e.g. can't go `CLOSED → OPEN` without explicit reopen logic).
3. Every status change must be **audit-loggable** — wire the actual audit write in Stage 6, but leave a clear hook/event emission point now (e.g. `emitDomainEvent('CASE_UPDATED', ...)`) so Stage 6 doesn't require touching this module again.
4. Case-level assignment: `investigatingOfficerId` used later for the Role × Case-Assignment access checks (§32).
5. List endpoint: filter by `status`, sortable, paginated per the shared pagination helper.

### Acceptance tests
```bash
curl -X POST /cases -d '{...}' -H "Authorization: Bearer <investigator token>"
curl "/cases?page=1&limit=20&status=OPEN"
curl /cases/<id>
curl -X PATCH /cases/<id> -d '{"status":"UNDER_REVIEW"}'
```

### Definition of Done
- [ ] CRUD works; pagination + status filter verified.
- [ ] Unauthorized role attempting a status change → 403.
- [ ] Domain-event hook fires (visible in logs) on create/update, ready for Stage 6 to consume.

---

## STAGE 4 — Document Management

**Goal:** documents can be uploaded (with real file storage), listed, fetched, downloaded, with full metadata — no hashing/versioning/workflow logic yet, just the object itself.

**Spec refs:** §8/§9 (doc types), §10 (metadata), §11 (upload flow), §12 (storage).

**Entities:** `Document` (version 1 fields folded in for now; full `DocumentVersion` split happens in Stage 5).

### Schema (initial cut — extended in Stage 5)

```prisma
model Document {
  id               String   @id @default(uuid())
  caseId           String
  name             String
  documentType     DocumentType
  status           DocumentStatus @default(DRAFT)
  classification   Classification @default(INTERNAL)
  currentVersion   Int      @default(1)
  createdById      String
  createdAt        DateTime @default(now())
  updatedById      String?
  updatedAt        DateTime @updatedAt
  fileSize         Int
  mimeType         String
  storageKey       String   // path/key in MinIO
}

enum DocumentType {
  FIR
  COMPLAINT
  WITNESS_STATEMENT
  INVESTIGATION_REPORT
  FORENSIC_REPORT
  MEDICAL_REPORT
  SEIZURE_MEMO
  ARREST_MEMO
  CHARGE_SHEET
  COURT_FILING
  COURT_ORDER
  LEGAL_NOTICE
  JUDGMENT
  EVIDENCE
  OTHER
}

enum DocumentStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  REJECTED
  APPROVED
  SIGNED
  LOCKED
  ARCHIVED
}
```

### Endpoints

```text
POST /cases/:caseId/documents                              upload
GET  /cases/:caseId/documents?page=&limit=&type=&status=&sort=
GET  /documents/:id
GET  /documents/:id/download
```

### Tasks
1. Multipart upload handling (e.g. `multer` with memory/disk buffer, streamed to MinIO — don't buffer huge files fully in memory beyond the configured limit).
2. Validate: allowed MIME/extension list (PDF, DOC/DOCX, JPG/PNG, TXT, MP4, MP3, ZIP where required, §8), max size from `MAX_UPLOAD_MB`.
3. Malware scan hook point (stub/no-op is fine for MVP, but call it out explicitly as a TODO with a named function so it's obviously not silently skipped).
4. Path-traversal protection: never use client-supplied filename directly as storage key — generate a UUID-based key, store the original filename separately as metadata.
5. Upload rate limiting: per-user cap on uploads/minute and max concurrent uploads (§42).
6. Store object in MinIO under `caseId/documentId/v1/<uuid>-<original name>`.
7. Download endpoint streams from MinIO with correct `Content-Type`/`Content-Disposition`; enforce the same auth/classification checks as view (Stage 8's access-control layer formalizes this — for now, at minimum require case-assignment).

### Acceptance tests
```bash
curl -X POST /cases/<id>/documents -F "file=@Witness_Statement.pdf" -F "documentType=WITNESS_STATEMENT"
curl "/cases/<id>/documents?page=1&type=WITNESS_STATEMENT"
curl /documents/<id>/download -o out.pdf   # bytes match original
```

### Definition of Done
- [ ] Upload stores file in MinIO and metadata row in Postgres.
- [ ] Oversized/disallowed-type upload rejected with a clear error.
- [ ] Download returns byte-identical content.
- [ ] Path traversal attempt (`../../etc/passwd` as filename) cannot escape the storage prefix.

---

## STAGE 5 — Hashing + Versioning

**Goal:** every upload and every new version gets a SHA-256 fingerprint; verification and version history work end-to-end. This is the spec's core value proposition — get it exactly right.

**Spec refs:** §13, §14, §15, §16, §17.

**Entities:** split into `Document` (parent) + `DocumentVersion` (per-version).

### Schema change

```prisma
model DocumentVersion {
  id            String   @id @default(uuid())
  documentId    String
  versionNumber Int
  storageKey    String
  fileSize      Int
  mimeType      String
  sha256        String
  status        DocumentStatus @default(DRAFT)
  createdById   String
  createdAt     DateTime @default(now())
  comment       String?
  blockchainRef String?  // set in Stage 8

  @@unique([documentId, versionNumber])
}
```
`Document.currentVersion` now points at the latest `DocumentVersion.versionNumber`; `Document.status` mirrors the current version's status for quick filtering.

### Endpoints

```text
POST /documents/:id/versions      create new version (multipart upload)
POST /documents/:id/verify        recompute hash, compare to registered
GET  /documents/:id/versions      version history (implicit in contract via GET /documents/:id detail, or add explicitly)
```

### Tasks
1. `lib/hashing.ts`: `sha256(buffer): string`, computed **server-side** on the exact bytes received, before/independent of any storage encoding.
2. On upload (Stage 4 endpoint) and on every `POST /documents/:id/versions`: compute SHA-256, store on the `DocumentVersion` row.
3. **Editing rule (§17):** if the current version's status is `SIGNED`/`LOCKED`, `POST /documents/:id/versions` is the *only* way to change content — direct edit/overwrite endpoints must not exist. New version starts at `DRAFT`.
4. `POST /documents/:id/verify`:
   - fetch the specified (or current) version's stored `sha256`,
   - re-fetch the object bytes from MinIO, recompute SHA-256,
   - compare; return:
     ```json
     { "registeredHash": "...", "currentHash": "...", "match": true, "blockchainRef": "..." }
     ```
   - This is the endpoint the "Killer Demo" (§49 Step 15) hits — if someone mutates the object directly in storage, this must catch it.
5. Version list endpoint returns all versions with hash, status, createdBy, createdAt, comment — this is what powers the "Version 1 / Version 2" UI in §49 Step 5.

### Acceptance tests
```bash
curl -X POST /documents/<id>/versions -F "file=@v2.pdf" -F "comment=corrected typo"
curl -X POST /documents/<id>/verify
# → match: true
# Manually overwrite the object in MinIO, then:
curl -X POST /documents/<id>/verify
# → match: false, 🚨 tampering detected
```

### Definition of Done
- [ ] SHA-256 generated and stored on upload and on every new version.
- [ ] Verify endpoint correctly detects both match and mismatch.
- [ ] Attempting to create a new version on a locked doc succeeds (new version); attempting to directly mutate a locked version's content has no code path at all.
- [ ] Version history returns all versions in order with hashes.

---

## STAGE 6 — Audit Trail

**Goal:** every important action produces a tamper-evident, append-only audit record; read-only audit endpoints exist per document and per case.

**Spec refs:** §21, §21.1 (hash-chain), §22.

**Entities:** `AuditEvent`.

### Schema

```prisma
model AuditEvent {
  id           String   @id @default(uuid())
  actorId      String
  action       AuditAction
  targetType   String     // "Document" | "Case" | "Evidence" | ...
  targetId     String
  timestamp    DateTime   // from serverTime.ts (NTP-synced), never client input
  result       String     // SUCCESS | FAILURE
  metadata     Json?
  hash         String
  previousHash String?
}

enum AuditAction {
  LOGIN
  LOGOUT
  CASE_CREATED
  CASE_UPDATED
  DOCUMENT_UPLOADED
  DOCUMENT_VIEWED
  DOCUMENT_DOWNLOADED
  DOCUMENT_MODIFIED
  VERSION_CREATED
  DOCUMENT_SUBMITTED
  DOCUMENT_APPROVED
  DOCUMENT_REJECTED
  DOCUMENT_SIGNED
  DOCUMENT_LOCKED
  DOCUMENT_SHARED
  DOCUMENT_ACCESSED
  DOCUMENT_VERIFIED
  EVIDENCE_REGISTERED
  EVIDENCE_TRANSFERRED
  ACCESS_GRANTED
  ACCESS_REVOKED
}
```

### Endpoints

```text
GET /documents/:id/audit?page=&limit=&action=&from=&to=
GET /cases/:id/audit?page=&limit=&action=&from=&to=
```

### Tasks
1. `lib/auditChain.ts` — `appendAuditEvent(...)`:
   - fetch the current chain head (`previousHash`),
   - compute `hash = SHA256(eventId + actor + action + target + timestamp + previousHash)` exactly as §21.1 specifies,
   - insert atomically (DB transaction, or a single-writer queue, to avoid race conditions on `previousHash` under concurrent writes — this is the most likely bug in this stage).
2. **Wire this into every relevant module** built so far: login/logout (Stage 2), case create/update (Stage 3), document upload/view/download/version (Stages 4–5). Use the domain-event hooks left in earlier stages rather than scattering raw `appendAuditEvent` calls everywhere.
3. Audit endpoints are strictly read-only — no PUT/PATCH/DELETE exists on this resource at all (§22), enforced by simply not routing those verbs, not by permission checks alone.
4. Chain-verification utility (`verifyChainIntegrity(fromId?)`) that recomputes hashes and flags the first broken link — expose this as an internal/admin diagnostic (e.g. `GET /admin/audit/verify`) so it's demoable directly (spec §22 "Layer 1" claim).
5. Filtering: `action`, `from`/`to` date range, paginated.

### Acceptance tests
```bash
curl /documents/<id>/audit?page=1&limit=20
curl /cases/<id>/audit?action=DOCUMENT_UPLOADED
# Directly edit one row's `action` in the DB, then:
curl /admin/audit/verify
# → chain broken at <eventId>
```

### Definition of Done
- [ ] Every action in the §21 minimum-events list produces exactly one audit row.
- [ ] Hash-chain verified correct on a clean run.
- [ ] A manually tampered row is detected by the verify utility.
- [ ] No mutation endpoint exists on `AuditEvent`.

---

## STAGE 7 — Approval + Signing Workflow

**Goal:** the DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → SIGNED → LOCKED state machine is enforced server-side, with editing rules and role separation.

**Spec refs:** §18, §19, §20, §5 (role permissions — "cannot approve own document").

**Entities:** `Approval`, `Signature` (or fold into `DocumentVersion` — a dedicated table is cleaner for audit/demo purposes).

### Schema

```prisma
model Approval {
  id             String   @id @default(uuid())
  documentVersionId String
  reviewerId     String
  decision       ApprovalDecision   // APPROVED | REJECTED
  comment        String?
  decidedAt      DateTime
}

enum ApprovalDecision { APPROVED REJECTED }

model Signature {
  id                String   @id @default(uuid())
  documentVersionId String
  signerId          String
  role              String
  documentHash      String   // hash at time of signing — must match verify later
  status            String   // SIGNED
  signatureRef       String   // opaque reference/token for the MVP signing record
  signedAt           DateTime
}
```

### Endpoints

```text
POST /documents/:id/submit
POST /documents/:id/approve
POST /documents/:id/reject
POST /documents/:id/sign
POST /documents/:id/lock
```

### Tasks
1. State machine guard (`lib/documentStateMachine.ts`): explicit table of allowed transitions per §20; any request to move a version outside its allowed transitions → 409 with a clear error code (`INVALID_STATE_TRANSITION`).
2. `submit`: `DRAFT/REJECTED → SUBMITTED`; only the version's creator (or any INVESTIGATOR on the case) may submit.
3. `approve`/`reject`: `SUBMITTED/UNDER_REVIEW → APPROVED/REJECTED`; only `SENIOR_OFFICER`/`ADMIN`, **and enforce separation of duties** — the reviewer cannot be the same user as `createdById` on the version (§5, "cannot approve own document").
4. `sign`: `APPROVED → SIGNED`; creates a `Signature` row with `documentHash` = the version's current SHA-256 (from Stage 5) at signing time — this is what later verification cross-checks.
5. `lock`: `SIGNED → LOCKED`; after this, the version becomes fully immutable — the *only* remaining write path for that document is a brand-new version (Stage 5 rule).
6. Every transition emits the corresponding audit action from Stage 6's enum (`DOCUMENT_SUBMITTED`, `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`, `DOCUMENT_SIGNED`, `DOCUMENT_LOCKED`).
7. Re-validate role server-side on `approve`/`sign` per Stage 2's rule — never trust the JWT role claim alone for these.

### Acceptance tests
```bash
curl -X POST /documents/<id>/submit                          # investigator
curl -X POST /documents/<id>/approve -H "Authorization: <senior officer>"
curl -X POST /documents/<id>/approve -H "Authorization: <same investigator>"  # → 403, self-approval blocked
curl -X POST /documents/<id>/sign
curl -X POST /documents/<id>/lock
curl -X POST /documents/<id>/versions -F "file=@edit.pdf"      # → succeeds, new version DRAFT
curl -X PATCH /documents/<id>                                  # → no such endpoint / 405 on locked content
```

### Definition of Done
- [ ] Full DRAFT→SUBMITTED→APPROVED→SIGNED→LOCKED path works.
- [ ] Self-approval rejected.
- [ ] Invalid transitions (e.g. sign a DRAFT) rejected with 409.
- [ ] Locked version content cannot be altered by any endpoint; only new-version creation works.
- [ ] All five transitions produce audit events.

---

## STAGE 8 — Blockchain (Provenance Layer)

**Goal:** the §25 event subset gets anchored to an independent, hash-linked ledger separate from the main audit table; verification cross-checks it.

**Spec refs:** §23–§27, §26 (recommended local hash-chain over full Fabric network).

**Entities:** `BlockchainRecord`.

### Schema

```prisma
model BlockchainRecord {
  id            String   @id @default(uuid())
  documentId    String
  versionId     String
  caseId        String
  action        String   // DOCUMENT_CREATED | APPROVED | SIGNED | LOCKED | TRANSFERRED | ARCHIVED
  documentHash  String
  actorId       String
  timestamp     DateTime
  previousRef   String?
  selfHash      String
  txRef         String   @unique   // e.g. "TX-839201"
}
```

### Endpoints

```text
POST /blockchain/register           internal-triggered, but exposed per contract
GET  /blockchain/records/:documentId
POST /blockchain/verify/:documentId
```

### Tasks
1. `lib/ledger.ts`: same hash-chain construction as §21.1, but on its own independent chain/table (`BlockchainRecord`), separate storage from `AuditEvent` — this is what makes the "even if the DB is compromised" claim in §22 true. Recommended default: local hash-chain (**not** multi-org Fabric) per §26; single-node Fabric/Besu only if the SIH theme requires a literal "blockchain" checkbox.
2. Wire `register` calls into Stage 7's workflow at exactly the §25 event subset: `DOCUMENT_CREATED` (first version upload), `DOCUMENT_APPROVED`, `DOCUMENT_SIGNED`, `DOCUMENT_LOCKED`, plus `DOCUMENT_TRANSFERRED`/`DOCUMENT_ARCHIVED` once Stage 9/case-archival exist. Only these events touch the ledger — everything else stays Layer 1 (audit hash-chain only), per §22's scoped claim.
3. Never write file content or PII to `BlockchainRecord` — only ids, hash, action, actor ref, timestamps (§24).
4. `GET /blockchain/records/:documentId` returns the full chain of ledger entries for that document (what powers §49 Step 10's "Transaction: TX-839201" display).
5. `POST /blockchain/verify/:documentId`: recompute the current document hash (reuse Stage 5's verify logic), compare against the latest `BlockchainRecord.documentHash`, and separately confirm the ledger's own self-hash chain is unbroken.
6. Store `Document.blockchainRef`/`DocumentVersion.blockchainRef` = latest `txRef`, so it surfaces directly on document detail responses.

### Acceptance tests
```bash
curl -X POST /documents/<id>/sign        # triggers blockchain.register internally
curl /blockchain/records/<id>            # → chain incl. TX-839201
curl -X POST /blockchain/verify/<id>     # → { match: true, chainIntact: true }
```

### Definition of Done
- [ ] The §25 event subset (and only that subset) creates `BlockchainRecord` rows.
- [ ] Ledger chain integrity independently verifiable, separate code path from Stage 6's audit chain.
- [ ] Blockchain verify cross-checks both document hash and ledger chain integrity.
- [ ] No sensitive content ever stored in `BlockchainRecord`.

---

## STAGE 9 — Evidence + Chain of Custody

**Goal:** evidence items (distinct from ordinary documents) can be registered and transferred, with a full custody trail.

**Spec refs:** §28, §29, §30.

**Entities:** `Evidence`, `EvidenceCustodyEvent`.

### Schema

```prisma
model Evidence {
  id           String   @id @default(uuid())
  caseId       String
  evidenceCode String   @unique   // EV-1002
  type         String
  description  String?
  status       EvidenceStatus @default(REGISTERED)
  collectedById String
  collectedAt  DateTime
  currentHolderId String
  storageKey   String?
  sha256       String?
}

enum EvidenceStatus {
  REGISTERED COLLECTED UPLOADED STORED TRANSFERRED
  RECEIVED ANALYZED REPORT_GENERATED SUBMITTED ARCHIVED
}

model EvidenceCustodyEvent {
  id          String   @id @default(uuid())
  evidenceId  String
  fromUserId  String?
  toUserId    String
  actorId     String
  action      String   // COLLECTED | UPLOADED | TRANSFERRED | RECEIVED | ANALYZED | ...
  reason      String?
  hashRef     String?
  timestamp   DateTime  // NTP-synced, §30
}
```

### Endpoints

```text
POST /cases/:caseId/evidence
GET  /cases/:caseId/evidence
GET  /evidence/:id
POST /evidence/:id/transfer
GET  /evidence/:id/custody
```

### Tasks
1. Registration: `Investigator`/`Forensic Officer` create an `Evidence` row + an initial `EvidenceCustodyEvent` (`COLLECTED`), reusing Stage 4's upload pipeline for any attached file (CCTV video, device image), plus Stage 5's SHA-256 on that file.
2. `transfer`: creates a new `EvidenceCustodyEvent` (`TRANSFERRED` then, on the receiving side, `RECEIVED`), updates `currentHolderId`, and requires the receiving officer to be a valid case-assigned user.
3. `GET /evidence/:id/custody` returns the ordered custody timeline — this is exactly the §49 Step 13 "Evidence Chain of Custody" screen.
4. Every custody event is also an audit event (Stage 6: `EVIDENCE_REGISTERED`, `EVIDENCE_TRANSFERRED`) and, for register/transfer specifically, also worth considering for the blockchain subset (Stage 8) since evidence provenance is evidentiarily important — flag this as a judgment call for the team, not mandatory.
5. Evidence status transitions follow the §29 lifecycle; enforce order (can't `ANALYZE` before `RECEIVED`, etc.) with the same state-machine pattern as Stage 7.

### Acceptance tests
```bash
curl -X POST /cases/<id>/evidence -F "file=@cctv.mp4" -F "type=CCTV Video"
curl -X POST /evidence/<id>/transfer -d '{"toUserId":"forensic-officer-52","reason":"forensic analysis"}'
curl /evidence/<id>/custody
# → ordered list: COLLECTED → UPLOADED → TRANSFERRED → RECEIVED
```

### Definition of Done
- [ ] Evidence registration + transfer work; custody timeline is complete and ordered.
- [ ] Every custody event has a timestamp from the NTP-synced server clock.
- [ ] Both register and transfer produce audit events.

---

## STAGE 9.5 — Secure Sharing *(spec-listed under Tier 2, sequence here for API-contract completeness)*

**Spec refs:** §32.1, §33, §34.

**Entities:** `Share`.

```prisma
model Share {
  id            String   @id @default(uuid())
  documentId    String
  recipientId   String
  permissions   String[]   // VIEW, DOWNLOAD
  expiresAt     DateTime?
  revokedAt     DateTime?
  watermark     Boolean  @default(false)
  createdById   String
  createdAt     DateTime @default(now())
}
```

### Endpoints
```text
POST /documents/:id/share
GET  /documents/shared-with-me
POST /shares/:id/revoke
```

### Tasks
1. Effective-permission check (`lib/authz.ts`) implements exactly the §32.1 formula: `BASE GRANT OR SHARE GRANT`, never widening role, never crossing case boundaries — this is the single function every document-access endpoint (view/download from Stage 4, verify from Stage 5) should route through.
2. Share creation checks the classification/role matrix (§32.2) — e.g. a `HIGHLY_CONFIDENTIAL` document may not be shareable at all depending on the sharer's role.
3. Expired or revoked shares fail with 403/`SHARE_EXPIRED` — checked at request time, not just at creation.
4. `DOCUMENT_SHARED` audit event on creation; `ACCESS_REVOKED` on revoke.
5. `shared-with-me` lists all non-expired, non-revoked shares for `req.user`.

### Acceptance tests
```bash
curl -X POST /documents/<id>/share -d '{"recipientId":"forensic-52","permissions":["VIEW","DOWNLOAD"],"expiresAt":"..."}'
curl /documents/shared-with-me -H "Authorization: <forensic officer>"
curl -X POST /shares/<id>/revoke
curl /documents/<id>/download -H "Authorization: <forensic officer>"   # after revoke → 403
```

### Definition of Done
- [ ] Share grants access without widening role or crossing cases.
- [ ] Expired/revoked shares correctly denied.
- [ ] All document-access endpoints route through the single `authz` check, not ad hoc logic.

---

## STAGE 10 — AI/OCR *(optional, only after Stages 1–9.5 are solid)*

**Spec refs:** §36–§40 (secondary features).

Pick **one or two**, not all:

| Feature | Minimal implementation |
|---|---|
| OCR | Tesseract on scanned PDFs → store extracted text alongside the document (never replacing the original file), make it searchable |
| AI classification | Simple heuristic or a small classifier suggesting `documentType`; user must confirm before it becomes authoritative (§37) |
| Metadata extraction | Regex/NER pass suggesting FIR number/date/names; again, confirm-before-authoritative (§38) |

### Tasks
1. Run as an **async job** (queue or simple background task), not inline in the upload request — keeps upload latency predictable.
2. Store AI output separately (`suggestedType`, `confidence`, `extractedFields`) — never overwrite user-entered metadata directly.
3. Explicit `[Confirm] [Change]` endpoint pair so nothing becomes authoritative without a human action, per the spec's "AI does not make legal decisions" principle (§52 Principle 4).

### Definition of Done
- [ ] Chosen feature(s) run without blocking the core upload path.
- [ ] Nothing AI-derived is treated as ground truth until a user confirms it.

---

## STAGE 11 — Security Hardening

**Goal:** attack your own API before a judge/reviewer does.

**Spec refs:** §41–§45.

### Attack checklist — every item below must be verified rejected, server-side, no exceptions

```text
[ ] Access protected endpoint with no token             → 401
[ ] Access with expired/tampered JWT                    → 401
[ ] Access another case's documents (not assigned)      → 403
[ ] Investigator attempts to approve own submission      → 403
[ ] Investigator attempts to edit a LOCKED version       → 405 / no such path
[ ] Direct PATCH/DELETE on /audit or /audit/:id          → 404/405 (route doesn't exist)
[ ] Reuse a rotated/revoked refresh token                → 401
[ ] Use an expired Share to download a document          → 403
[ ] Use a revoked Share                                  → 403
[ ] Path traversal in upload filename                    → sanitized, cannot escape storage prefix
[ ] Oversized file upload                                → 413/rejected before full read
[ ] Disallowed MIME/extension upload                     → 400
[ ] Brute-force login (6th attempt)                      → locked/backoff
[ ] Privilege escalation via role claim tampering in JWT → server-side re-check catches it (Stage 2/7 rule)
[ ] SQL/NoSQL injection via search or filter params      → parameterized queries only (ORM default) — verify no raw string concatenation exists
[ ] Admin attempts to silently alter audit history        → no mutation endpoint exists; chain-verify would catch a DB-level edit anyway
```

### Tasks
1. Run through the checklist above as actual test cases (add them to the automated test suite, not just manual curl).
2. Re-confirm rate limiting is active on login and upload.
3. Confirm HTTPS/TLS termination is documented for deployment (even if local dev is HTTP).
4. Confirm no secrets in source control (grep for accidentally committed `.env`).
5. Run `verifyChainIntegrity` (Stage 6) and `blockchain/verify` (Stage 8) against the seeded demo data as a final sanity pass.

### Definition of Done
- [ ] Every row in the attack checklist has an automated test, and it passes (i.e., the attack is blocked).
- [ ] Security section of the demo pitch (§42 SSE-S3 encryption line, §21.1/§22 layered tamper-evidence claim) matches what's actually implemented — don't claim more than the code does.

---

## STAGE 12 — Final Integration

**Goal:** stability, consistent error responses, seeded demo data, backup/deploy readiness.

**Spec refs:** §48–§50.

### Tasks
1. **Demo data seed script** (idempotent — safe to re-run): the exact §48 dataset —
   - Case `FIR-1042/2026`, Cybercrime Investigation, `UNDER_INVESTIGATION`.
   - Documents: `FIR.pdf`, `Victim_Statement.pdf`, `Witness_Statement.pdf`, `Investigation_Report.pdf`, `Forensic_Report.pdf`, `Charge_Sheet.pdf`.
   - Evidence: `EV-001` CCTV Video, `EV-002` Digital Device Image.
   - Users: Officer 1024, Senior Officer 2051, Forensic Officer 52, Admin 001.
2. Dry-run the full **§49 demonstration flow** end-to-end against the seeded data, via curl/Postman, exactly in the 15-step order — this is your final acceptance test before handing off to frontend integration.
3. Confirm error response shapes are stable and documented (OpenAPI/Postman collection) so the frontend team can branch on `error.code` reliably.
4. Backup: a simple `pg_dump` + MinIO bucket sync script; document restore steps.
5. Deploy: single docker-compose (or equivalent) bringing up API + Postgres + MinIO together; smoke-test `GET /health` post-deploy.
6. Freeze the API contract (Part C) — any further backend changes that alter response shapes get flagged to the frontend team in advance, per the spec's explicit ask.

### Final Definition of Done — cross-check against §47 Backend Checklist
```text
[ ] Login works, unauthorized API requests are rejected
[ ] Roles enforced server-side (not just hidden in UI)
[ ] Cases can be created / listed (paginated) / updated
[ ] Documents can be uploaded and are securely stored
[ ] SHA-256 is generated on upload and on every version
[ ] Verification endpoint works and detects tampering
[ ] Version history works; signed/locked versions cannot be edited
[ ] Approval workflow works (submit → approve/reject → sign → lock)
[ ] Audit history is recorded for every listed event type (§21)
[ ] Audit hash-chain verifies; a tampered row is detectable (§21.1)
[ ] Blockchain record is created for the §25 event subset
[ ] Blockchain verification works and matches the audit trail
[ ] Evidence can be registered; chain of custody is traceable
[ ] Secure sharing works; expired/revoked shares are rejected
[ ] Unauthorized sharing/access fails with the right HTTP status
[ ] Demo data seed script is ready and idempotent
[ ] Security testing pass complete (§43/§11 attack list)
```

---

## Appendix — Stage → Entity → Endpoint Quick Reference

| Stage | New entities | New endpoints |
|---|---|---|
| 1 | — | `GET /health` |
| 2 | User, RefreshToken | `/auth/login`, `/auth/logout`, `/auth/me` |
| 3 | Case | `/cases` (POST/GET/GET:id/PATCH) |
| 4 | Document | `/cases/:id/documents` (POST/GET), `/documents/:id`, `/documents/:id/download` |
| 5 | DocumentVersion | `/documents/:id/versions`, `/documents/:id/verify` |
| 6 | AuditEvent | `/documents/:id/audit`, `/cases/:id/audit` |
| 7 | Approval, Signature | `/documents/:id/{submit,approve,reject,sign,lock}` |
| 8 | BlockchainRecord | `/blockchain/register`, `/blockchain/records/:id`, `/blockchain/verify/:id` |
| 9 | Evidence, EvidenceCustodyEvent | `/cases/:id/evidence`, `/evidence/:id`, `/evidence/:id/transfer`, `/evidence/:id/custody` |
| 9.5 | Share | `/documents/:id/share`, `/documents/shared-with-me`, `/shares/:id/revoke` |
| 10 | — (AI metadata fields) | — |
| 11 | — | — (tests only) |
| 12 | — | — (seed/ops scripts) |

---

## Suggested Timeline Mapping (7-day compressed, per §46)

```text
Day 1  Stage 1 + 2   (foundation + auth)
Day 2  Stage 3        (cases)
Day 3  Stage 4         (upload/storage/metadata) — milestone: login→case→upload→view
Day 4  Stage 5 + 6     (hashing/versioning + audit)
Day 5  Stage 7 + 8     (approval/signing + blockchain) — milestone: full upload→hash→
                        version→audit→approve→sign→blockchain→verify chain works
Day 6  Stage 9 + 9.5   (evidence/custody + sharing)
Day 7  Stage 11 + 12   (security pass + demo prep, alongside frontend)
```

Stage 10 (AI/OCR) only if time remains — it is explicitly secondary in the spec.
