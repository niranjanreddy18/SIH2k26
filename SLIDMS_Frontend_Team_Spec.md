# SLIDMS — Frontend Team Specification
## Derived from the master MVP spec — for independent, parallel development

**This is the frontend team's working spec.** It contains every screen, state, and UI rule you need, plus the exact API contract (§ marked CONTRACT below) and response-shape reference so you can build against mocked data without waiting on the backend team.

- Companion doc: `SLIDMS_Backend_Team_Spec.md` — same API contract, backend-logic detail.
- Full reference: `Secure_Legal___Investigation_Document_Management_System_v2.md` — the complete master spec (all 64 sections) if you need context this doc trimmed out.
- Section headers below carry `_(master spec §N)_` so you can jump to the original for extra detail or historical context.

---


# PART A — SHARED CONTEXT (read once, same in the backend doc)

# 1. PROJECT DEFINITION  _(master spec §1)_

## 1.1 Product Name

**Secure Legal & Investigation Document Management System**

Short name for development:

**SLIDMS**

---

## 1.2 One-Line Product Definition

> A secure case-centric platform that manages legal and investigation documents throughout their lifecycle while providing controlled access, version history, cryptographic integrity verification, approval/signing, secure sharing, evidence provenance, and a tamper-evident audit trail.

---

# 2. WHAT WE ARE BUILDING  _(master spec §2)_

The system is **not simply a cloud drive** and **not simply a blockchain application**.

It is a secure document and evidence lifecycle platform.

The central structure is:

```text
USER
  │
  ▼
CASE
  │
  ├── DOCUMENTS
  │      │
  │      ├── VERSIONS
  │      ├── APPROVAL
  │      ├── SIGNATURE
  │      ├── HASH
  │      └── AUDIT HISTORY
  │
  └── EVIDENCE
         │
         └── CHAIN OF CUSTODY
```

The system must answer these questions for every important record:

1. What is this document/evidence?
2. Which case does it belong to?
3. Who created it?
4. Which version is authoritative?
5. Who modified it?
6. Who approved it?
7. Who signed it?
8. Who has access?
9. Who viewed/downloaded/shared it?
10. Has it been modified after registration/signing?
11. Where has evidence moved?
12. Can the complete history be verified?

---

# 3. MVP OBJECTIVE  _(master spec §3)_

The MVP must prove the following core proposition:

> A legal or investigation document can be securely uploaded, associated with a case, assigned a cryptographic fingerprint, versioned, reviewed, approved, locked/signed, shared with authorized personnel, audited, and later verified for tampering.

The MVP must demonstrate this end-to-end flow:

```text
LOGIN
   ↓
OPEN CASE
   ↓
UPLOAD DOCUMENT
   ↓
GENERATE HASH
   ↓
STORE DOCUMENT
   ↓
CREATE AUDIT EVENT
   ↓
CREATE/UPDATE VERSION
   ↓
SUBMIT FOR APPROVAL
   ↓
APPROVE
   ↓
SIGN & LOCK
   ↓
RECORD IMPORTANT EVENT ON BLOCKCHAIN
   ↓
SHARE WITH AUTHORIZED USER
   ↓
AUDIT / CHAIN OF CUSTODY
   ↓
VERIFY DOCUMENT
   ↓
✓ AUTHENTIC
```

Then the system must also demonstrate:

```text
Modify document
      ↓
Recalculate hash
      ↓
Compare with registered hash
      ↓
🚨 TAMPERING DETECTED
```

---

# 4. MVP SCOPE  _(master spec §4)_

## 4.1 Must-Have Features

These are mandatory for the MVP:

1. Authentication
2. Role-based authorization
3. Case management
4. Document upload
5. Document metadata
6. Secure document storage
7. SHA-256 document hashing
8. Document verification
9. Document version control
10. Approval workflow
11. Document locking
12. Digital-signature representation/integration
13. Audit trail
14. Basic tamper-evident audit mechanism
15. Blockchain registration of important document events
16. Secure document sharing
17. Basic evidence management
18. Chain of custody
19. Search and filtering
20. Security/administration dashboard

---

## 4.2 Secondary Features

Build these after the core MVP works:

1. OCR
2. AI document classification
3. AI metadata extraction
4. Semantic search
5. Sensitive-information detection
6. Watermarked downloads
7. Temporary access
8. Suspicious-access alerts

