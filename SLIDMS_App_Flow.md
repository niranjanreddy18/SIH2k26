# SLIDMS — App Flow, Explained Simply

> This document explains **what happens when someone uses SLIDMS**, in plain language — no code, no schema, no jargon. Read the "Big Picture" first, then dip into whichever smaller flow you need.

---

## 1. The Big Picture

Think of SLIDMS as a **digital evidence locker with a tamper-proof seal**.

Police officers, forensic experts, and senior officials all work out of the same system to manage case files, documents, and physical evidence for an investigation. The one thing SLIDMS is obsessed with proving, at every step, is:

> **"Nothing has been secretly changed."**

It does this with three simple ideas repeated everywhere in the app:

1. **Fingerprint everything.** Every document gets a unique digital fingerprint (a hash) the moment it's uploaded. If even one character changes later, the fingerprint changes too — so tampering is always detectable.
2. **Chain every action to the one before it.** Every important action (upload, approval, evidence handover, login) is logged in a chain where each entry is cryptographically linked to the previous one — like a paper trail that can't be quietly edited.
3. **Anchor the important stuff to a shared ledger.** Key milestones get written to a blockchain-style ledger shared across departments (Police, Forensics, Judiciary) so no single department can rewrite history alone.

Everything else in the app — logging in, creating cases, uploading files, approving them, tracking evidence, sharing documents — exists to feed into and prove out these three ideas.

---

## 2. The End-to-End Journey (one story)

Here's what a real investigation looks like moving through the system, start to finish:

1. **An officer logs in** with their government email and password. The system checks who they are and what they're allowed to do (Investigator, Senior Officer, Forensic Officer, or Admin).
2. **They open or create a case file** — like FIR-2026-9042 — with a title, crime type, and a confidentiality level (Public → Highly Confidential).
3. **They upload a document** into that case (a witness statement, an FIR copy, a forensic report). The moment it's uploaded, SLIDMS fingerprints it and locks that fingerprint in.
4. **The document moves through a review workflow**: Draft → Submitted → Approved (by a senior officer) → Signed → Locked. Once locked, it can never be edited again — only new versions can be added.
5. **In parallel, physical or digital evidence is registered** for the same case (a seized hard drive, a weapon). Every time evidence changes hands — from the investigator to the forensic lab, for example — that handover is recorded with who, when, and why.
6. **At any point, anyone can hit "Verify Integrity"** on a document. SLIDMS re-checks the file against its original fingerprint and tells you instantly: still authentic, or tampered.
7. **Documents can be shared** with specific officers for a limited time window, then access automatically expires (or can be revoked early).
8. **Every single action above is written to an audit trail** that can be independently verified end-to-end — if anyone tried to sneak in, delete, or reorder an entry, the chain would visibly break.
9. **Milestone events also get anchored to the blockchain ledger**, giving a second, independent record that Police, Forensics, and Judiciary can all trust without having to trust each other's databases.

That's the whole story. Everything below just zooms into each of those steps.

---

## 3. Breaking It Into Smaller Flows

### 3.1 Login & Access Flow
**Goal:** make sure only real, authorized officers get in, and that repeated wrong passwords get locked out.

- Officer enters email + password (or clicks a "1-click demo login" card for a demo persona).
- System checks the password, and locks the account for 15 minutes after 5 failed attempts.
- On success, the officer gets a session that auto-renews quietly in the background, and expires automatically if they log out or the session goes stale.
- What they can see and do afterward depends on their role — an Investigator's view looks different from an Admin's.

### 3.2 Case Management Flow
**Goal:** give every investigation a single home where all its documents, evidence, and history live together.

- A new case is opened with an FIR number, a title, and a classification tier.
- The case moves through statuses over its life: Open → Under Investigation → Under Review → Chargesheet Prepared → Court Submitted → Closed/Archived.
- Anyone opening the case sees a dashboard of everything attached to it: document count, evidence count, pending approvals, and full history.

### 3.3 Document Lifecycle Flow
**Goal:** make sure a document can't quietly change after it's been reviewed and signed.

