# SLIDMS — Complete UX Specification
**Secure Legal & Investigation Document Management System**
_Version 1.0 · SIH 2k26 · Last updated: 2026-08-30_

> This document is the single source of truth for every visual, interactive, and behavioural decision in the SLIDMS frontend.

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Layout Shell](#2-layout-shell)
3. [Screen 1 — Login](#3-screen-1--login)
4. [Screen 2 — Dashboard](#4-screen-2--dashboard)
5. [Screen 3 — Case List](#5-screen-3--case-list)
6. [Screen 4 — Case Details](#6-screen-4--case-details)
7. [Screen 5 — Document Details](#7-screen-5--document-details)
8. [Screen 6 — Version & Audit History](#8-screen-6--version--audit-history)
9. [Screen 7 — Evidence & Chain of Custody](#9-screen-7--evidence--chain-of-custody)
10. [Screen 8 — Integrity Verification](#10-screen-8--integrity-verification)
11. [Admin Screen](#11-admin-screen)
12. [Shared With Me Screen](#12-shared-with-me-screen)
13. [Component Library](#13-component-library)
14. [Role-Based UI Rules](#14-role-based-ui-rules)
15. [Document Lifecycle States](#15-document-lifecycle-states)
16. [Global Interaction Patterns](#16-global-interaction-patterns)
17. [Demo Flow UX Checklist](#17-demo-flow-ux-checklist)

---

## 1. Design System

### 1.1 Color Palette

```
Background (base)        #0a0f1e   — near-black navy
Surface (card)           #111827   — dark slate
Surface elevated         #1f2937   — slightly lighter card
Border                   #1e2d45   — subtle blue-tinted border
Border focus             #3b82f6   — electric blue

Primary                  #3b82f6   — blue-500
Primary hover            #2563eb   — blue-600
Primary dim              rgba(59,130,246,0.15)

Success                  #10b981   — emerald-500
Success bg               rgba(16,185,129,0.15)
Warning                  #f59e0b   — amber-500
Warning bg               rgba(245,158,11,0.15)
Danger                   #ef4444   — red-500
Danger bg                rgba(239,68,68,0.15)
Info                     #6366f1   — indigo-500

Text primary             #f9fafb
Text secondary           #9ca3af
Text muted               #4b5563

Status — DRAFT           #6b7280  (gray)
Status — SUBMITTED       #f59e0b  (amber)
Status — UNDER_REVIEW    #6366f1  (indigo)
Status — APPROVED        #10b981  (emerald)
Status — REJECTED        #ef4444  (red)
Status — SIGNED          #3b82f6  (blue)
Status — LOCKED          #8b5cf6  (violet)
Status — ARCHIVED        #4b5563  (dark gray)
```

### 1.2 Typography

```
Font family      Inter (Google Fonts), fallback system-ui
Heading XL       font-size: 2rem    font-weight: 700   line-height: 1.2
Heading L        font-size: 1.5rem  font-weight: 600
Heading M        font-size: 1.25rem font-weight: 600
Body             font-size: 0.875rem
Body small       font-size: 0.75rem
Label            font-size: 0.75rem  font-weight: 500  UPPERCASE  letter-spacing: 0.05em
Mono             JetBrains Mono (for hashes, IDs)
```

### 1.3 Spacing Scale

```
xs   4px   |   sm   8px   |   md  16px
lg  24px   |   xl  32px   |  2xl  48px   |  3xl  64px
```

### 1.4 Border Radius

```
sm    4px    (inputs, small badges)
md    8px    (cards, buttons)
lg   12px    (modals, large cards)
full 9999px  (pills, avatars)
```

### 1.5 Shadows & Elevation

```
card        0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)
modal       0 20px 60px rgba(0,0,0,0.6)
glow-blue   0 0 20px rgba(59,130,246,0.3)
glow-green  0 0 20px rgba(16,185,129,0.3)
glow-red    0 0 20px rgba(239,68,68,0.4)
```

### 1.6 Animation Tokens

```
duration-fast   150ms
duration-base   250ms
duration-slow   400ms
easing-default  cubic-bezier(0.4, 0, 0.2, 1)
easing-spring   cubic-bezier(0.34, 1.56, 0.64, 1)
```

### 1.7 Classification Color Coding

| Classification | Color |
|---|---|
| PUBLIC | #10b981 (green) |
| INTERNAL | #3b82f6 (blue) |
| CONFIDENTIAL | #f59e0b (amber) |
| HIGHLY_CONFIDENTIAL | #ef4444 (red) + pulsing border animation |

---

## 2. Layout Shell

### 2.1 Structure

```
+----------------------------------------------------------+
|  HEADER (60px)                                           |
|  Logo · "SLIDMS" · Nav actions · User avatar + role      |
+----------+-----------------------------------------------+
|          |                                               |
| SIDEBAR  |  MAIN CONTENT AREA                            |
| (240px)  |                                               |
|          |                                               |
+----------+-----------------------------------------------+
```

### 2.2 Header (`Header.tsx`)

| Zone | Content |
|---|---|
| Left | Shield icon + "SLIDMS" wordmark + "SECURE" pill |
| Centre | Page title (injected per-route) |
| Right | Notification bell · Role pill · User avatar · Logout |

Role pill colors: INVESTIGATOR → blue · SENIOR_OFFICER → violet · FORENSIC_OFFICER → emerald · ADMIN → red

### 2.3 Sidebar (`Sidebar.tsx`)

```
  Dashboard
  Cases
  Documents (shared shortcut)
  Evidence
  Audit Log
  Blockchain
  Admin          ← ADMIN only
```

Active: 3px left accent (blue) + background highlight.
Hover: subtle tint + icon brightens.

---

## 3. Screen 1 — Login

**Route:** `/login` | **File:** `LoginPage.tsx` | Full-page, no shell.

### 3.1 Layout

```
        Shield icon
        SLIDMS
   Secure Legal & Investigation
   Document Management System

   +-----------------------------+
   |  Email                      |
   |  [_________________________]|
   |                             |
   |  Password                   |
   |  [_________________________]|
   |                             |
   |  [      SIGN IN           ] |
   +-----------------------------+

   [Officer 1024] [Senior 2051] [Forensic 52] [Admin 001]
   (click to auto-fill credentials)
```

### 3.2 States

| State | Behaviour |
|---|---|
| Idle | Empty form with placeholders |
| Loading | Button shows spinner + "Signing in…"; inputs disabled |
| Error | Red banner with API error message |
| Success | Flash → redirect to `/dashboard` |

### 3.3 API Call

```
POST /auth/login { email, password }
→ store accessToken in memory (never localStorage)
→ GET /auth/me to confirm role
→ redirect to /dashboard
```

---

## 4. Screen 2 — Dashboard

**Route:** `/dashboard` | **File:** `DashboardPage.tsx`

### 4.1 Layout

```
  Greeting: "Good morning, Officer 1024"  · role badge · date

  [Active Cases]  [Documents]  [Pending Approvals]  [Alerts]
  (stat cards with hover glow + scale animation)

  My Cases (recent 5)          |  Pending Approvals
  Case card x5                 |  Document row x N
  [View All Cases]             |  [Approve] [Reject]

  Recent Documents             |  Security Alerts
  Doc row x5                   |  Alert row x N
```

### 4.2 Stat Card Design

- Large number (2rem bold) + muted label + coloured icon
- Hover: lifts with glow + scale(1.02)

### 4.3 Role-filtered content

| Role | What they see |
|---|---|
| INVESTIGATOR | Their cases, their pending submissions |
| SENIOR_OFFICER | Approval queue, signed documents |
| FORENSIC_OFFICER | Assigned evidence, shared docs |
| ADMIN | System-wide stats + alert feed |

---

## 5. Screen 3 — Case List

**Route:** `/cases` | **File:** `CasesPage.tsx`

### 5.1 Layout

```
  Cases                                    [+ New Case]

  [Search by FIR, title, crime type...]
  Status: [All v]  Classification: [All v]  Sort: [v]

  [Case Card]  [Case Card]  [Case Card]
  [Case Card]  [Case Card]  [Case Card]

  <- 1  2  3 ->
```

### 5.2 Case Card Design

```
  FIR-1042/2026              [OPEN]  [INTERNAL]
  Cybercrime Investigation

  Docs: 12   Evidence: 4   Pending: 2

  Investigator: Officer 1024
  Created: 29 Aug 2026
```

- Click anywhere → `/cases/:id`
- HIGHLY_CONFIDENTIAL: pulsing red left border

### 5.3 New Case Modal (`NewCaseModal.tsx`)

| Field | Type | Validation |
|---|---|---|
| FIR Number | text | required |
| Title | text | required, max 255 |
| Description | textarea | optional |
| Crime Type | text | optional |
| Classification | select | PUBLIC / INTERNAL / CONFIDENTIAL / HIGHLY_CONFIDENTIAL |

### 5.4 Search Behaviour

- Debounce: 300ms
- Query params: `?page=&limit=20&status=&classification=&q=`
- Empty state: illustration + "Clear filters" button

---

## 6. Screen 4 — Case Details

**Route:** `/cases/:id` | **File:** `CaseDetailPage.tsx`

### 6.1 Case Header

```
  <- Back to Cases
  FIR-1042/2026  ·  Cybercrime Investigation
  [OPEN]  [INTERNAL]  ·  Created by Officer 1024

  Docs: 12   Evidence: 4   People: 8   Pending: 2   Audit: 87   Shared: 3
```

### 6.2 Tab Bar

```
  [Overview]  [Documents]  [Evidence]  [Timeline]  [Audit]  [Access]
```

Active: blue underline accent.

---

### Tab: Overview

Case metadata — FIR Number, Title, Description, Crime Type, Status, Classification, Created By/At, Assigned Investigators (avatar chips).

---

### Tab: Documents

```
  Type: [All v]  Status: [All v]                [+ Upload Document]

  Name              Type           Status    Version  Hash
  FIR.pdf           FIR            LOCKED    v3       83AB91...
  Witness...        WITNESS_STMT   APPROVED  v2       4F1C...
```

- Click row → Document Details
- Hash: monospace, 8 chars + "…", full in tooltip
- Upload → `DocumentUploadModal`

#### Document Upload Modal (`DocumentUploadModal.tsx`)

```
  Name        [________________________]
  Type        [Select type v]
  Class.      [Select classification v]

  +------------------------------------------+
  |  Drag & drop file here, or click          |
  |  Supported: PDF, DOCX, PNG, JPG  Max 50MB |
  +------------------------------------------+

  [Cancel]                 [Upload Document]
```

Post-upload success display:
```
  Document uploaded successfully
  SHA-256: 83ab91cd...f204
  Document ID: uuid
  Version: 1
```

---

### Tab: Evidence

```
  [+ Register Evidence]  (INVESTIGATOR only)

  ID      Type         Status    Holder
  EV-001  CCTV Video   STORED    Forensic Off. 52
  EV-002  Digital Img  ANALYZED  Forensic Off. 52
```

Click row → `EvidenceTimelineModal`

---

### Tab: Timeline

Chronological audit events (newest first):
```
  2026-08-30 11:10  Officer 1024      DOCUMENT_SIGNED   Witness_Statement.pdf
  2026-08-30 10:55  Senior Off. 2051  DOCUMENT_APPROVED Witness_Statement.pdf
  ...
```

Coloured left dot per action type.

---

### Tab: Audit

Full paginated log with filters:

| Filter | Options |
|---|---|
| Action | All / specific action types |
| Date Range | from → to |
| Actor | free text |

Columns: `Timestamp · Actor · Action · Target · Result`

> Read-only. No edit/delete controls for any role.

---

### Tab: Access

```
  Document             Shared With       Expires      Perms
  Witness_Stmt.pdf     Forensic Off. 52  2026-09-05   View
                                          [Revoke]
```

[Revoke] visible to: document owner / Senior Officer / Admin only.

---

## 7. Screen 5 — Document Details

**Route:** accessed from Case → Documents tab

### 7.1 Layout

```
  <- Back to Case
  Witness_Statement.pdf             [SIGNED]  [CONFIDENTIAL]
  Type: WITNESS_STATEMENT  ·  Owner: Officer 1024

  +--------------------+  +------------------------+
  |                    |  |  Metadata              |
  |  Document Preview  |  |  Case:    FIR-1042     |
  |  (PDF embed or     |  |  Version: v2           |
  |   "not available") |  |  Hash:    83ab91...    |
  |                    |  |  Size:    204 KB       |
  |                    |  |  MIME:    application/ |
  |                    |  |           pdf          |
  |                    |  |  Created: 2026-08-30   |
  |                    |  |  By:      Officer 1024 |
  |                    |  |                        |
  |                    |  |  --- Actions ---       |
  |                    |  |  [View]                |
  |                    |  |  [Download]            |
  |                    |  |  [Verify Integrity]    |
  |                    |  |  [Create New Version]  |
  |                    |  |  [Submit for Approval] |
  |                    |  |  [Share]               |
  +--------------------+  +------------------------+
```

### 7.2 Action Visibility Matrix

| Action | DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | SIGNED | LOCKED |
|---|---|---|---|---|---|---|
| View | Y | Y | Y | Y | Y | Y |
| Download | role | role | role | role | role | role |
| Verify | — | — | — | Y | Y | Y |
| Create New Version | Y | — | — | — | Y* | Y* |
| Submit for Approval | Y | — | — | — | — | — |
| Approve / Reject | — | SENIOR | SENIOR | — | — | — |
| Sign | — | — | — | SENIOR | — | — |
| Lock | — | — | — | — | SENIOR | — |
| Share | role | role | role | Y | Y | Y |

*On SIGNED/LOCKED: creates fresh draft, does NOT modify original.

### 7.3 Version History Strip

```
  v1  ARCHIVED  Officer 1024       2026-08-29
  v2  SIGNED    Officer 1024       2026-08-30   <- current
```

Click version → loads that version's data in right panel.

### 7.4 Share Modal (`ShareModal.tsx`)

```
  Recipient     [Select user v]

  Permissions
  [x] Can View      [ ] Can Download

  Expires At    [Date picker]

  [Cancel]              [Share Document]
```

---

## 8. Screen 6 — Version & Audit History

### 8.1 Version Timeline

```
  * v3 — LOCKED
  |  Hash:    8f3a92...
  |  By:      Senior Off. 2051
  |  2026-08-30 11:10
  |  "Final approved version locked"
  |
  * v2 — SIGNED
  |  Hash:    4c1b73...
  |  By:      Senior Off. 2051
  |  2026-08-30 10:55
  |  "After witness correction"
  |
  * v1 — ARCHIVED
     Hash:    83ab91...
     By:      Officer 1024
     2026-08-29 09:32
     "Initial upload"
```

Coloured dot (status colour) + vertical connector.

### 8.2 Audit Trail

Read-only, paginated, scoped to this document. Same table as Case Audit tab.

---

## 9. Screen 7 — Evidence & Chain of Custody

**File:** `EvidenceTimelineModal.tsx`

### 9.1 Evidence Header

```
  EV-001 — CCTV Video
  Status: STORED          Case: FIR-1042/2026
  Collected by: Officer 1024  ·  2026-08-28 09:15
  Hash: 3d7f21...
  Current Holder: Forensic Officer 52

  [Transfer Evidence]  (INVESTIGATOR / FORENSIC_OFFICER)
```

### 9.2 Chain of Custody Timeline

```
  * Evidence Collected
  |  From: —
  |  To:   Officer 1024
  |  2026-08-28 09:15
  |  "Collected at crime scene"
  |
  * Uploaded to System
  |  By:  Officer 1024
  |  2026-08-28 09:32
  |
  * Transferred to Forensics
  |  From: Officer 1024
  |  To:   Forensic Officer 52
  |  2026-08-28 10:10
  |  "Digital forensics analysis"
  |
  * Received
  |  Forensic Officer 52
  |  2026-08-28 10:14
  |
  * Analysis Completed
     Forensic Officer 52
     2026-08-28 11:40
```

Alternating blue/violet dots, thick vertical connectors. This is one of the most visually impressive components — it tells the evidence provenance story.

### 9.3 Evidence Registration Modal (`EvidenceModal.tsx`)

```
  Type          [________________________]
  Description   [________________________]
  Collected At  [Date/time picker]

  [Cancel]               [Register Evidence]
```

---

## 10. Screen 8 — Integrity Verification

**File:** `VerificationModal.tsx`

This is the **key demonstration screen**. Both outcomes require maximum visual impact.

### 10.1 Verified State

```
  DOCUMENT INTEGRITY VERIFICATION

  Witness_Statement.pdf  ·  Version 2

  +- Registered Hash ------------------------------------+
  |  83ab91cd4f1c2e3d5b6a7890fe12cd34ab56ef78901234ab  |
  +------------------------------------------------------+

  +- Current Hash ----------------------------------------+
  |  83ab91cd4f1c2e3d5b6a7890fe12cd34ab56ef78901234ab  |
  +------------------------------------------------------+

  +- Blockchain Reference --------------------------------+
  |  TX-839201                                           |
  +------------------------------------------------------+

  +======================================================+
  ||  INTEGRITY VERIFIED                               ||
  ||  Hashes match · Document is authentic             ||
  ||  Verified: 2026-08-30T11:15:00Z                   ||
  +======================================================+
              <- green glow border + pulse animation
```

**Animations:**
- Hash fields: character-by-character type-reveal (200ms stagger)
- Blockchain ref: fade-in
- Result panel: green glow pulse on entry

### 10.2 Tampered State

```
  +- Registered Hash ------------------------------------+
  |  83ab91cd4f1c2e3d5b6a7890fe12cd34ab56ef78901234ab  |
  +------------------------------------------------------+

  +- Current Hash  [MISMATCH] ----------------------------+
  |  91bc72de5a2b3c4d6e7f8901gh23ij45kl67mn89op01qr23  |  <- RED text
  +------------------------------------------------------+

  +======================================================+
  ||  TAMPERING DETECTED                               ||
  ||  Hash mismatch — document has been altered        ||
  ||  Verified: 2026-08-30T11:20:00Z                   ||
  +======================================================+
              <- red pulsing border + shake animation on entry
```

**Animations:**
- Current hash renders in red; differing chars highlighted red-bg
- Result panel: `shake` keyframe (0.4s) + red glow border
- Icon pulses

### 10.3 Loading State

```
  Calculating hash...
  Comparing with registered hash...
  Querying blockchain reference...
```

Steps appear sequentially with 400ms stagger.

---

## 11. Admin Screen

**Route:** `/admin` | **File:** `AdminPage.tsx` | **ADMIN only**

### 11.1 Tabs

```
  [User Management]  [System Audit]  [Security Policies]
```

### 11.2 User Management Tab

```
  [Search users...]              [+ Add User]

  Name            Email          Role              Dept
  Officer 1024    inv@...        INVESTIGATOR      CID
                                  [Edit Role] [Disable]
```

### 11.3 System Audit Tab

System-wide audit log — all users, all targets.

### 11.4 Security Policies Tab

Read-only: max file size, allowed MIME types, session timeout, MFA enforcement.

---

## 12. Shared With Me Screen

**Route:** `/shared` | **File:** `SharedPage.tsx`

```
  Documents Shared With Me

  +--------------------------------------------+
  |  Witness_Statement.pdf                     |
  |  Shared by: Senior Officer 2051            |
  |  Permissions: View only                    |
  |  Expires: 2026-09-05                       |
  |  [View Document]                           |
  +--------------------------------------------+

  +--------------------------------------------+
  |  Forensic_Report.pdf                       |
  |  Shared by: Officer 1024                   |
  |  Permissions: View + Download              |
  |  Expires: 2026-09-01  [Expires soon]       |  <- amber if < 24h
  |  [View Document]  [Download]               |
  +--------------------------------------------+
```

| Share state | Display |
|---|---|
| Active | Normal card |
| Expiring < 24h | Amber "Expires soon" badge |
| Expired | Greyed out + "Access expired" badge |
| Revoked | "Access revoked" badge |

---

## 13. Component Library

### StatusBadge (`StatusBadge.tsx`)
Pill badge for document/case status or classification. Props: `status`, `size?: 'sm' | 'md'`.

### BlockchainLedgerModal (`BlockchainLedgerModal.tsx`)
All blockchain records for a document: `txReference`, `action`, `hash`, `createdAt`. Visual chain-node diagram.

### VerificationModal (`VerificationModal.tsx`)
See §10.

### DocumentUploadModal (`DocumentUploadModal.tsx`)
See §6.2.2.

### ShareModal (`ShareModal.tsx`)
See §7.4.

### NewCaseModal (`NewCaseModal.tsx`)
See §5.3.

### EvidenceModal (`EvidenceModal.tsx`)
See §9.3.

### EvidenceTimelineModal (`EvidenceTimelineModal.tsx`)
See §9.

### Toast Notifications (global, top-right, stacked)

```
  [x]  Document uploaded successfully      <- green, 5s auto-dismiss
  [x]  Share expires in 2 hours            <- amber
  [x]  Authentication failed               <- red, no auto-dismiss
  [x]  Verification complete               <- blue
```

### Empty States

Every list/table has a designed empty state:
```
  (empty inbox icon)
  No documents yet
  Upload the first document to get started.
  [Upload Document]
```

### Loading States

- List/table: skeleton rows (shimmer animation)
- Cards: skeleton block
- Modal content: centred spinner
- Buttons: spinner + progressive text ("Uploading…")

### Error States

| Error | Display |
|---|---|
| API error | Red banner top of content, error code + human message |
| 401 | Redirect to `/login` + "Session expired" toast |
| 403 | Inline "You don't have permission" — never blank |
| 404 | Not found page with back navigation |

---

## 14. Role-Based UI Rules

### Action Availability

| Element | INVESTIGATOR | SENIOR_OFFICER | FORENSIC_OFFICER | ADMIN |
|---|---|---|---|---|
| + New Case | Y | — | — | Y |
| Upload Document | Y | — | — | — |
| Submit for Approval | Y (own docs) | — | — | — |
| Approve / Reject | — | Y | — | — |
| Sign Document | — | Y | — | — |
| Lock Document | — | Y | — | — |
| Share Document | Y (PUBLIC/INT) | Y | — | — |
| Register Evidence | Y | — | Y | — |
| Transfer Evidence | Y | — | Y | — |
| View Audit Log | Y | Y | Y | Y |
| Admin Panel | — | — | — | Y |
| Revoke Share | owner only | Y | — | Y |

### Classification Gating

| Classification | INVESTIGATOR | SENIOR_OFFICER | FORENSIC_OFFICER | ADMIN |
|---|---|---|---|---|
| PUBLIC | Full access | Full access | View only | View only |
| INTERNAL | Full access | Full access | View only | View only |
| CONFIDENTIAL | View + Edit own | View + Approve | View only | View only |
| HIGHLY_CONFIDENTIAL | View only (case-assigned) | View + Approve (case-assigned) | View only (case-assigned) | View only |

> These rules drive button visibility only. Backend enforces all permissions independently.

---

## 15. Document Lifecycle States

```
  DRAFT
    v  [Submit for Approval]  — INVESTIGATOR
  SUBMITTED
    v  (auto on reviewer open)
  UNDER_REVIEW
    v  [Approve]              — SENIOR_OFFICER
  APPROVED
    v  [Sign]                 — SENIOR_OFFICER
  SIGNED
    v  [Lock]                 — SENIOR_OFFICER
  LOCKED
    v  (admin/archival)
  ARCHIVED

  [Reject] at any review stage -> REJECTED
  REJECTED -> new version -> DRAFT
```

### Transition Guards

| Transition | Guard |
|---|---|
| Submit | status === 'DRAFT' AND actor is document owner |
| Approve/Reject | status is SUBMITTED or UNDER_REVIEW AND role is SENIOR_OFFICER |
| Sign | status === 'APPROVED' AND role === 'SENIOR_OFFICER' |
| Lock | status === 'SIGNED' AND role === 'SENIOR_OFFICER' |
| Create New Version | status === 'SIGNED' or 'LOCKED' |

---

## 16. Global Interaction Patterns

### Navigation
- Breadcrumb always shown: `Cases → FIR-1042 → Witness_Statement.pdf`
- Back button → parent route (not browser history)
- Deep links must work; redirect to login if unauthenticated

### Hash Display
- Monospace font, truncated `8 chars + ...` in tables
- Full 64-char in detail views
- Click to copy with clipboard toast

### Timestamps
- Display in local time: `"2026-08-30 11:10 IST"`
- Store/send as ISO 8601 UTC
- Relative time ("3 hours ago") on hover tooltip

### Confirmation Dialogs

| Action | Confirmation text |
|---|---|
| Lock document | "This will permanently lock the document. No further edits are possible." |
| Revoke share | "This will immediately revoke access for the recipient." |
| Sign document | "Signing will create a cryptographic record. This cannot be undone." |

### Pagination
- Default: 20 per page
- Display: "Showing 1–20 of 87 results"
- Controls: `<- Prev  1  2  3  ...  Next ->`
- Page size selector: 10 / 20 / 50

### Responsive
- MVP target: desktop-first (1280px+)
- Tablet 768–1024px: sidebar icon-only
- Mobile: out of MVP scope

---

## 17. Demo Flow UX Checklist

| Step | Screen | Key UI Element | Must Show |
|---|---|---|---|
| 1 | Login | Demo credential cards | Role badge in header after login |
| 2 | Cases | Case card | FIR-1042 with counts |
| 3 | Case > Documents | Upload modal | SHA-256 + Doc ID in success state |
| 4 | Document Details | Two-panel view | Metadata + hash visible |
| 5 | Document Details | Version history strip | v1 → v2 visible |
| 6 | Document Details | Submit button | Status changes to SUBMITTED |
| 7 | Login | Role switch | "SENIOR_OFFICER" role pill |
| 8 | Document Details | Approve button | Status → APPROVED |
| 9 | Document Details | Sign + Lock buttons | SIGNED + LOCKED badges |
| 10 | Blockchain Modal | TX reference | TX-839201 displayed |
| 11 | Share Modal | Share form | Recipient + expiry |
| 12 | Shared With Me | Shared doc card | Doc visible to Forensic Officer |
| 13 | Evidence Timeline | Custody chain | Transfer event visible |
| 14 | Verification Modal | VERIFIED state | Green result + matching hashes |
| 15 CLIMAX | Verification Modal | TAMPERING DETECTED | Red pulsing result + hash diff |

> Step 15 must have the strongest visual impact in the entire application:
> red glow, shake animation, contrasting hash display — unmistakable and dramatic.

---

_End of SLIDMS UX Specification v1.0_
