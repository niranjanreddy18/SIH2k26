# Secure Legal & Investigation Document Management System
## MVP Development Specification

**Project Type:** SIH Software Project  
**Theme:** Blockchain & Cybersecurity  
**Domain:** Legal / Police / Investigation Document Management  
**Primary Objective:** Build a secure, case-centric system for storing, managing, verifying, sharing, and auditing sensitive legal and investigation documents and evidence.

---

# 0. EXECUTIVE SUMMARY (1-PAGE PITCH VERSION)

> Use this section for the actual SIH pitch. Judges will not read the full 60+ section spec — this page is the entire story.

**Problem**

Legal and investigation documents (FIRs, forensic reports, witness statements, evidence files) move between police, forensics, and prosecution teams with no reliable way to prove *who* touched a record, *when*, and whether it was altered after the fact. Paper trails and shared drives offer no cryptographic proof of integrity and no verifiable chain of custody.

**Solution**

SLIDMS is a case-centric document and evidence lifecycle platform: every document is hashed (SHA-256), versioned, routed through approval and digital signing, and every access/action is logged. High-value lifecycle events (created, approved, signed, locked, transferred, archived) are additionally anchored to a permissioned blockchain ledger, and the full audit log itself is hash-chained end-to-end so even DB-level tampering is detectable (see §22).

**Architecture at a glance**

```text
USER → AUTH/RBAC → API LAYER
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
 CASE SERVICE   DOCUMENT SERVICE    AUDIT SERVICE
      │                │                │
      │         SECURE STORAGE     HASH-CHAINED
      │        (hash + versions)    AUDIT LOG
      │                │                │
      │                ▼                ▼
      │        BLOCKCHAIN ANCHOR (subset of events)
      │                │
      └────────────────┴──────────→ VERIFICATION
```

**Demo flow (5–7 minutes)**

```text
1. Log in as Investigating Officer → open a case
2. Upload a document → SHA-256 fingerprint generated, audit event logged
3. Submit for approval → Senior Officer approves → document signed & locked
4. Key lifecycle event anchored to blockchain
5. Share document with Forensic Officer (scoped, time-bound permission)
6. Attempt an unauthorized action (e.g. edit a locked/signed doc, or access outside
   role/classification) → rejected server-side
7. Tamper demo: modify stored bytes directly in the DB/storage layer → re-run
   verification → hash mismatch detected, audit hash-chain break detected
8. Walk the chain-of-custody timeline for a piece of evidence
```

**What makes this defensible under judge questioning:** the tamper-evidence claim is scoped precisely (§22), the blockchain footprint is minimal and permissioned (§25–26), auth/session and encryption choices are concrete rather than hand-waved (§44), and the access-control model has an explicit Role × Classification × Action matrix (§32) instead of four different implementations.

---

# 1. PROJECT DEFINITION

## 1.1 Product Name

**Secure Legal & Investigation Document Management System**

Short name for development:

**SLIDMS**

---

## 1.2 One-Line Product Definition

> A secure case-centric platform that manages legal and investigation documents throughout their lifecycle while providing controlled access, version history, cryptographic integrity verification, approval/signing, secure sharing, evidence provenance, and a tamper-evident audit trail.

---

# 2. WHAT WE ARE BUILDING

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

# 3. MVP OBJECTIVE

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

# 4. MVP SCOPE

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

# 5. CORE USERS AND ROLES

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

# 6. CASE MANAGEMENT

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

# 7. CASE STATUS

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

# 8. CASE DASHBOARD

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

# 9. DOCUMENT MANAGEMENT

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

# 10. DOCUMENT TYPES

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

# 11. DOCUMENT METADATA

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

# 12. DOCUMENT UPLOAD FLOW

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

# 13. DOCUMENT STORAGE

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

# 14. DOCUMENT HASHING

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

# 15. DOCUMENT VERIFICATION

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

# 16. VERSION CONTROL

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

