# SLIDMS — Backend Team Specification
## Derived from the master MVP spec — for independent, parallel development

**This is the backend team's working spec.** It contains everything the backend needs to build independently of the frontend team, plus the exact API contract (§ marked CONTRACT below) both teams must honor so integration is a non-event on demo day.

- Companion doc: `SLIDMS_Frontend_Team_Spec.md` — same API contract, UI-focused detail.
- Full reference: `Secure_Legal___Investigation_Document_Management_System_v2.md` — the complete master spec (all 64 sections) if you need context this doc trimmed out.
- Section headers below carry `_(master spec §N)_` so you can jump to the original for extra detail or historical context.

---


# PART A — SHARED CONTEXT (read once, same in the frontend doc)

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



# PART B — BACKEND DOMAIN SPEC

# 6. CASE MANAGEMENT  _(master spec §6)_

A case is the top-level entity.

## 6.1 Case Fields

Minimum fields:

```text
Case ID
FIR Number
Case Title
Description
Crime Type
Applicable Sections
Police Station / Department
Investigating Officer
Case Status
Security Classification
Created Date
Last Updated
```

Example:

```text
Case ID:
CASE-2026-1042

FIR:
1042/2026

Title:
Cybercrime Investigation

Police Station:
Example Police Station

Investigating Officer:
Officer 1024

Status:
Under Investigation

Classification:
Confidential
```

---

# 7. CASE STATUS  _(master spec §7)_

The MVP uses:

```text
OPEN
UNDER INVESTIGATION
UNDER REVIEW
CHARGESHEET PREPARED
COURT SUBMITTED
CLOSED
ARCHIVED
```

Only authorized users can change case status.

Every status change creates an audit event.

---

# 8. DOCUMENT MANAGEMENT  _(master spec §9)_

Documents are the main object of the system.

## 9.1 Supported Types

For MVP:

- PDF
- DOC/DOCX
- JPG/JPEG
- PNG
- TXT
- MP4
- MP3
- ZIP where required

For large multimedia evidence, the system should reference secure file storage rather than pushing file contents into blockchain.

---

# 9. DOCUMENT TYPES  _(master spec §10)_

Initial document categories:

```text
FIR
COMPLAINT
WITNESS STATEMENT
INVESTIGATION REPORT
FORENSIC REPORT
MEDICAL REPORT
SEIZURE MEMO
ARREST MEMO
CHARGE SHEET
COURT FILING
COURT ORDER
LEGAL NOTICE
JUDGMENT
EVIDENCE
OTHER
```

The system must permit additional types later.

---

# 10. DOCUMENT METADATA  _(master spec §11)_

Each document must have:

```text
Document ID
Case ID
Document Name
Document Type
Version Number
Created By
Created At
Updated By
Updated At
Status
Security Classification
File Size
MIME Type
SHA-256 Hash
Storage Reference
Blockchain Reference
```

Optional metadata:

```text
Date of Document
Department
Police Station
Person(s) Mentioned
Location
Tags
Description
```

---

# 11. DOCUMENT UPLOAD FLOW  _(master spec §12)_

When a user uploads a document:

```text
User selects file
       ↓
Backend receives file
       ↓
Validate file type/size
       ↓
Malware/security scan where available
       ↓
Generate SHA-256
       ↓
Encrypt/store document
       ↓
Store metadata
       ↓
Create audit event
       ↓
Register important event
       ↓
Return document ID
```

The user should see:

```text
Upload Successful

Document ID:
DOC-10425

Version:
1

SHA-256:
83ab91...91f2

Integrity:
REGISTERED ✓
```

---

# 12. DOCUMENT STORAGE  _(master spec §13)_

The actual documents should be stored in secure file/object storage.

Recommended conceptual architecture:

```text
Application Database
        │
        └── Metadata
             ├── document ID
             ├── case ID
             ├── hash
             ├── version
             └── permissions

Secure File Storage
        │
        ├── PDFs
        ├── images
        ├── videos
        └── audio
```

The blockchain must NOT store the actual sensitive document.

---

# 13. DOCUMENT HASHING  _(master spec §14)_

Use SHA-256.

For every relevant version:

```text
Document
   ↓
SHA-256
   ↓
Hash
```

Example:

```text
SHA-256:
83AB91E2C4...
```

