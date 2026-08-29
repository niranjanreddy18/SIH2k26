# SLIDMS — Schema & API Contract
**For parallel frontend/backend development. Backend builds to this exactly; frontend builds against this exactly. Any change to a field name or shape gets announced to both teams, not made silently.**

---

## 0. Locked Stack (stop debating, start building)

```
Frontend:   React + Vite + Tailwind
Backend:    Node.js + Express (or NestJS if the backend team prefers structure)
Database:   PostgreSQL
Storage:    MinIO (S3-compatible)
Blockchain: single-node permissioned ledger for Tier-1 events (per Dev Spec §4) —
            backend team owns this; expose it only through /blockchain/* endpoints
Auth:       JWT (access + refresh), see Dev Spec §4
```

All dates/timestamps: ISO 8601 UTC strings (`"2026-08-29T14:05:00Z"`) — never locale-formatted strings, on either side.
All IDs: UUID v4 strings.
All money/none here, skip.

---

## 1. Database Schema (types locked)

```sql
User (
  id            UUID PK
  name          VARCHAR(120) NOT NULL
  email         VARCHAR(255) NOT NULL UNIQUE
  passwordHash  VARCHAR(255) NOT NULL
  role          ENUM('INVESTIGATOR','SENIOR_OFFICER','FORENSIC_OFFICER','ADMIN') NOT NULL
  department    VARCHAR(120)
  mfaEnabled    BOOLEAN NOT NULL DEFAULT false
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
)

Case (
  id             UUID PK
  firNumber      VARCHAR(60) NOT NULL
  title          VARCHAR(255) NOT NULL
  description    TEXT
  crimeType      VARCHAR(120)
  status         ENUM('OPEN','UNDER_INVESTIGATION','UNDER_REVIEW','CHARGESHEET_PREPARED','COURT_SUBMITTED','CLOSED','ARCHIVED') NOT NULL DEFAULT 'OPEN'
  classification ENUM('PUBLIC','INTERNAL','CONFIDENTIAL','HIGHLY_CONFIDENTIAL') NOT NULL DEFAULT 'INTERNAL'
  createdBy      UUID FK -> User.id NOT NULL
  createdAt      TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt      TIMESTAMPTZ NOT NULL DEFAULT now()
)

CaseAssignment (
  id       UUID PK
  caseId   UUID FK -> Case.id NOT NULL
  userId   UUID FK -> User.id NOT NULL
  UNIQUE(caseId, userId)
)

Document (
  id                UUID PK
  caseId            UUID FK -> Case.id NOT NULL
  name              VARCHAR(255) NOT NULL
  type              ENUM('FIR','COMPLAINT','WITNESS_STATEMENT','INVESTIGATION_REPORT','FORENSIC_REPORT','MEDICAL_REPORT','SEIZURE_MEMO','ARREST_MEMO','CHARGE_SHEET','COURT_FILING','COURT_ORDER','LEGAL_NOTICE','JUDGMENT','EVIDENCE','OTHER') NOT NULL
  classification    ENUM('PUBLIC','INTERNAL','CONFIDENTIAL','HIGHLY_CONFIDENTIAL') NOT NULL
  currentVersionId  UUID FK -> DocumentVersion.id NULLABLE
  createdBy         UUID FK -> User.id NOT NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
)

DocumentVersion (
  id           UUID PK
  documentId   UUID FK -> Document.id NOT NULL
  versionNo    INTEGER NOT NULL
  hash         CHAR(64) NOT NULL          -- SHA-256 hex
  storageKey   VARCHAR(500) NOT NULL      -- MinIO object key, never a user-supplied filename
  fileSize     BIGINT NOT NULL
  mimeType     VARCHAR(100) NOT NULL
  status       ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','REJECTED','APPROVED','SIGNED','LOCKED','ARCHIVED') NOT NULL DEFAULT 'DRAFT'
  comment      TEXT
  createdBy    UUID FK -> User.id NOT NULL
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE(documentId, versionNo)
)

Approval (
  id                 UUID PK
  documentVersionId  UUID FK -> DocumentVersion.id NOT NULL
  reviewerId         UUID FK -> User.id NOT NULL
  decision           ENUM('APPROVED','REJECTED') NOT NULL
  comment            TEXT
  createdAt          TIMESTAMPTZ NOT NULL DEFAULT now()
)

Signature (
  id                 UUID PK
  documentVersionId  UUID FK -> DocumentVersion.id NOT NULL
  signerId           UUID FK -> User.id NOT NULL
  hash               CHAR(64) NOT NULL
  reference          VARCHAR(255) NOT NULL   -- signature record reference
  createdAt          TIMESTAMPTZ NOT NULL DEFAULT now()
)

Evidence (
  id            UUID PK
  caseId        UUID FK -> Case.id NOT NULL
  type          VARCHAR(120) NOT NULL
  description   TEXT
  status        ENUM('REGISTERED','COLLECTED','UPLOADED','STORED','TRANSFERRED','RECEIVED','ANALYZED','REPORT_GENERATED','SUBMITTED','ARCHIVED') NOT NULL DEFAULT 'REGISTERED'
  collectedBy   UUID FK -> User.id NOT NULL
  collectedAt   TIMESTAMPTZ NOT NULL
)

EvidenceCustodyEvent (
  id           UUID PK
  evidenceId   UUID FK -> Evidence.id NOT NULL
  fromUserId   UUID FK -> User.id NULLABLE
  toUserId     UUID FK -> User.id NOT NULL
  action       VARCHAR(60) NOT NULL   -- e.g. "TRANSFERRED", "RECEIVED", "ANALYZED"
  reason       TEXT
  hash         CHAR(64) NOT NULL
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT now()
)

AuditEvent (
  id            UUID PK
  actorId       UUID FK -> User.id NOT NULL
  action        VARCHAR(60) NOT NULL
  targetType    VARCHAR(40) NOT NULL   -- "DOCUMENT" | "CASE" | "EVIDENCE" | "USER"
  targetId      UUID NOT NULL
  result        ENUM('SUCCESS','FAILURE') NOT NULL
  prevEventHash CHAR(64) NOT NULL      -- hash of previous AuditEvent row; genesis row uses 64 zeros
  eventHash     CHAR(64) NOT NULL      -- SHA256(actorId + action + targetId + timestamp + prevEventHash)
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
)

Share (
  id                 UUID PK
  documentVersionId  UUID FK -> DocumentVersion.id NOT NULL
  recipientId        UUID FK -> User.id NOT NULL
  canView            BOOLEAN NOT NULL DEFAULT true
  canDownload        BOOLEAN NOT NULL DEFAULT false
  expiresAt          TIMESTAMPTZ NOT NULL
  revokedAt          TIMESTAMPTZ NULLABLE
  createdBy          UUID FK -> User.id NOT NULL
  createdAt          TIMESTAMPTZ NOT NULL DEFAULT now()
)

BlockchainRecord (
  id           UUID PK
  refType      VARCHAR(40) NOT NULL   -- "DOCUMENT_VERSION" | "EVIDENCE"
  refId        UUID NOT NULL
  action       VARCHAR(60) NOT NULL
  hash         CHAR(64) NOT NULL
  txReference  VARCHAR(255) NOT NULL
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

---

## 2. API Contract

Every response follows this envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "STRING_CODE", "message": "human readable" } }
```
Every list endpoint follows this pagination shape:
```json
{ "success": true, "data": { "items": [ ... ], "page": 1, "limit": 20, "total": 142 } }
```