# 17. VERSION STATUS

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

# 18. EDITING RULE

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

# 19. APPROVAL WORKFLOW

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

# 20. DIGITAL SIGNATURE

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

# 21. AUDIT TRAIL

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

# 22. AUDIT TRAIL RULE

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

# 23. BLOCKCHAIN ROLE

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

# 24. WHAT GOES ON BLOCKCHAIN

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

# 25. BLOCKCHAIN USE CASES

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

# 26. PERMISSIONED BLOCKCHAIN

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

# 27. BLOCKCHAIN VERIFICATION

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

# 28. CHAIN OF CUSTODY

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

# 29. EVIDENCE LIFECYCLE

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

# 30. CHAIN-OF-CUSTODY EVENT

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

# 31. CHAIN-OF-CUSTODY UI

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

# 32. ACCESS CONTROL

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

# 33. SECURITY CLASSIFICATION

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

# 34. SECURE SHARING

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

# 35. TEMPORARY ACCESS

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

# 36. SEARCH

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

# 37. OCR

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

# 38. AI DOCUMENT CLASSIFICATION

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

# 39. AI METADATA EXTRACTION

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

# 40. SEMANTIC SEARCH

Optional enhancement.

Instead of exact keywords:

> Find forensic reports associated with CCTV evidence.

The system may retrieve related documents.

This should be implemented only after standard search works.

---

# 41. SENSITIVE-DATA DETECTION

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

# 42. DOCUMENT LIFECYCLE

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

# 43. SECURITY ARCHITECTURE

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

# 44. SECURITY REQUIREMENTS

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

# 45. IMPORTANT SECURITY RULE

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

# 46. DATABASE CONCEPT

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

# 47. MINIMUM API SURFACE

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

# 48. UI SCREENS

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

# 49. MVP DEVELOPMENT PHASES

Development must happen in the following order.

---

## STAGE 0 — Scope & Design

### Goal

Freeze the MVP.

### Produce

- Architecture diagram
- Entity model
- User roles
- Permission matrix
- Main UI wireframes
- Demo case scenario
- API list

### Exit condition

Everyone understands exactly what is being built.

---

# STAGE 1 — Project Foundation

### Build

- Repository
- Frontend
- Backend
- Database connection
- File storage
- Environment variables
- Basic API structure
- Error handling
- Git workflow

### Exit condition

```text
Frontend
   ↓
Backend
   ↓
Database
```

works.

---

# STAGE 2 — Authentication

### Build

- Login
- Logout
- User identity
- Roles
- Protected routes
- Backend authorization

### Exit condition

Different roles see and access different functionality.

---

# STAGE 3 — Case Management

### Build

- Create case
- Case listing
- Case details
- Case status
- Assign investigator

### Exit condition

```text
Create Case
    ↓
Open Case
    ↓
Manage Case
```

works.

---

# STAGE 4 — Document Management

### Build

- Upload
- Secure storage
- Metadata
- Preview/download
- Document listing

### Exit condition

```text
Case
 ↓
Upload document
 ↓
Store
 ↓
View
```

works.

---

# STAGE 5 — Hashing + Versioning

### Build

- SHA-256
- Hash storage
- Verification
- Version creation
- Version history

### Exit condition

```text
Upload
 ↓
Hash
 ↓
Modify
 ↓
Verify
 ↓
Tampering detected
```

works.

---

# STAGE 6 — Audit Trail

### Build

- Audit event model
- Audit logging
- Audit UI
- Read-only history

### Exit condition

Important system activity is traceable.

---

# STAGE 7 — Approval + Signing

### Build

- Submit for review
- Approve
- Reject
- Sign
- Lock
- New version after modification requirement

### Exit condition

```text
Draft
 ↓
Review
 ↓
Approve
 ↓
Sign
 ↓
Lock
```

works.

---

# STAGE 8 — Blockchain

### Build