---

## 4.3 Explicitly Out of MVP Scope

Do NOT spend significant development time on:

- Complete CCTNS integration
- Complete ICJS integration
- Complete e-Courts integration
- Production government identity infrastructure
- Full nationwide deployment
- Mobile application
- Microservices unless necessary
- Kubernetes
- Multi-region architecture
- Huge blockchain network
- Advanced AI chatbot
- Facial recognition
- Predictive policing
- Large-scale analytics
- Fully automated legal decision making

External systems may be represented using **mock APIs/adapters** for the SIH prototype.

---

# 5. CORE USERS AND ROLES  _(master spec §5)_

The MVP uses four primary roles.

## 5.1 Investigator

Responsible for creating and managing investigation records.

Permissions:

- View assigned cases
- Create documents
- Upload documents
- Create new versions
- Submit documents for approval
- View audit history
- Share eligible documents
- Register evidence
- Initiate evidence transfer

Cannot:

- Approve own document where approval separation is required
- Modify locked/signed versions
- Delete audit records
- Access unrelated confidential cases

---

## 5.2 Senior Officer

Responsible for review and approval.

Permissions:

- View assigned cases
- View documents
- Review documents
- Approve documents
- Reject documents
- Sign/lock documents
- Share authorized documents
- View audit history
- Verify document integrity

---

## 5.3 Forensic Officer

Responsible for forensic evidence and reports.

Permissions:

- Access assigned cases/evidence
- Receive evidence
- Record chain-of-custody events
- Upload forensic reports
- View relevant documents
- Verify integrity

---

## 5.4 Administrator

Responsible for system-level administration.

Permissions:

- Manage users
- Assign roles
- Assign departments
- View system-wide audit
- Manage security policies
- View alerts
- Manage system configuration

The administrator should **not automatically be able to modify or erase historical audit records**.

---



# PART B — FRONTEND DOMAIN SPEC

# 6. CASE DASHBOARD  _(master spec §8)_

Each case must have one central dashboard.

Display:

```text
CASE INFORMATION

Documents: 12
Evidence Items: 4
People/Participants: 8
Pending Approvals: 2
Audit Events: 87
Shared Documents: 3
```

Main tabs:

```text
Overview
Documents
Evidence
Timeline
Audit
Access
```

---

# 7. UI SCREENS  _(master spec §48)_

The MVP should have approximately eight main screens.

## Screen 1 — Login

Contains:

```text
Username
Password
Login
```

---

## Screen 2 — Dashboard

Contains:

```text
My Cases
Pending Approvals
Recent Documents
Recent Evidence
Security Alerts
```

---

## Screen 3 — Case List

Contains:

```text
Search
Filters
Case cards/table
```

---

## Screen 4 — Case Details

Tabs:

```text
Overview
Documents
Evidence
Timeline
Audit
Access
```

---

## Screen 5 — Document Details

Display:

```text
Document preview
Metadata
Current version
Hash
Status
Integrity
Owner
Actions
```

Actions:

```text
View
Download
Verify
Create Version
Submit
Share
```

---

## Screen 6 — Version & Audit History

Display:

```text
Version 1
Version 2
Version 3

and

Audit timeline
```

---

## Screen 7 — Evidence / Chain of Custody

Display:

```text
Evidence information
Current holder
Hash
Chain of custody timeline
```

---

## Screen 8 — Integrity Verification

This is the key demonstration screen.

Display:

```text
DOCUMENT INTEGRITY

Registered Hash
83AB91...

Current Hash
83AB91...

Blockchain Reference
TX-839201

STATUS

✓ INTEGRITY VERIFIED
```

Tampering scenario:

```text
DOCUMENT INTEGRITY

Registered Hash
83AB91...

Current Hash
91BC72...

STATUS

🚨 TAMPERING DETECTED
```

---

# 8. DOCUMENT LIFECYCLE  _(master spec §42)_

The entire document lifecycle is:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER REVIEW
  ↓
APPROVED / REJECTED
  ↓
SIGNED
  ↓
LOCKED
  ↓
SHARED / SUBMITTED
  ↓