The hash becomes the document's cryptographic fingerprint.

Important:

> A changed file should produce a different hash.

---

# 14. DOCUMENT VERIFICATION  _(master spec §15)_

The system must provide a prominent:

```text
VERIFY DOCUMENT
```

button.

Verification:

```text
Stored/Registered Hash
          │
          │
          ▼
   Compare with
          ▲
          │
Current Document Hash
```

Result:

### Valid

```text
✓ INTEGRITY VERIFIED

Current hash matches
registered hash.
```

### Invalid

```text
🚨 INTEGRITY FAILURE

Current document hash does not
match the registered hash.

Possible modification detected.
```

---

# 15. VERSION CONTROL  _(master spec §16)_

Documents must never be overwritten once a version is part of an official workflow.

Example:

```text
WitnessStatement.pdf

Version 1
↓
Version 2
↓
Version 3
```

Each version contains:

```text
Version Number
Hash
Created By
Created At
Reason/Comment
Status
```

---

# 16. VERSION STATUS  _(master spec §17)_

Use:

```text
DRAFT
SUBMITTED
UNDER REVIEW
REJECTED
APPROVED
SIGNED
LOCKED
ARCHIVED
```

Example lifecycle:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER REVIEW
  ↓
APPROVED
  ↓
SIGNED
  ↓
LOCKED
```

A locked version cannot be directly edited.

---

# 17. EDITING RULE  _(master spec §18)_

For unlocked drafts:

```text
EDIT → create new version
```

For signed/locked documents:

```text
EDIT → NOT ALLOWED
```

Instead:

```text
Create New Version
```

The previous version remains preserved.

---

# 18. APPROVAL WORKFLOW  _(master spec §19)_

The basic workflow:

```text
Investigator
    ↓
Submit Document
    ↓
Senior Officer
    ↓
Review
    ├── Reject
    │     ↓
    │   Investigator
    │
    └── Approve
          ↓
       Sign
          ↓
        Lock
```

Approval and rejection must create audit events.

---

# 19. DIGITAL SIGNATURE  _(master spec §20)_

For the MVP, implement a clearly represented signing workflow.

A production deployment should integrate an appropriate legally recognized digital-signature/eSign mechanism.

For the prototype, the signing record should include:

```text
Signer
Role
Timestamp
Document Version
Document Hash
Signature Status
Signature Reference
```

Example:

```text
SIGNED ✓

Signed By:
Senior Officer 2051

Version:
3

Hash:
8AB32...

Timestamp:
29 Aug 2026 14:05
```

After signing:

```text
Document = LOCKED
```

---

# 20. DOCUMENT LIFECYCLE  _(master spec §42)_

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

# 21. AUDIT TRAIL  _(master spec §21)_

Every important action must generate an audit record.

Minimum events:

```text
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
```

Audit event example:

```text
Event ID:
AUD-83921

Actor:
OFFICER-1024

Action:
DOCUMENT_UPLOADED

Target:
DOC-10425

Timestamp:
29 Aug 2026 10:32

IP/Session reference:
...

Result:
SUCCESS
```

**Trusted timestamp source:** every audit event and chain-of-custody event uses server time synced via NTP (a fixed pool, e.g. `ntp.org`/cloud-provider NTP), not client-supplied time. State this explicitly in the demo so "timestamp" has an answer to "trusted by whom?" — the server, not the browser.

### 21.1 Audit Event Integrity (Hash-Chaining)

App-level permissions alone do **not** make the audit log tamper-evident — a DBA or anyone with direct database access can still edit rows in a normal table. Only a subset of events (§25) get anchored to the blockchain; the rest (`VIEWED`, `DOWNLOADED`, `ACCESSED`, `LOGIN`, etc.) would otherwise be unprotected DB rows.

To close this gap, **every** audit event — not just the blockchain-anchored subset — is hash-chained, Merkle-tree style, independent of whether blockchain is involved:

```text
record.hash = SHA256(
    record.eventId + record.actor + record.action +
    record.target + record.timestamp + previousRecord.hash
)
```

Each new audit record stores the hash of the previous record. This turns the audit table into an append-only, self-verifying ledger:

```text
AUD-83919  hash: H1  prevHash: H0
AUD-83920  hash: H2  prevHash: H1
AUD-83921  hash: H3  prevHash: H2   ← current head
```

Verification recomputes the chain and compares it to the stored `prevHash` values; any row edited, deleted, or reordered after the fact breaks the chain from that point forward, and the break is immediately localized to the tampered record.

---

# 22. AUDIT TRAIL RULE  _(master spec §22)_

Normal users must not be able to:

- Edit historical events
- Delete historical events
- Rewrite timestamps
- Change the actor
- Change the action

The audit UI should be read-only for ordinary users.

**Scoped tamper-evidence claim.** "Tamper-evident" is true at two different strengths, and the pitch/demo should be precise about which applies to what:

```text
Layer 1 — ALL audit events (VIEWED, DOWNLOADED, ACCESSED, LOGIN, etc.)
  → protected by the hash-chain in §21.1
  → tampering is DETECTABLE (chain breaks) but the record of the
    original correct state lives only in the chain itself