- Blockchain network/local deployment
- Transaction creation
- Store document hash/event
- Store transaction reference
- Verify against recorded data

### Exit condition

```text
Document
 ↓
Hash
 ↓
Blockchain record
 ↓
Verification
```

works.

---

# STAGE 9 — Evidence

### Build

- Evidence registration
- Evidence metadata
- Evidence hash
- Evidence transfer
- Chain-of-custody timeline

### Exit condition

A single evidence item can be traced through multiple custody events.

---

# STAGE 10 — AI/OCR

Only after the core system works.

### Build one or two:

```text
OCR
AI classification
Metadata extraction
```

Semantic search is optional.

### Exit condition

AI improves document management without becoming a dependency for the core system.

---

# STAGE 11 — Security Hardening

Attack your own system.

Test:

```text
Unauthorized case access
Unauthorized document access
Unauthorized downloads
Unauthorized modification
Expired share access
Signed-document modification
Audit manipulation
Invalid file uploads
Bad authentication
Privilege escalation
```

Every test should produce the expected secure result.

---

# STAGE 12 — Final Integration & Demo

Stop introducing major features.

Focus on:

- Stability
- Performance
- Error handling
- UI polish
- Demo data
- Presentation
- Testing
- Backup
- Deployment

---

# 50. 7-DAY EMERGENCY DEVELOPMENT PLAN

If the available time is approximately one week:

## Day 1

```text
Project setup
Authentication
Roles
Basic dashboard
```

## Day 2

```text
Case management
Case dashboard
```

## Day 3

```text
Document upload
Storage
Metadata
Preview
```

## Day 4

```text
SHA-256
Verification
Version control
Audit trail
```

## Day 5

```text
Approval
Signing/locking
Blockchain
```

## Day 6

```text
Evidence
Chain of custody
Basic AI/OCR
```

## Day 7

```text
Testing
Security
UI polish
Demo preparation
```

Critical milestone:

### By Day 3

```text
Login
 ↓
Case
 ↓
Upload document
 ↓
View document
```

must work.

### By Day 5

```text
Upload
 ↓
Hash
 ↓
Version
 ↓
Audit
 ↓
Approve
 ↓
Sign
 ↓
Blockchain
 ↓
Verify
```

must work.

If this works, the core MVP is complete.

---

# 51. TEAM DIVISION

For a team of four:

## Member 1 — Frontend

Responsible for:

```text
Login
Dashboard
Cases
Documents
Audit UI
Verification UI
Evidence UI
```

---

## Member 2 — Backend

Responsible for:

```text
Authentication
Cases
Documents
Permissions
Workflow
APIs
```

---

## Member 3 — Security + Blockchain

Responsible for:

```text
SHA-256
Integrity verification
Audit integrity
Blockchain
Signing workflow
Security testing
```

---

## Member 4 — AI + Evidence

Responsible for:

```text
Evidence
Chain of custody
OCR
AI extraction
Search
```

All team members should agree on APIs/interfaces before implementation.

---

# 52. DEMO DATA

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

# 53. OFFICIAL SIH DEMONSTRATION FLOW

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

# 54. MVP SUCCESS CRITERIA

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

# 55. NON-FUNCTIONAL REQUIREMENTS

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

# 56. IMPORTANT DESIGN PRINCIPLES

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

# 57. RECOMMENDED TECHNICAL STRUCTURE

Technology choices can remain flexible, but the logical architecture should be:

```text
                    FRONTEND
                        │
                        ▼
                     BACKEND
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
      DATABASE      FILE STORAGE    AUDIT
                                      │
                                      ▼
                                BLOCKCHAIN
          │
          ▼
      AI / OCR
```

Possible implementation technologies:

```text
Frontend:
React / Next.js

Backend:
Node.js / NestJS / Express
OR
Spring Boot

Database:
PostgreSQL / MySQL / MongoDB

Storage:
MinIO / S3-compatible storage

Blockchain:
Hyperledger Fabric or appropriate permissioned blockchain

AI:
Python service

OCR:
Tesseract or suitable OCR engine
```

