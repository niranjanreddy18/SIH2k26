# SLIDMS — Implementation Fixes & Improvements

> Generated from a full-codebase audit on 2026-08-30 (backend, frontend, blockchain layers reviewed in full).
> Organized by priority. Each item lists the affected file(s), the concrete problem, and the fix.

---

## Tier 0 — Before any demo (cheap, high visibility) — ✅ DONE 2026-08-30

### 0.1 Dead "Blockchain" sidebar tab renders blank — ✅ FIXED
- **File:** `frontend/src/components/Sidebar.tsx`
- **Fix applied:** Removed the dead `{ id: 'blockchain', ... }` nav item and the now-unused `Link2` icon import. The ledger is still reachable per-document via `BlockchainLedgerModal`. (Building a standalone cross-case ledger page was left out of scope — would need a new `GET /blockchain/records` list endpoint; see Tier 1/2 if wanted later.)

### 0.2 False security claim in Admin UI — ✅ FIXED
- **File:** `frontend/src/pages/AdminPage.tsx` (Security Policies tab)
- **Fix applied:** Changed the "Session Token Storage" card from the false "Memory-Only (Zero LocalStorage)" claim to an accurate description: "Access Token (LocalStorage) + Refresh Token (HTTP-Only Cookie)", with updated description text about refresh-token rotation.

### 0.3 `/documents/:id/tamper-demo` has no role gate — ✅ FIXED
- **File:** `backend/src/routes/documents.routes.ts`
- **Fix applied:** Rather than a blanket `requireRole('SENIOR_OFFICER')` (which would have broken the flagship demo script — Scenario 1 explicitly runs the tamper demo as **INVESTIGATOR**), added a case-assignment check: any non-ADMIN caller must be listed in `case_assignments` for the document's case, else 403. This closes the "any authenticated user can tamper any case's documents" gap while preserving the documented Investigator demo flow (seed data assigns the Investigator + Senior Officer to case C1, which owns the seeded demo document). Both backend and frontend `tsc --noEmit` pass clean after this change.

---

## Tier 1 — Worth doing before judging (visible polish + one real security fix) — ✅ DONE 2026-08-30