Layer 2 — Lifecycle events anchored to blockchain
  (CREATED / APPROVED / SIGNED / LOCKED / TRANSFERRED / ARCHIVED, §25)
  → protected by hash-chain AND an external, permissioned ledger
  → tampering is detectable even if BOTH the database and the
    hash-chain were somehow compromised, because the blockchain
    copy is outside the application's own database
```

If a judge asks "how do you know the audit log itself wasn't edited?" — the answer is: recompute the hash-chain (Layer 1, catches any DB-level edit) and, for the events that matter most evidentially, cross-check against the independent blockchain record (Layer 2). Do not claim full tamper-evidence for events that are only Layer 1 unless the hash-chain check is actually presented as part of that claim.

---

# 23. BLOCKCHAIN ROLE  _(master spec §23)_

Blockchain is a **trust/provenance component**, not the main document storage system.

The system uses:

```text
Secure File Storage
        +
Normal Application Database
        +
Cryptographic Hashing
        +
Blockchain
```

---

# 24. WHAT GOES ON BLOCKCHAIN  _(master spec §24)_

Only small, non-sensitive integrity/provenance information.

Example transaction:

```text
Document ID
Case ID
Version
Document Hash
Action
Actor Reference
Timestamp
Previous Event Reference
```

Do NOT store:

```text
Full PDF
CCTV video
Witness statement text
Medical records
Personal data
Passwords
Sensitive raw content
```

---

# 25. BLOCKCHAIN USE CASES  _(master spec §25)_

Important events to register:

```text
DOCUMENT_CREATED
DOCUMENT_APPROVED
DOCUMENT_SIGNED
DOCUMENT_LOCKED
DOCUMENT_TRANSFERRED
DOCUMENT_ARCHIVED
```

You can register fewer events initially if blockchain performance/development becomes a concern.

---

# 26. PERMISSIONED BLOCKCHAIN  _(master spec §26)_

The proposed model is:

```text
Police Organization
       │
       ├──────────┐
       │          │
       ▼          ▼
   Blockchain Network
       ▲          ▲
       │          │
       └────┬─────┘
            │
        Forensics
            │
        Prosecution
```

This should be treated as a **permissioned blockchain concept**.

**Recommended default for the SIH timeline:** implement the ledger as a lightweight, private hash-chain rather than standing up a full multi-org Hyperledger Fabric network. Standing up ordering service, peers, channels, chaincode, and MSP/certs typically eats days even for people who've done it before, and that time is better spent on the core case→document→audit workflow.

```text
Each ledger record stores:
    hash(self) + hash(previous record)
```

This is the same hash-chain construction as the audit log (§21.1), applied to the blockchain-anchored event subset (§25), and gets ~90% of the demo value (tamper detection, provenance, "immutable" narrative) at a fraction of the setup risk. It can honestly be described as **"blockchain-inspired"** in the pitch.

If the SIH theme requires a literal blockchain checkbox, a **single-node Hyperledger Fabric or Hyperledger Besu instance** (not a multi-org network) satisfies that requirement while keeping setup time bounded — treat multi-org Fabric as a stretch goal, not an MVP dependency. A simplified local deployment/mock organization setup is acceptable as long as the underlying concept (append-only, hash-linked, externally-verifiable record) is implemented correctly.

---

# 27. BLOCKCHAIN VERIFICATION  _(master spec §27)_

When a document is verified:

```text
Current Document
       ↓
