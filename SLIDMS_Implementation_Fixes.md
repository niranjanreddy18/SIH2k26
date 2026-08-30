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

## Tier 2 — Real security gaps (do before any non-demo use, good to mention as "known limitations" if not fixed)

### 2.1 No classification-tier or case-assignment enforcement
- **Files:** `backend/src/routes/cases.routes.ts`, `documents.routes.ts`, `evidence.routes.ts`
- **Problem:** `classification_tier` is stored but never checked against the requesting user's role/clearance on any read path. `case_assignments` is written on case creation but never queried to restrict access — any authenticated user can read/update any case regardless of assignment.
- **Fix:** Add an authorization middleware/helper, e.g. `requireCaseAccess(caseId, user)`, that checks: (a) user is ADMIN, or (b) user is in `case_assignments` for that case, or (c) document/case classification ≤ user's clearance level (would need a clearance field on `users`, doesn't exist yet — simplest first step is assignment-based access only). Apply to `GET/PATCH /cases/:id`, document routes scoped to a case, and evidence routes scoped to a case.

### 2.2 Evidence custody transfer has no "current holder" check
- **File:** `backend/src/routes/evidence.routes.ts`
- **Problem:** Any authenticated user can transfer any evidence item to anyone — should be restricted to the current custodian (or ADMIN/SENIOR_OFFICER as an override).
- **Fix:** Before creating a transfer event, look up the most recent custody event's `to_user_id` and compare to `req.user.id`; reject with 403 if mismatched and requester isn't ADMIN/SENIOR_OFFICER.

### 2.3 Share creation has no ownership check
- **File:** `backend/src/routes/share.routes.ts`
- **Problem:** Any authenticated user can share any document version to any recipient, not just the document's creator/case-assignee.
- **Fix:** Check the requester is either the document's uploader, assigned to the case, or ADMIN before allowing `POST /documents/:id/share`.

### 2.4 JWT secret handling is inconsistent and unsafe by default
- **Files:** `backend/src/middlewares/auth.ts` (hardcoded fallback secret `'slidms_super_secret_jwt_key_2026_x8923'`), `backend/src/routes/auth.routes.ts` (`process.env.JWT_SECRET!`, no fallback, throws at runtime if unset)
- **Problem:** If deployed without `JWT_SECRET` set, one file silently uses a known hardcoded secret (forgeable tokens), the other crashes on first login. Neither fails fast at boot.
- **Fix:** In `server.ts` startup, validate `process.env.JWT_SECRET` is set (and reasonably long) and `process.exit(1)` with a clear error if missing — remove the hardcoded fallback from `auth.ts` entirely so there's one source of truth and no silent-insecure-default path.

### 2.5 Error handler leaks raw internal messages
- **File:** `backend/src/middlewares/errorHandler.ts`
- **Problem:** Uncaught exceptions return `err.message` directly to the client (e.g. raw Postgres errors), which can leak schema/internal details.
- **Fix:** Log the full error server-side; return a generic message to the client in production (`NODE_ENV === 'production'` check), keep detailed messages only in dev.

---

## Tier 3 — Code quality (no user-facing impact, do opportunistically)

### 3.1 Duplicated pagination/filter boilerplate
- **Files:** `cases.routes.ts`, `documents.routes.ts`, `evidence.routes.ts`, `audit.routes.ts`, `admin.routes.ts`
- **Fix:** Extract a shared helper in `backend/src/utils/` — e.g. `parsePagination(req): { page, limit, offset }` and a small query-builder helper for the repeated count-then-select pattern.

### 3.2 Duplicated blockchain hash-chaining logic
- **Files:** `documents.routes.ts` (`appendBlockchainRecord`, chains off `hash`), `blockchain.routes.ts` (near-identical inline reimplementation)
- **Fix:** Consolidate into a single exported function in `blockchain.routes.ts` or a new `backend/src/services/ledger.service.ts`, imported by both.

### 3.3 Dead/no-op frontend code
- **Files:**
  - `CasesPage.tsx` — debounce `setTimeout(() => {}, 300)` is a no-op (empty body); filtering already happens synchronously. Remove the dead debounce ref entirely, or actually implement server-side search debouncing if `?q=` filtering should hit the API instead of filtering client-side.
  - `Header.tsx` — notification bell button has no `onClick`. Either wire it to a real notifications feature (out of scope pre-demo) or remove the button so it doesn't look broken.
  - `tailwind.config.js` — leftover unused `police` color palette from the pre-redesign light theme. Safe to delete.
  - `CaseDetailPage.tsx` — "Access" tab is a placeholder with an unused `shares` state variable and no fetch. Either implement it (`GET /documents/shared-with-me` filtered by case, or a new case-scoped shares endpoint) or remove the tab until it's built.

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