ARCHIVED
```

Rules:

### DRAFT
Editable.

### SUBMITTED
Awaiting review.

### UNDER REVIEW
Reviewer evaluates.

### APPROVED
Approved by authorized reviewer.

### SIGNED
Digitally signed.

### LOCKED
Cannot be modified.

### ARCHIVED
Read-only retention state.

---

# 9. CHAIN-OF-CUSTODY UI  _(master spec §31)_

Display as a timeline:

```text
● Evidence Collected
│   Officer 1024
│   09:15
│
● Evidence Uploaded
│   Officer 1024
│   09:32
│
● Transferred to Forensics
│   10:10
│
● Received
│   Forensic Officer 52
│   10:14
│
● Analysis Completed
    11:40
```

This should be one of the strongest visual features.

---


# 10. WHAT THE UI NEEDS TO KNOW ABOUT ACCESS CONTROL  _(condensed from master spec §32, §32.2, §45)_

The backend is the only real enforcement point (§45 below) — but the UI should still hide/disable actions a user cannot perform, both for good UX and to avoid confusing 403 errors. Drive this off the same model the backend uses:

```text
Effective permission for (user, document, action) =
    BASE GRANT   (Role + Case Assignment + Classification + Permission)
         OR
    SHARE GRANT  (an explicit Share the user was given for this document)
```

Reference matrix (full version in the backend doc, master §32.2):

| Role | Classification | View | Download | Edit | Share | Approve | Sign |
|---|---|---|---|---|---|---|---|
| Investigating Officer | PUBLIC / INTERNAL | ✓ | ✓ | ✓ (own, unlocked) | ✓ | ✗ | ✗ |
| Investigating Officer | CONFIDENTIAL | ✓ | ✓ | ✓ (own, unlocked) | ✗ | ✗ | ✗ |
| Investigating Officer | HIGHLY CONFIDENTIAL | ✓ (if case-assigned) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Senior/Approving Officer | PUBLIC / INTERNAL / CONFIDENTIAL | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Senior/Approving Officer | HIGHLY CONFIDENTIAL | ✓ (if case-assigned) | ✓ (if case-assigned) | ✗ | ✗ | ✓ | ✓ |
| Forensic Officer | Assigned evidence/docs only | ✓ | ✓ (if granted) | ✗ | ✗ | ✗ | ✗ |
| Admin | Any (via ADMINISTER) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

Practical rule: fetch `GET /auth/me` for role, and read each document/case response's own fields (classification, your effective permissions if the API returns them, share expiry) to decide what to render — don't hardcode the matrix client-side if the API can just tell you what's allowed.

Also drive UI state off document status (§42): a `LOCKED` or `SIGNED` document should render `Create New Version` instead of `Edit`, never an active Edit button that will just 403.


# 11. IMPORTANT SECURITY RULE FOR FRONTEND WORK  _(master spec §45)_

Never rely solely on frontend restrictions.

```text
Frontend:
Hide DELETE button
```

is NOT security — it's UX. The backend will independently reject unauthorized requests (`DELETE /documents/123` etc.) regardless of what the UI shows. Practical implication for you: **always handle 401/403 responses gracefully** (redirect to login / show "not authorized" state) instead of assuming a hidden button means that code path is unreachable — a user can always hit the API directly.


# 12. SEARCH & FILTER UI  _(condensed from master spec §36)_

Expose these as search/filter controls (Screen 3 — Case List, and document lists within Screen 4):

```text
Case number
FIR number
Document name
Document type
Person
Police station
Date
Status
Tags
```

Wire filters to the paginated list endpoints' query params (`?page=&limit=&status=&...`, see the API contract, Part D). Debounce free-text search input; don't fire a request per keystroke.


# 13. AI / OCR UI TOUCHPOINTS  _(condensed from master spec §37–§41 — Tier 3, build after core screens)_

These are secondary/optional features (master spec §59 Tier 3). The one UI rule that matters: **AI never silently assigns critical legal metadata** — always show a confirm/change step.

```text
AI DOCUMENT CLASSIFICATION       AI METADATA EXTRACTION
Predicted Type: Witness          Detected: FIR Number, Date,
Statement                        Police Station, Names, Location
Confidence: 94%
[Confirm]  [Change]              [Confirm]  [Edit before saving]
```

Sensitive-data detection (§41), if built, surfaces as a non-blocking warning banner (⚠ Phone Number: 1, Address: 2 …), not a hard stop. Semantic search (§40) is a "nice to have" on top of standard search — build only after standard search (above) works.


# 14. DATA CONTRACTS — ENTITY SHAPES TO MOCK AGAINST  _(condensed from master spec §46)_

Use these field lists to build mock data / TypeScript interfaces now, without waiting on the backend. Treat field names as logical, not final — confirm exact JSON casing with the backend team once endpoints are live, but the shape below should not change.

```text
User          id, name, role, department