### Auth

**POST /auth/login**
```json
// request
{ "email": "string", "password": "string" }
// response
{ "success": true, "data": {
  "accessToken": "jwt-string",
  "user": { "id": "uuid", "name": "string", "role": "INVESTIGATOR", "department": "string" }
}}
// refreshToken is set as httpOnly cookie, not in body
```

**GET /auth/me**
```json
// response
{ "success": true, "data": { "id": "uuid", "name": "string", "email": "string", "role": "INVESTIGATOR", "department": "string" } }
```

### Cases

**POST /cases**
```json
// request
{ "firNumber": "string", "title": "string", "description": "string", "crimeType": "string", "classification": "INTERNAL" }
// response: full Case object, status 201
```

**GET /cases?page=1&limit=20&status=&classification=**
```json
// response.data.items[i]
{ "id": "uuid", "firNumber": "string", "title": "string", "status": "OPEN", "classification": "INTERNAL",
  "documentCount": 12, "evidenceCount": 4, "pendingApprovals": 2, "createdAt": "iso-date" }
```

**GET /cases/:id**
```json
// response
{ "id": "uuid", "firNumber": "string", "title": "string", "description": "string", "crimeType": "string",
  "status": "OPEN", "classification": "INTERNAL", "createdBy": { "id": "uuid", "name": "string" },
  "createdAt": "iso-date", "updatedAt": "iso-date",
  "counts": { "documents": 12, "evidence": 4, "pendingApprovals": 2, "auditEvents": 87, "sharedDocuments": 3 } }
```

### Documents