SHA-256
       ↓
Current Hash
       ↓
Retrieve registered integrity record
       ↓
Compare
```

Result:

```text
Registered Hash:
ABC123

Current Hash:
ABC123

Blockchain Reference:
TX-839201

✓ VERIFIED
```

If different:

```text
Registered Hash:
ABC123

Current Hash:
XYZ999

🚨 INTEGRITY MISMATCH
```

---

# 28. CHAIN OF CUSTODY  _(master spec §28)_

Evidence requires a slightly different flow.

Evidence example:

```text
Evidence ID: EV-1002

Type:
CCTV Video

Description:
Camera footage from incident location

Collected By:
Officer 1024

Collection Time:
29 Aug 2026 09:15
```

---

# 29. EVIDENCE LIFECYCLE  _(master spec §29)_

```text
REGISTERED
    ↓
COLLECTED
    ↓
UPLOADED
    ↓
STORED
    ↓
TRANSFERRED
    ↓
RECEIVED
    ↓
ANALYZED
    ↓
REPORT GENERATED
    ↓
SUBMITTED
    ↓
ARCHIVED
```

---

# 30. CHAIN-OF-CUSTODY EVENT  _(master spec §30)_

Timestamps here use the same NTP-synced server clock as the audit trail (§21) — not client time — for evidentiary chain-of-custody credibility.

Each movement records:

```text
Evidence ID
From
To
Actor
Timestamp
Action
Reason
Hash/reference
```

Example:

```text
EV-1002

09:15
Collected by Officer 1024

09:32
Uploaded by Officer 1024

10:10
Transferred to Forensic Department

10:14
Received by Forensic Officer 52

11:40
Analysis initiated
```

---

# 31. ACCESS CONTROL  _(master spec §32)_

Use role-based permissions initially.

Permission categories:

```text
VIEW
UPLOAD
EDIT
DOWNLOAD
SHARE
APPROVE
SIGN
VERIFY
MANAGE_EVIDENCE
VIEW_AUDIT
ADMINISTER
```

The system should combine:

```text
User Role
+
Case Assignment
+
Document Classification
+
Permission
```

before allowing an action.

### 32.1 Document-Level Overrides and Sharing

The base model above is role + case-assignment + classification. §34 (Secure Sharing) additionally lets a document be shared with a specific recipient with its own granular permissions — this is **not** a separate access model, it is an explicit override layer on top of the base model:

```text
Effective permission for (user, document, action) =

  BASE GRANT   (Role + Case Assignment + Classification + Permission)
       OR
  SHARE GRANT  (an explicit Share record: user + document + action,
                scoped to the document's case, with its own
                expiration and optional watermark)
```

A `Share` is implemented as a row in a `Share` table (§46) keyed by `documentId + recipientUserId`, carrying its own `permissions[]`, `expiresAt`, and `revokedAt`. It never grants access outside the document's parent case, and it never widens a user's role — it only grants a named user access to a specific document they would not otherwise reach. This one rule is what makes the "Access" tab (§8) and the sharing UI (§34) map onto a coherent data model.

### 32.2 Role × Classification × Action Matrix

Without a concrete matrix, different implementers will interpret §32/§33 differently. This is the explicit source of truth — implement authorization middleware against this table directly rather than re-deriving rules per endpoint.

| Role | Classification | View | Download | Edit | Share | Approve | Sign |
|---|---|---|---|---|---|---|---|
| Investigating Officer | PUBLIC / INTERNAL | ✓ | ✓ | ✓ (own, unlocked) | ✓ | ✗ | ✗ |
| Investigating Officer | CONFIDENTIAL | ✓ | ✓ | ✓ (own, unlocked) | ✗ | ✗ | ✗ |
| Investigating Officer | HIGHLY CONFIDENTIAL | ✓ (if case-assigned) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Senior/Approving Officer | PUBLIC / INTERNAL / CONFIDENTIAL | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Senior/Approving Officer | HIGHLY CONFIDENTIAL | ✓ (if case-assigned) | ✓ (if case-assigned) | ✗ | ✗ | ✓ | ✓ |
| Forensic Officer | Assigned evidence/docs only | ✓ | ✓ (if granted) | ✗ | ✗ | ✗ | ✗ |
| Admin | Any (via ADMINISTER, not classification bypass) | ✓ | ✗* | ✗ | ✗ | ✗ | ✗ |

\* Admin manages users/roles/config, not document content — admin document access should still route through the same classification check, logged distinctly (`ADMIN_ACCESS`), not silently bypassed.

This table is a starting appendix, not final — add rows as roles are finalized in §5, but every backend PR that touches authorization should be checked against a table like this one rather than judgment calls per endpoint.

---

# 32. SECURITY CLASSIFICATION  _(master spec §33)_

Initial classifications:

```text
PUBLIC
INTERNAL
CONFIDENTIAL
HIGHLY CONFIDENTIAL
```

The classification influences access.

Example:

```text
HIGHLY CONFIDENTIAL
```

may allow:

```text
View ✓
Download ✗
Share ✗
Edit ✗
```

for a particular role.

---

# 33. SECURE SHARING  _(master spec §34)_

Documents should be shared through the application, not by uncontrolled file links.

A share creates an explicit, document-level, case-scoped grant (§32.1) — it overlays the role/case/classification model rather than replacing it, and it can never grant access beyond the document's parent case.

Share form:

```text
Document:
WitnessStatement v2