Case          id, caseNumber, firNumber, type, status, createdAt,
              assignedInvestigators[]

Document      id, caseId, name, type, currentVersion, hash,
              classification, status, owner, createdAt

DocumentVersion  versionNumber, hash, createdBy, createdAt,
                 reasonComment, status

Evidence      id, caseId, type, description, collectedBy,
              collectionTime, currentHolder, hash

EvidenceCustodyEvent  evidenceId, from, to, actor, timestamp,
                      action, reason

AuditEvent    eventId, actor, action, target, timestamp, result,
              hash, previousHash        ← hash-chain fields, §21.1

Share         documentId, recipientUserId, permissions[],
              expiresAt, revokedAt, watermark

BlockchainRecord  documentId, caseId, version, documentHash,
                  action, actorRef, timestamp, txReference
```

Screens that need each entity: Case (Screens 2–4), Document + DocumentVersion (Screens 4–6, 8), AuditEvent (Screen 6), Evidence + EvidenceCustodyEvent (Screen 7), Share (Screen 4 "Access" tab), BlockchainRecord (Screen 8 — the integrity-verification screen).



# PART C — API CONTRACT (identical in both docs — do not diverge without telling the other team)

# 15. MINIMUM API SURFACE  _(master spec §47)_

The backend should approximately provide:

## Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Cases

```text
POST /cases
GET  /cases?page=&limit=&status=&sort=
GET  /cases/:id
PATCH /cases/:id
```

## Documents

```text
POST /cases/:caseId/documents
GET  /cases/:caseId/documents?page=&limit=&type=&status=&sort=
GET  /documents/:id
GET  /documents/:id/download
POST /documents/:id/versions
POST /documents/:id/verify
```

## Workflow

```text
POST /documents/:id/submit
POST /documents/:id/approve
POST /documents/:id/reject
POST /documents/:id/sign
POST /documents/:id/lock
```

## Sharing

```text
POST /documents/:id/share
GET  /documents/shared-with-me
POST /shares/:id/revoke
```

## Audit

```text
GET /documents/:id/audit?page=&limit=&action=&from=&to=
GET /cases/:id/audit?page=&limit=&action=&from=&to=
```

`?page=&limit=` (with sensible defaults, e.g. `limit=50` capped at `200`) applies to every list endpoint above — added now rather than retrofitted once case/document/audit volumes grow.

## Evidence

```text
POST /cases/:caseId/evidence
GET  /cases/:caseId/evidence
GET  /evidence/:id
POST /evidence/:id/transfer
GET  /evidence/:id/custody
```

## Blockchain

```text
POST /blockchain/register
GET  /blockchain/records/:documentId
POST /blockchain/verify/:documentId
```

These are logical endpoints. Naming can be adjusted to the backend framework without changing functionality.

---


# 16. FRONTEND BUILD ORDER  _(derived from master spec §49–§51)_

Build against mocked responses matching Part B's data contracts until real endpoints land; swap the mock layer for live calls incrementally per screen.

```text
STAGE 1  Project foundation
         Repo, app shell, routing, base layout, API client with env-based
         base URL, error boundary.

STAGE 2  Authentication
         Login screen (Screen 1), protected routes, role-aware nav,
         GET /auth/me on load, 401 → redirect to login.

STAGE 3  Case management
         Dashboard (Screen 2), Case List (Screen 3) with search/filter,
         Case Details (Screen 4) tabs shell.

STAGE 4  Document management
         Upload flow UI, Document Details (Screen 5), document listing
         within a case, preview/download actions.

STAGE 5  Hashing + versioning UI
         Version & Audit History (Screen 6) — version list; wire
         "Verify" action once backend endpoint exists.

STAGE 6  Audit trail UI
         Audit tab (read-only timeline) inside Screen 4/6.