**POST /cases/:caseId/documents** — multipart/form-data: `file`, `name`, `type`, `classification`
```json
// response
{ "id": "uuid", "caseId": "uuid", "name": "string", "type": "WITNESS_STATEMENT", "classification": "CONFIDENTIAL",
  "currentVersion": { "id": "uuid", "versionNo": 1, "hash": "sha256hex", "status": "DRAFT" } }
```

**GET /documents/:id**
```json
{ "id": "uuid", "caseId": "uuid", "name": "string", "type": "string", "classification": "string",
  "currentVersion": { "id": "uuid", "versionNo": 3, "hash": "sha256hex", "status": "SIGNED",
    "fileSize": 204800, "mimeType": "application/pdf", "createdBy": { "id": "uuid", "name": "string" }, "createdAt": "iso-date" },
  "versionHistory": [ { "versionNo": 1, "status": "ARCHIVED", "createdAt": "iso-date" }, "..." ] }
```

**POST /documents/:id/versions** — multipart/form-data: `file`, `comment`
```json
// response: same shape as currentVersion above, versionNo incremented
```

**POST /documents/:id/verify**
```json
// response
{ "status": "VERIFIED", "registeredHash": "sha256hex", "currentHash": "sha256hex",
  "blockchainRef": "TX-839201", "verifiedAt": "iso-date" }
// or on mismatch:
{ "status": "MISMATCH", "registeredHash": "sha256hex", "currentHash": "differenthex",
  "blockchainRef": "TX-839201", "verifiedAt": "iso-date" }
```

### Workflow

**POST /documents/:id/submit** → `{ "status": "SUBMITTED" }`
**POST /documents/:id/approve** — body: `{ "comment": "string" }` → `{ "status": "APPROVED" }`
**POST /documents/:id/reject** — body: `{ "comment": "string" }` → `{ "status": "REJECTED" }`
**POST /documents/:id/sign** → `{ "status": "SIGNED", "signature": { "signer": {"id","name"}, "hash": "sha256hex", "reference": "string", "timestamp": "iso-date" } }`
**POST /documents/:id/lock** → `{ "status": "LOCKED" }`

### Sharing

**POST /documents/:id/share**
```json
// request
{ "recipientId": "uuid", "canView": true, "canDownload": false, "expiresAt": "iso-date" }
// response: Share object
```

**GET /documents/shared-with-me?page=&limit=**
```json
// response.data.items[i]
{ "shareId": "uuid", "document": { "id": "uuid", "name": "string" }, "canView": true, "canDownload": false, "expiresAt": "iso-date" }
```

### Audit

**GET /documents/:id/audit?page=&limit=**
```json
// response.data.items[i]
{ "id": "uuid", "actor": { "id": "uuid", "name": "string" }, "action": "DOCUMENT_SIGNED",
  "result": "SUCCESS", "createdAt": "iso-date" }
// eventHash/prevEventHash are NOT exposed to frontend — verification happens server-side only
```

### Evidence

**POST /cases/:caseId/evidence**
```json
{ "type": "string", "description": "string", "collectedAt": "iso-date" }
```

**GET /evidence/:id/custody**
```json
// response.data.items[i] — ordered timeline
{ "action": "TRANSFERRED", "from": { "id": "uuid", "name": "string" }, "to": { "id": "uuid", "name": "string" },
  "reason": "string", "createdAt": "iso-date" }
```

### Blockchain

**POST /blockchain/verify/:documentId**
```json
{ "status": "VERIFIED" | "MISMATCH", "txReference": "string", "checkedAt": "iso-date" }
```

---

## 3. Error Codes (use these, don't invent per-endpoint strings)

```
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_LOCKED
AUTH_TOKEN_EXPIRED
FORBIDDEN_NOT_ASSIGNED_TO_CASE
FORBIDDEN_CLASSIFICATION
FORBIDDEN_DOCUMENT_LOCKED
NOT_FOUND
VALIDATION_ERROR
FILE_TYPE_REJECTED
FILE_TOO_LARGE
FILE_MALWARE_DETECTED
RATE_LIMITED
```

---

## 4. Ground rules for the two teams

1. **Backend ships mock endpoints first**, even before real DB/logic — return the exact JSON shapes above with fake data, so frontend is never blocked waiting on real implementation.
2. **Any field name or shape change goes in a shared changelog message to both teams the same day it happens** — silent renames are the #1 cause of last-minute integration breakage.
3. Frontend never receives `passwordHash`, `eventHash`, `prevEventHash`, or raw storage keys — if you see those in a response, backend has a leak.
4. Auth header on every request except `/auth/login`: `Authorization: Bearer <accessToken>`.