Recipient:
Forensic Officer 52

Permissions:
View ✓
Download ✓
Edit ✗

Expiration:
30 Aug 2026 18:00

Watermark:
Optional
```

When shared:

```text
DOCUMENT_SHARED
```

is recorded.

---

# 34. TEMPORARY ACCESS  _(master spec §35)_

Optional MVP enhancement.

Example:

```text
Access valid:
29 Aug 2026 10:00
to
29 Aug 2026 18:00
```

After expiration:

```text
ACCESS DENIED
```

---

# 35. SEARCH  _(master spec §36)_

The initial search implementation should support:

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

Example:

```text
Search:
"forensic"
```

returns:

```text
Forensic_Report.pdf
Forensic_Analysis_v2.pdf
```

---

# 36. OCR  _(master spec §37)_

Secondary feature.

For scanned documents:

```text
Scanned PDF
    ↓
OCR
    ↓
Extracted Text
    ↓
Searchable
```

The original document remains unchanged.

OCR output can be stored separately.

---

# 37. AI DOCUMENT CLASSIFICATION  _(master spec §38)_

Secondary feature.

When uploading:

```text
unknown_scan.pdf
```

AI may produce:

```text
Predicted Type:
Witness Statement

Confidence:
94%
```

The user confirms:

```text
[Confirm]
[Change]
```

AI should never silently assign critical legal metadata without user confirmation in the MVP.

---

# 38. AI METADATA EXTRACTION  _(master spec §39)_

Example:

```text
Detected:

FIR Number: 1042/2026
Date: 18/08/2026
Police Station: Example PS
Names: 3
Location: Hyderabad
```

The user confirms the extracted metadata before it becomes authoritative.

---

# 39. SEMANTIC SEARCH  _(master spec §40)_

Optional enhancement.

Instead of exact keywords:

> Find forensic reports associated with CCTV evidence.

The system may retrieve related documents.

This should be implemented only after standard search works.

---

# 40. SENSITIVE-DATA DETECTION  _(master spec §41)_

Optional enhancement.

AI can flag:

```text
Phone numbers
Government identifiers
Addresses
Medical information
Victim information
Minor information
```

Example:

```text
⚠ Sensitive Information Detected

Phone Number: 1
Address: 2
Medical Data: 1
```

---

# 41. SECURITY ARCHITECTURE  _(master spec §43)_

Conceptual architecture:

```text
                   USER
                     │
                     ▼
             Authentication
                     │
                     ▼
              Authorization
                     │
                     ▼
                API Layer
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
 Case Service   Document Service  Audit Service
      │              │              │
      │              ▼              ▼
      │        Secure Storage    Audit Database
      │              │              │
      │              │              ▼
      │              │         Blockchain
      │              │
      └──────────────┴──────────────┐
                                    ▼
                              Verification
