# SLIDMS Frontend — Secure Legal & Investigation Document Management System

Frontend only. Every screen calls your existing backend at `http://localhost:5000` (override with `VITE_API_BASE_URL`), and falls back to realistic demo data from the spec when the API is unreachable, so the app always looks complete for judges.

## Design system

Dark navy command-center theme, defined once as semantic tokens:

- Backgrounds `#050B16 / #07111F / #0A1424`, surfaces `#0B1626 / #0E1B2D`, glass panels with 1px translucent blue borders and light backdrop blur.
- Primary blue `#3B82F6`, bright `#2563EB`, verified `#10B981`, pending `#F59E0B`, danger `#EF4444`, signed `#A78BFA`, blockchain `#818CF8`.
- Text `#F8FAFC / #94A3B8 / #64748B`. Radii 10–14px. Restrained glows, `fade-in` / `slide-up` micro-animations only.
- Inter for UI, JetBrains Mono for FIR numbers, hashes, tx IDs, versions, timestamps. Lucide icons only, no emoji.
- Badge system for roles (Investigator blue, Senior Officer purple, Forensic green, Admin red), classification (Public slate, Internal blue, Confidential amber, Highly Confidential red with pulsing edge), and document status (Draft, Submitted, Under Review, Approved, Rejected, Signed, Locked+padlock).

## App shell

Persistent 240px sidebar (SLIDMS shield mark, nav with blue glowing active state, Dashboard / Cases / Documents / Evidence / Audit Trail / My Approvals / Reports / Users / Settings, Admin Directorate only for ADMIN, profile + logout pinned bottom) plus a compact top header (page title/subtitle, global search, notification bell, avatar with name and role badge). Sidebar collapses into a drawer below tablet; tables scroll horizontally instead of reflowing.

## Screens

| Path | Screen |
| --- | --- |
| `/login` | Split screen: dark Indian government architecture visual with Ashoka-style emblem, SLIDMS title, "Secure. Traceable. Trusted."; glass login card with email, password reveal, forgot password, Sign In, and four compact demo persona shortcuts |
| `/dashboard` | Greeting, four metric cards (Active Cases 24, Pending Reviews 07, Total Documents 1,248, Locked/Signed 532), My Active Cases table + Recent Activity feed, bottom status strip (System Security, Blockchain Network, Last Login) |
| `/cases` | Search, status + classification + more filters, New Case dialog, dense case table with FIR number, title, officer, status, classification, counts, updated |
| `/cases/:id` | Breadcrumb, case header with badges and assigned officers, tabs: Overview (metadata + security summary + counts), Documents (densest table), Evidence, Timeline, Audit, Access |
| `/documents` | Command center with search + case/status/classification/type filters, Upload Document dialog, table with per-row icon actions: Verify, Preview, Blockchain, Audit, Versions, New Version, Download, Share |
| `/documents/:id` | Three columns: Document Info, bright PDF preview iframe with zoom/page/download toolbar, Integrity & Security (SHA-256, status, blockchain tx, verified timestamp, signed by). Top actions Download / Verify Hash / More. Workflow actions (Submit, Approve, Reject, Sign, Lock) gated by role and state; locked disables editing |
| `/evidence` + case tab | Evidence register with status chips, custody timeline, transfer dialog |
| `/audit` | Chain integrity banner (CHAIN INTACT / CHAIN BROKEN with broken event), search + filters + Verify Chain, dense table: Time, User, Action, Target, Result, IP |
| `/shared` | Shared documents with expiry countdown, permissions, shared by, Active/Revoked/Expired status, view/download, revoke |
| `/admin` | ADMIN-only directorate console: User Directory (role, department, status, failed logins, locked until, created, Unlock, Change Role, Create User) and Master Audit Log tab |
| `/profile` | Officer details, change password, active sessions security cards |
| `/approvals`, `/reports`, `/users`, `/settings` | Consistent working screens so every sidebar item resolves |

Verification moment gets a focused modal: large green shield, `DOCUMENT VERIFIED`, matching SHA-256 hashes, blockchain reference, timestamp — or a pulsing red alert on MISMATCH.

## Technical notes

- `src/services/api.ts`: the exact Axios instance from the spec — `withCredentials: true`, bearer token from `localStorage.accessToken`, single-retry silent refresh via `POST /auth/refresh` on 401, redirect to `/login` on failure.
- Typed service modules per domain (auth, cases, documents, evidence, shares, audit, blockchain, admin, users) covering every endpoint and enum in the spec, unwrapping the `{ success, data }` / `{ items, page, limit, total }` envelopes.
- Auth via React Context (`user`, `accessToken`, `login`, `logout`, `loading`) hydrated from `GET /auth/me`; role helpers gate Senior Officer / Admin actions.
- Routing uses TanStack Router (fixed for this project) with all spec paths unchanged; authenticated routes sit under a guarded layout that redirects to `/login`, and `/admin` additionally requires ADMIN.
- Data fetching through TanStack Query; each query falls back to spec-accurate demo fixtures when the request fails, with a small "Demo data" indicator so nothing looks broken offline.
- `.env` documents `VITE_API_BASE_URL`; Inter + JetBrains Mono loaded via a `<link>` in the root route head; per-route SEO metadata.