STAGE 7  Approval + signing UI
         Submit / Approve / Reject / Sign / Lock actions on Screen 5,
         with state-driven button visibility (§ "What the UI needs to
         know about access control" above).

STAGE 8  Blockchain / Integrity Verification UI
         Screen 8 — this is the key demonstration screen. Build both the
         ✓ VERIFIED and 🚨 TAMPERING DETECTED states now, not just the
         happy path, since the demo climax depends on it (Part D, demo
         flow, Step 15).

STAGE 9  Evidence + chain of custody UI
         Screen 7 — evidence info + timeline (reuse the Screen 6 timeline
         component if it fits).

STAGE 10 AI/OCR UI (optional, only after 1–9 are solid)
         Confirm/change patterns per the AI/OCR section above.

STAGE 11 Security-hardening UI pass
         Graceful 401/403 handling everywhere, expired-share states,
         locked-document states — pair with the backend team's attack
         testing (their Stage 11) rather than guessing at edge cases.

STAGE 12 Final integration
         Loading/empty/error states polished on every screen, demo data
         wired in, UI polish, rehearse the demo flow end to end.
```

**7-day compressed version** _(master spec §50)_: Login + basic dashboard by end of Day 1, Case dashboard by Day 2, Upload/storage/metadata/preview UI by Day 3 (milestone: login → case → upload → view must work), Version/Audit UI by Day 4, Approval/Signing/Blockchain-verification UI by Day 5 (milestone: the full workflow through verify must work on screen), Evidence/custody UI + any AI/OCR UI by Day 6, and reserve Day 7 for polish + rehearsing the demo alongside the backend team.


# 17. FRONTEND TEAM CHECKLIST  _(frontend-owned items from master spec §63)_

```text
[ ] Login works; roles visibly change what's shown/accessible
[ ] Case list/creation/details screens work end to end
[ ] Document upload UI works; success state shows hash + doc ID
[ ] Version history UI works
[ ] Signed/locked documents show "Create New Version", not "Edit"
[ ] Approval workflow UI works (submit → approve/reject → sign → lock)
[ ] Audit history is visible and clearly read-only in the UI
[ ] Blockchain reference is shown on the verification screen
[ ] Verification screen renders BOTH the ✓ VERIFIED and
    🚨 TAMPERING DETECTED states correctly
[ ] Evidence + chain-of-custody timeline renders correctly
[ ] Sharing UI works; expired/revoked shares show the right state
[ ] Unauthorized actions fail gracefully (no raw error dumps)
[ ] Demo data renders correctly across every screen
[ ] Tampering demonstration is rehearsed and visually clear
[ ] Loading/empty/error states exist on every screen
[ ] Presentation flow has been rehearsed
```



# PART D — SHARED ACCEPTANCE CRITERIA & PRINCIPLES (same in the backend doc)

# 18. DEMO DATA  _(master spec §52)_

Use one carefully prepared sample case.

Example:

```text
CASE #FIR-1042/2026

Type:
Cybercrime Investigation

Status:
Under Investigation
```

Documents:

```text
1. FIR.pdf
2. Victim_Statement.pdf
3. Witness_Statement.pdf
4. Investigation_Report.pdf
5. Forensic_Report.pdf
6. Charge_Sheet.pdf
```

Evidence:

```text
EV-001
CCTV Video

EV-002
Digital Device Image
```

Users:

```text
Officer 1024
Senior Officer 2051
Forensic Officer 52
Admin 001
```

---

# 19. OFFICIAL SIH DEMONSTRATION FLOW  _(master spec §53)_

The demo should tell one continuous story.

## Step 1

Login as Investigator.

## Step 2

Open:

```text
CASE #FIR-1042
```

## Step 3

Upload:

```text
Witness_Statement.pdf
```

System displays:

```text
SHA-256 generated
Document ID generated
Audit event created
```

## Step 4

Show the document.

## Step 5

Create Version 2.

Show:

```text
Version 1
Version 2
```

## Step 6

Submit Version 2 for approval.

## Step 7

Log in as Senior Officer.

## Step 8

Approve document.

## Step 9

Sign and lock document.

Show:

```text
SIGNED ✓
LOCKED ✓
```

## Step 10

Show blockchain reference.

```text
Transaction:
TX-839201
```

## Step 11

Share document with Forensic Officer.

## Step 12

Log in as Forensic Officer.

Show:

```text
Shared With Me
```

## Step 13

Transfer evidence.

Show:

```text
Evidence Chain of Custody
```

## Step 14

Return to document verification.

Show:

```text
✓ INTEGRITY VERIFIED
```

## Step 15 — Killer Demo

Modify the document externally.

Verify it again.

Show:

```text
Registered Hash:
83AB91...

Current Hash:
91BC72...

🚨 TAMPERING DETECTED
```

This should be the climax of the demonstration.

---

# 20. MVP SUCCESS CRITERIA  _(master spec §54)_

The MVP is considered successful only when all of the following work:

### Authentication

```text
✓ User can log in
✓ Role restrictions work
```

### Case management

```text
✓ Case can be created
✓ Documents can be associated with case
```

### Documents

```text
✓ Document can be uploaded
✓ Document can be retrieved
✓ Metadata is preserved
```

### Integrity

```text
✓ SHA-256 generated
✓ Hash stored
✓ Verification works
✓ Tampering is detected
```

### Versioning

```text
✓ New versions can be created
✓ Old versions remain preserved
```

### Workflow

```text
✓ Review
✓ Approval
✓ Signing
✓ Locking
```

### Audit

```text
✓ Major actions recorded
✓ History visible
✓ Normal users cannot alter history
```

### Blockchain

```text
✓ Important record registered
✓ Transaction/reference stored
✓ Verification performed
```

### Evidence

```text
✓ Evidence registered
✓ Transfers recorded
✓ Chain of custody visible
```

### Sharing

```text
✓ Authorized sharing works
✓ Unauthorized access fails
```

---

# 21. NON-FUNCTIONAL REQUIREMENTS  _(master spec §55)_

## Security

Security takes priority over convenience.

## Reliability

Document metadata and audit history must not silently disappear.

## Integrity

Important document versions must remain verifiable.

## Traceability

Important actions must be attributable to a user.

## Scalability

The architecture should permit future expansion without redesigning the entire system.

## Maintainability

Frontend, backend, blockchain, and AI components should remain logically separated.

## Privacy

Sensitive information must not be exposed unnecessarily.

---

# 22. IMPORTANT DESIGN PRINCIPLES  _(master spec §56)_

## Principle 1 — Never overwrite official records

Create versions.

## Principle 2 — Blockchain does not store documents

Store hashes/provenance information instead.

## Principle 3 — Frontend is not security

Enforce permissions in the backend.

## Principle 4 — AI does not make legal decisions

AI assists classification/search/extraction.

## Principle 5 — Audit history is append-only

Do not let users rewrite history.

## Principle 6 — Signed documents become immutable

Changes require a new version.

## Principle 7 — Evidence is different from ordinary documents

Evidence requires provenance and custody history.

## Principle 8 — Existing government systems are not being replaced

The architecture should remain integration-ready.

---


# 23. RECOMMENDED TECHNICAL STRUCTURE — FRONTEND SLICE  _(from master spec §57)_

```text
FRONTEND
   │
   ▼
BACKEND API   (Part C — the contract; everything below this line is the
               backend team's concern, not yours)

Suggested frontend stack: React / Next.js — implementation choice,
not a spec requirement.
```

You only ever talk to the backend through the API contract in Part C. If a response shape doesn't match the data contracts in Part B, flag it with the backend team rather than special-casing around it in the UI.

# 24. MVP PRIORITY MATRIX  _(master spec §59)_

## Tier 1 — Critical

```text
Authentication
Roles
Cases
Documents
Storage
SHA-256
Versioning
Audit
Approval
Signing/locking
Blockchain registration
Verification
```

## Tier 2 — Important

```text
Evidence
Chain of custody
Sharing
Search
```

## Tier 3 — Enhancement

```text
OCR
AI extraction
Semantic search
Sensitive data detection
Watermarks
Temporary access
Security analytics
```

---

# 25. THE MVP'S CORE VALUE PROPOSITION  _(master spec §64)_

The final system should communicate one idea extremely clearly:

> **“We don't merely store sensitive legal and investigation documents. We maintain a verifiable lifecycle for them.”**

For every important record, the system provides:

```text
IDENTITY
   +
AUTHORIZATION
   +
VERSION
   +
HASH
   +
SIGNATURE
   +
AUDIT
   +
PROVENANCE
   +
VERIFICATION
```

That is the foundation of the entire project.