```

---

# 42. SECURITY REQUIREMENTS  _(master spec §44)_

Minimum:

### Authentication

- **Password hashing:** `bcrypt` (cost factor 12) or `argon2id` — pick one before any auth code is written; do not store or log plaintext passwords anywhere, including error messages.
- **Session/token model:** JWT access tokens (short-lived, 15 min) + server-tracked refresh tokens (7 days, rotated on use, revocable via a `RevokedToken`/session table). Access token carries `userId`, `role`, and a `sessionId` used as the "actor" reference in every audit event (§21) — this is the field every audit event depends on, so nail it down before writing any audit-logging code.
- Role identification embedded in the token, re-validated server-side per request (never trust the token's role claim alone for high-sensitivity actions — re-check against the DB for APPROVE/SIGN/ADMINISTER).
- MFA-ready architecture (TOTP hook point in the login flow; MFA itself optional for MVP).

### Authorization

- Server-side authorization
- Least privilege
- Case-level restrictions
- Document-level restrictions
- Enforced against the explicit Role × Classification × Action matrix (§32.2), not ad hoc per-endpoint checks

### Data Protection

- HTTPS/TLS
- **Encryption at rest — concrete answer, not "where supported":** for the MVP, use storage-layer encryption via MinIO/S3 **SSE-S3**, with the key locally managed (env-var-backed key or local KMS simulation) for the prototype. State this explicitly in the pitch: *"We encrypt at the storage layer using MinIO SSE-S3 with a locally-managed key for the prototype; production would move key custody to a managed KMS/HSM."* Application-layer encryption (encrypt bytes before upload) is a valid upgrade path but is not required to close this gap for MVP.
- Secure file storage
- No sensitive secrets in source code (env vars / secrets manager only)

### Application Security

- Input validation
- File-type validation
- File-size limits
- Secure upload handling
- Malware scanning where available
- Protection against path traversal
- Protection against broken authorization
- API authentication
- Rate limiting where appropriate
- **Login endpoint specifically:** account lockout / exponential backoff after repeated failed attempts (e.g. lock for increasing intervals after 5 failures), independent of general rate limiting — this is the first thing a security-savvy judge tries, and it's cheap to implement.
- File upload abuse limits: per-user upload rate cap and max concurrent uploads, in addition to the file-size limit above, to bound storage/malware-scan load.

### Data Retention & Legal Hold (Placeholder)

Given the system handles FIRs and forensic reports, a retention/legal-hold policy is in scope even if implementation is deferred past MVP. At minimum, note applicability of **India's Digital Personal Data Protection (DPDP) Act, 2023** to any personal data captured (complainant/witness/accused details, contact info) — specifically purpose limitation and retention-period obligations. Treat this as a placeholder field on `Case`/`Document` (`retentionPolicy`, `legalHold: boolean`) for MVP; full policy enforcement is a post-MVP item, but naming it shows awareness a judge is likely to probe for.

---

# 43. IMPORTANT SECURITY RULE  _(master spec §45)_

Never rely solely on frontend restrictions.

For example:

```text
Frontend:
Hide DELETE button
```

is NOT security.

Backend must reject unauthorized API requests:

```text
DELETE /documents/123
```

when the current user does not have permission.

---

# 44. DATABASE CONCEPT  _(master spec §46)_

Database technology remains deliberately open at the MVP specification level.

The logical entities are:

```text
User
Role
Department
Case
Document
DocumentVersion
Evidence
EvidenceCustodyEvent
AuditEvent
Permission
Share
Approval
Signature
BlockchainRecord
```

Relationships:

```text
User
 ↓
Role / Department

Case
 ├── Documents
 │     └── Versions
 │
 ├── Evidence
 │     └── Custody Events
 │
 └── Audit Events

Document
 ├── Approval
 ├── Signature
 ├── Shares
 └── Blockchain Records
```

Key fields worth calling out explicitly (see §21.1, §32.1, §44):

```text
AuditEvent.hash           SHA-256 of this record's fields
AuditEvent.previousHash   hash of the previous AuditEvent (hash-chain, §21.1)

Share.permissions[]       e.g. [VIEW, DOWNLOAD]
Share.expiresAt           nullable timestamp
Share.revokedAt           nullable timestamp        (§32.1, §34)