These are implementation choices, not requirements of the product specification.

---

# 58. FUTURE EXPANSION

After the MVP, the system can evolve to include:

```text
CCTNS integration
ICJS integration
e-Courts integration
Forensic systems
Government identity
Official eSign services
Enterprise key management
Advanced SIEM integration
Advanced AI search
Automated compliance reports
Retention policies
Digital preservation
Multi-organization blockchain network
```

These are future phases and are not required for the MVP demonstration.

---

# 59. MVP PRIORITY MATRIX

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

# 60. THE PRODUCT IN ONE DIAGRAM

```text
                         USER
                          │
                          ▼
                  AUTHENTICATION
                          │
                          ▼
                  AUTHORIZATION
                          │
                          ▼
                       CASE
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
        DOCUMENTS                   EVIDENCE
             │                         │
       ┌─────┼─────┐                   │
       │     │     │                   ▼
       ▼     ▼     ▼             CHAIN OF CUSTODY
     HASH  VERSION AUDIT
       │     │     │
       │     ▼     │
       │   REVIEW  │
       │     │     │
       │     ▼     │
       │   APPROVE │
       │     │     │
       │     ▼     │
       │   SIGN    │
       │     │     │
       │     ▼     │
       │   LOCK    │
       │           │
       └─────┬─────┘
             ▼
        BLOCKCHAIN
             │
             ▼
        VERIFICATION
             │
       ┌─────┴─────┐
       ▼           ▼
    ✓ VALID     🚨 ALTERED
```

---

# 61. FINAL MVP DEFINITION

The MVP is complete when an authorized investigator can:

```text
1. Log in
2. Create/open a case
3. Upload a legal/investigation document
4. Store document securely
5. Generate a SHA-256 fingerprint
6. Create and manage versions
7. Submit document for approval
8. Have an authorized senior officer approve it
9. Sign/lock the approved version
10. Record important integrity/provenance information on blockchain
11. Share it with another authorized user
12. Record access in the audit trail
13. Register and track evidence custody
14. Verify the document later
15. Detect unauthorized modification
```

The system should therefore demonstrate:

> **Confidentiality + Access Control + Integrity + Provenance + Version Control + Auditability + Secure Collaboration**

---

# 62. THE SINGLE MOST IMPORTANT DEVELOPMENT RULE

Do not build the system as:

```text
Login
+ CRUD
+ AI
+ Blockchain
+ Dashboard
```

Build it as one connected workflow:

```text
CASE
 ↓
DOCUMENT
 ↓
HASH
 ↓
VERSION
 ↓
AUDIT
 ↓
APPROVAL
 ↓
SIGN
 ↓
LOCK
 ↓
BLOCKCHAIN
 ↓
SHARE
 ↓
VERIFY
 ↓
DETECT TAMPERING
```

Every feature should support this workflow.

---

# 63. FINAL TEAM CHECKLIST

Before considering the MVP ready, verify:

```text
[ ] Login works
[ ] Roles work
[ ] Unauthorized API requests are rejected
[ ] Cases can be created
[ ] Documents can be uploaded
[ ] Files are securely stored
[ ] SHA-256 is generated
[ ] Verification works
[ ] Version history works
[ ] Signed versions cannot be edited
[ ] Approval workflow works
[ ] Audit history is recorded
[ ] Audit history cannot be casually altered
[ ] Blockchain record is created
[ ] Blockchain verification works
[ ] Evidence can be registered
[ ] Chain of custody works
[ ] Secure sharing works
[ ] Unauthorized sharing/access fails
[ ] Demo data is prepared
[ ] Tampering demonstration works
[ ] Error handling works
[ ] Security testing is complete
[ ] Presentation flow has been rehearsed
```

---

# 64. THE MVP'S CORE VALUE PROPOSITION

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