### 1.1 No toast/notification system — 17 raw `alert()` calls — ✅ FIXED
- **Files:** `CaseDetailPage.tsx` (x2), `AdminPage.tsx` (x5), `AuditPage.tsx`, `SharedPage.tsx` (x2), `NewCaseModal.tsx`, `DocumentUploadModal.tsx`, `EvidenceModal.tsx`, `ShareModal.tsx`, `EvidenceTimelineModal.tsx`, `VerificationModal.tsx` (x2). Plus native `confirm()` in `SharedPage.tsx` and `VerificationModal.tsx`.
- **Fix applied:** Added `frontend/src/context/ToastContext.tsx` (`ToastProvider` + `useToast()`, styled per the UX spec's success/danger/warning/info tokens, auto-dismiss after 5s) and `frontend/src/context/ConfirmContext.tsx` (`ConfirmProvider` + `useConfirm()`, a promise-based modal replacing native `confirm()`, matches the existing `NewCaseModal` visual pattern). Both wired into `main.tsx`. Every `alert()` replaced with `toast.success()`/`toast.error()`; both `confirm()` calls replaced with `await confirm({...})`.

### 1.2 Silent fetch failures — no user feedback at all — ✅ FIXED
- **Files:** `DashboardPage.tsx`, `CasesPage.tsx`, `CaseDetailPage.tsx`, `AuditPage.tsx`, `AdminPage.tsx`, `EvidenceTimelineModal.tsx`, `BlockchainLedgerModal.tsx`, `SharedPage.tsx`.
- **Fix applied:** Added a `loadError` state to each; on fetch failure it now renders an inline danger-styled banner with a "Retry" button that re-triggers the fetch (`AdminPage.tsx` uses toast instead, since it's admin-only and secondary to the core demo flows).

### 1.3 Fabric peer containers crash on start — network never comes up — ✅ FIXED & VERIFIED
- **File:** `blockchain/network/docker-compose.yaml`
- **Fix applied:** Added `- ../config/core.yaml:/etc/hyperledger/fabric/core.yaml` to all three peer services' volume mounts. **Verified live**: recreated the three peer containers against the running network — all three now start cleanly ("Started peer with ID=... Starting peer with Gateway enabled") and stay up, instead of crash-looping on `Config File "core" Not Found`.
- **Not done (separate, larger task):** the channel was not joined and chaincode was not installed/committed in this pass — the peers merely start correctly now. Ask explicitly if you want the full live 3-org Fabric ledger stood up for the demo; until then the backend still runs on the Postgres fallback, which is fully functional.

### 1.4 Dead code: `backend/src/db/store.ts` — ✅ FIXED
- Confirmed zero imports via grep, then deleted the file.

### 1.5 Hardcoded demo data baked into frontend components — ✅ FIXED
- **`ShareModal.tsx`, `EvidenceTimelineModal.tsx`:** Added a new `GET /users` backend endpoint (`backend/src/routes/users.routes.ts`, authenticated-only, returns id/name/role/department — not ADMIN-gated like `/admin/users` since non-admin officers need it for recipient pickers). Both modals now fetch the real officer directory and populate their recipient `<select>` dynamically, excluding the current user.
- **`AuditPage.tsx`:** Replaced the hardcoded fallback UUID with role-aware logic: ADMIN sees `/admin/audit` (system-wide log); other roles fetch their most recent case via `/cases?limit=1` and see that case's audit trail via `/cases/:id/audit` — no more hardcoded seed-data UUID.

---

## Tier 2 — Real security gaps — ✅ DONE 2026-08-30

### 2.1 No classification-tier or case-assignment enforcement — ✅ FIXED
- **Files:** `backend/src/utils/access.ts` (new), `cases.routes.ts`, `documents.routes.ts`, `evidence.routes.ts`
- **Fix applied:** Added `hasCaseAccess(caseId, user)` — true for ADMIN, the case's creator, or anyone in `case_assignments` for it. Applied to the *write/mutate* paths only: `PATCH /cases/:id`, `POST /cases/:caseId/documents` (upload), `POST /cases/:caseId/evidence` (register), and refactored the existing tamper-demo check (Tier 0.3) to use the same helper instead of its own inline copy.
- **Deliberate scope decision:** read paths (`GET /cases`, `GET /cases/:id`, case-scoped document/evidence lists) were left open on purpose. Restricting reads to assignees would have 403'd the FORENSIC_OFFICER persona out of every case in the seed data (they're never added to `case_assignments`), breaking case-browsing for that role with no upside — the real risk was always unauthorized *writes* (a stranger uploading into your case, changing its status, or registering evidence against it), which is what's now blocked. Classification-tier-based clearance (vs. assignment-based) was not implemented — there's no per-user clearance field in the schema, and adding one was out of scope for this pass.
- **Verified via curl** across all four demo personas: FORENSIC_OFFICER blocked (403) from uploading/registering-evidence/PATCHing case C1 (not assigned, not creator); INVESTIGATOR allowed into C2 (case creator, no formal assignment row — confirms the creator fallback works); ADMIN always allowed; SENIOR_OFFICER (assigned to C1) allowed to PATCH it.

### 2.2 Evidence custody transfer has no "current holder" check — ✅ FIXED
- **File:** `backend/src/routes/evidence.routes.ts`
- **Fix applied:** `POST /evidence/:id/transfer` now resolves the current holder (latest custody event's `to_user_id`, or `collected_by` if it's never been transferred) and rejects with 403 unless the requester *is* that holder, or is ADMIN/SENIOR_OFFICER.
- **Verified via curl**: a non-holder (Forensic officer) blocked; the actual holder (Investigator, who registered it) allowed; Admin override allowed.

### 2.3 Share creation has no ownership check — ✅ FIXED
- **File:** `backend/src/routes/share.routes.ts`
- **Fix applied:** `POST /documents/:id/share` now requires the requester be the document's uploader (`documents.created_by`) or have case access via the same `hasCaseAccess` helper, else 403.
- **Verified via curl**: a non-uploader/non-assignee (Forensic officer) blocked from sharing the seeded witness statement; the actual uploader (Investigator) allowed.

### 2.4 JWT secret handling is inconsistent and unsafe by default — ✅ FIXED
- **Files:** `backend/src/middlewares/auth.ts`, `backend/src/server.ts`
- **Fix applied:** Removed the hardcoded fallback secret from `auth.ts` (now `process.env.JWT_SECRET!` like `auth.routes.ts` already did). Added `validateEnv()` in `server.ts`, called first thing in `startServer()`, which checks `JWT_SECRET` and `JWT_REFRESH_SECRET` are both set and at least 16 characters — `process.exit(1)` with a clear message if not, before migrations/seed/listen even run.
- **Verified**: backend restarted clean with the real `.env` secrets present; login still works.

### 2.5 Error handler leaks raw internal messages — ✅ FIXED
- **File:** `backend/src/middlewares/errorHandler.ts`
- **Fix applied:** The generic-fallback branch now returns a fixed "An unexpected internal server error occurred." message when `NODE_ENV === 'production'`, and only includes `err.message` in non-production. The full error is still always `console.error`'d server-side either way.

---

## Tier 3 — Code quality — ✅ DONE 2026-08-30

### 3.1 Duplicated pagination/filter boilerplate — ✅ FIXED
- **Files:** `backend/src/utils/pagination.ts` (new), `cases.routes.ts`, `documents.routes.ts`, `evidence.routes.ts`, `audit.routes.ts`, `admin.routes.ts`, `share.routes.ts`
- **Fix applied:** Added `parsePagination(req, defaultLimit = 50): { page, limit, offset }` (clamps page ≥1, limit to [1,200]) and replaced all 9 inline copies across 6 route files with a single call each.
- **Verified via curl**: `GET /cases?page=1&limit=2` still returns the correct page/limit/total shape.

### 3.2 Duplicated blockchain hash-chaining logic — ✅ FIXED
- **Files:** `backend/src/services/ledger.service.ts` (new), `documents.routes.ts`, `blockchain.routes.ts`
- **Fix applied:** Extracted `appendBlockchainRecord(client, refType, refId, action, hash, txReference?)` into a shared service (using the `SELECT ... FOR UPDATE` row-locked variant for correctness under concurrent writers). `documents.routes.ts`'s local copy was deleted; `blockchain.routes.ts`'s two near-identical inline `BEGIN/SELECT/INSERT/COMMIT` blocks in `POST /register` were both replaced with calls to the shared function (the optional `txReference` param preserves its original behavior of using a real Fabric tx id when available).
- **Verified via curl**: `POST /blockchain/register` still creates a correctly hash-chained record end-to-end.

### 3.3 Dead/no-op frontend code — ✅ FIXED
- **`CasesPage.tsx`** — the no-op debounce was already removed as a side effect of the Tier 1.2 error-handling pass; confirmed still clean.
- **`Header.tsx`** — removed the non-functional notification bell button (and its now-unused `Bell` icon import) rather than build a real notifications feature out of scope.
- **`tailwind.config.js`** — deleted the unused `police` color palette left over from the pre-redesign light theme.
- **`CaseDetailPage.tsx` "Access" tab — fully implemented** (not just cleaned up): added `GET /cases/:id/shares` (`share.routes.ts`) returning every share grant for documents in a case — document, recipient, creator, permissions, expiry, and a computed `ACTIVE`/`EXPIRED`/`REVOKED` status. The tab now renders a real table wired to this endpoint, with a working **Revoke** button (shown only when the viewer is the share's creator or an Admin) that reuses the existing `useConfirm()`/`useToast()` patterns.
- **Verified live in browser**: shared a document, opened its case's Access tab, saw the real share row, clicked Revoke → confirm dialog → toast → row flipped to `REVOKED` and the button disappeared. Zero console errors across a full regression pass.

---

## Tier 4 — Not started (mentioned in PROJECT_STATUS.md as future work, out of scope unless requested)

- MFA/TOTP enforcement (field exists, zero logic — login flow has no MFA step)
- Real MinIO/S3 storage (currently local filesystem)
- File preview (inline PDF/image viewer)
- Real PKI digital signatures (currently records a signature event without cryptographic signing)
- WebSocket real-time updates
- Dashboard charts
- Rate limiting middleware
- Full-text document search

---

## Suggested order of attack

1. Tier 0 (three items, ~30 min total) — do these regardless of anything else.
2. Tier 1.1 + 1.2 (toast system + error states) — biggest visible improvement for demo polish.
3. Tier 1.4 + 1.5 (delete dead code, remove hardcoded demo data) — quick, removes embarrassing fragility.
4. Tier 1.3 (Fabric network fix) — only if you want a live Fabric demo instead of relying on fallback.
5. Tier 2 — only if there's time left and you want the security story to hold up under scrutiny, not just look good on the surface.
6. Tier 3 — opportunistic cleanup, no deadline pressure.