User.passwordHash         bcrypt/argon2id output, never plaintext
RefreshToken.revokedAt    nullable, for rotation/revocation        (§44)
```

---



# PART C — API CONTRACT (identical in both docs — do not diverge without telling the other team)

# 45. MINIMUM API SURFACE  _(master spec §47)_

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


# 46. BACKEND BUILD ORDER  _(derived from master spec §49–§51)_

Build in this order — each stage should be independently demoable against the API contract above, even with a stub/empty frontend (use curl/Postman/Insomnia).

```text
STAGE 1  Project foundation
         Repo, backend service skeleton, DB connection, file storage
         connection (MinIO/S3), env vars, base error-handling middleware.

STAGE 2  Authentication
         POST /auth/login, POST /auth/logout, GET /auth/me
         bcrypt/argon2id hashing, JWT + refresh-token rotation (§44),
         role claim, server-side re-validation for APPROVE/SIGN/ADMINISTER.

STAGE 3  Case management
         POST/GET/PATCH /cases (with pagination), case status, investigator
         assignment.

STAGE 4  Document management
         Upload endpoint, validation, storage, metadata, listing
         (paginated), download.

STAGE 5  Hashing + versioning
         SHA-256 on upload and every new version, /documents/:id/verify,
         version history endpoints.

STAGE 6  Audit trail
         Audit event model + hash-chain (§21.1), logging middleware on
         every mutating/read-sensitive action, read-only audit endpoints.

STAGE 7  Approval + signing
         submit/approve/reject/sign/lock endpoints, editing-rule
         enforcement (locked docs reject PATCH), state machine (§42).

STAGE 8  Blockchain
         Local hash-chain ledger (or single-node Fabric/Besu, §26) for the
         event subset in §25; /blockchain/register, /blockchain/verify.

STAGE 9  Evidence + chain of custody
         Evidence registration, transfer, custody-event endpoints.

STAGE 10 AI/OCR (optional, only after 1–9 are solid)
         Pick one or two: OCR, AI classification, metadata extraction.

STAGE 11 Security hardening
         Attack your own API: unauthorized access, expired shares, signed-
         doc edits, audit tampering, bad auth, privilege escalation — every
         one of these should be rejected server-side, never relying on the
         frontend having hidden a button (§45).

STAGE 12 Final integration
         Stability, error responses the frontend can actually branch on,
         demo data seeding (see Part D), backup/deploy.
```

**7-day compressed version** _(master spec §50)_: if the timeline is ~1 week, target Login+roles by end of Day 1, Case CRUD by Day 2, Upload/storage/metadata by Day 3 (milestone: login → case → upload → view must work), SHA-256/versioning/audit by Day 4, Approval/signing/blockchain by Day 5 (milestone: the full upload→hash→version→audit→approve→sign→blockchain→verify chain must work), Evidence/custody by Day 6, and reserve Day 7 for security testing + demo prep alongside the frontend team.


# 47. BACKEND TEAM CHECKLIST  _(backend-owned items from master spec §63)_

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
[ ] Security testing pass complete (§43 STAGE 11 attack list)
```



# PART D — SHARED ACCEPTANCE CRITERIA & PRINCIPLES (same in the frontend doc)

# 48. DEMO DATA  _(master spec §52)_

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

# 49. OFFICIAL SIH DEMONSTRATION FLOW  _(master spec §53)_

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

# 50. MVP SUCCESS CRITERIA  _(master spec §54)_

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

# 51. NON-FUNCTIONAL REQUIREMENTS  _(master spec §55)_

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

# 52. IMPORTANT DESIGN PRINCIPLES  _(master spec §56)_

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


# 53. RECOMMENDED TECHNICAL STRUCTURE — BACKEND SLICE  _(from master spec §57)_

```text
BACKEND
   │
   ├── DATABASE        PostgreSQL / MySQL / MongoDB
   ├── FILE STORAGE     MinIO / S3-compatible, SSE-S3 (§44)
   ├── AUDIT            hash-chained event log (§21.1)
   │      └── BLOCKCHAIN   local hash-chain, or single-node Fabric/Besu (§26)
   └── AI / OCR         Python service (Tesseract for OCR)

Suggested backend stack: Node.js / NestJS / Express, or Spring Boot —
implementation choice, not a spec requirement.
```

Whatever you pick, the frontend team only ever talks to you through the API contract in Part C — keep response shapes stable once agreed, and flag breaking changes in advance.

# 54. MVP PRIORITY MATRIX  _(master spec §59)_

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

# 55. THE MVP'S CORE VALUE PROPOSITION  _(master spec §64)_

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