```
DRAFT → SUBMITTED → APPROVED → SIGNED → LOCKED
```

- **Draft:** freshly uploaded, still editable via new versions.
- **Submitted:** the officer says "this is ready for review."
- **Approved / Rejected:** a senior officer signs off, or sends it back.
- **Signed:** formally signed and anchored to the ledger.
- **Locked:** frozen forever — no further edits, only new document versions if truly needed.

Every step here also fires an entry into the audit trail and a new blockchain ledger record.

### 3.4 Document Integrity Verification Flow
**Goal:** prove, on demand, whether a document is still exactly what it was when it was filed.

- Click "Verify Integrity" on any document.
- SLIDMS re-reads the actual file from storage and recomputes its fingerprint right now.
- It compares that fresh fingerprint against the one recorded at upload time.
- **Match →** green "VERIFIED" badge — the file is untouched.
- **Mismatch →** red "TAMPERED" badge — something changed the file outside the system, and SLIDMS caught it.

This is the single most dramatic and important flow in the whole product — it's the proof that the tamper-proofing claim is real, not just marketing.

### 3.5 Evidence & Chain of Custody Flow
**Goal:** track physical/digital evidence the same way real-world police procedure requires — an unbroken record of who's held it and when.

- Evidence is registered against a case (item type, description, when it was collected).
- Every handover — Investigator → Forensic Lab → back to Investigator, etc. — is logged as a custody event: from whom, to whom, why, and when.
- The full custody timeline for a piece of evidence can be viewed as a simple visual trail, so "who had this at 3pm on Tuesday" is always answerable.

### 3.6 Sharing Flow
**Goal:** let officers collaborate across departments without leaving documents permanently exposed.

- An officer shares a specific document with another officer, choosing whether they can just view it or also download it.
- The share automatically expires after a chosen window (1–30 days).
- It can also be revoked early by whoever created the share, or by an Admin.
- The recipient sees it in their own "Shared With Me" list until it expires or is revoked.

### 3.7 Audit Trail Flow
**Goal:** keep a permanent, provably-unaltered record of everything that happened, for every case.

- Every meaningful action anywhere in the system — login, upload, approval, evidence transfer, share — writes one entry into a running audit log.
- Each entry is cryptographically linked to the entry before it (like links in a chain).
- Clicking "Verify Hash Chain" recomputes the entire chain from the very first entry and checks that every link still matches.
- If any entry had been secretly edited or deleted, the chain would visibly "break" at that exact point — and the system tells you precisely where.

### 3.8 Blockchain Ledger Flow
**Goal:** give the audit trail a second, independent, cross-department witness — so no single department has to be blindly trusted.

- Key milestones (document submitted, approved, signed, locked; evidence registered or transferred) get written to a shared ledger that Police, Forensics, and Judiciary organizations all participate in.
- Each ledger entry also links back to the one before it, the same tamper-evident idea as the audit trail, but shared across organizations instead of living in one database.
- If the live cross-department network isn't reachable, SLIDMS quietly falls back to its own local tamper-evident ledger so nothing ever breaks for the officer using the app — the guarantee just becomes single-database instead of multi-organization until the network's back.

### 3.9 Admin Flow
**Goal:** let a system administrator manage who has access, without needing database access.

- View every officer account, their role, and department.
- Create new officer accounts and assign roles.
- Change an existing officer's role.
- Unlock an account that's been locked out from failed login attempts.
- View a system-wide version of the audit log across every case.

---

## 4. How the Flows Connect

```
 Login ──► Case Created ──► Document Uploaded ──► Workflow (Draft→Locked)
                    │                    │
                    │                    └──► Verify Integrity (anytime)
                    │
                    ├──► Evidence Registered ──► Custody Transfers
                    │
                    └──► Share Document ──► Recipient views/downloads ──► Expires/Revoked

 Every action above  ──►  Audit Trail entry  ──►  Blockchain Ledger entry
```

Nothing in SLIDMS happens "silently" — every meaningful action always leaves two independent trails behind it (the audit chain and the ledger), which is what lets the system prove its own integrity instead of just claiming it.
