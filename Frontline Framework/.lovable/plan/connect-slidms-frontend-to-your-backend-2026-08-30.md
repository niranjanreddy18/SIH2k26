# Connect SLIDMS Frontend to Your Backend

## Goal
Wire the existing SLIDMS frontend to your locally-running backend (`http://localhost:5000`) so all auth, cases, documents, evidence, audit, and admin flows call real endpoints instead of mock fixtures.

## Current State (verified)
- `src/services/api.ts` already targets `http://localhost:5000` via `VITE_API_BASE_URL`.
- Auth flow matches your backend: access token in `localStorage`, refresh token as `HttpOnly` cookie, `withCredentials: true`.
- Response envelope `{ success, data, message }` is already expected and parsed.
- `src/services/slidms.ts` endpoint paths already match your backend route design.
- Mock fallback is currently swallowing errors and returning demo data, which hides real backend failures.

## Plan Steps

### 1. Make backend connectivity visible and debuggable
- Add a small `/health` ping on app boot (in `AuthProvider` or `__root.tsx`) and surface a "Backend connected / Demo mode" badge in the `AppShell` header.
- Stop silently falling back to mocks when the backend is reachable but returns an error. Only use mock data when the backend is genuinely unreachable (network failure), not for 4xx/5xx responses.

### 2. CORS and cookie configuration
- Document the required backend CORS setup for `http://localhost:8080` (Vite dev) and the preview/published origins:
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin: <frontend-origin>` (not `*` when credentials are used)
  - Allowed methods: `GET, POST, PATCH, DELETE, OPTIONS`
  - Allowed headers: `Authorization, Content-Type`
- Confirm the backend refresh cookie is sent with `SameSite=None; Secure` for cross-origin preview/published use, or `SameSite=Lax` for local dev.

### 3. Environment variable support
- Ensure `VITE_API_BASE_URL` can override the default `http://localhost:5000` without editing code.
- Add a short `.env.example` file showing the variable.

### 4. Harden the API client for real backend behavior
- Preserve the existing request/response interceptors.
- Make `withFallback` distinguish between "backend unreachable" (use mock) and "backend returned an error" (surface error).
- Add a global toast/error handler so failed mutations show the backend `message`.

### 5. End-to-end integration verification
Test these flows against the real backend:
1. Login → token stored → `/auth/me` returns current user.
2. Silent refresh on 401 → `/auth/refresh` returns new access token.
3. Logout → token cleared → cookie cleared.
4. Cases list → create case → case detail → assignments.
5. Document upload → version → submit → approve → sign → lock.
6. Evidence registration → custody transfer → timeline.
7. Audit trail and chain verification.
8. Admin user list → create → role change → unlock.

### 6. Clean up demo mode
- Keep the mock fallback as an offline/demo switch, but make it explicit:
  - Show a persistent "Demo data — backend unreachable" banner when `demo === true`.
  - Add a "Retry connection" button that re-pings `/health`.

## Deliverables
- Updated `src/services/api.ts` with smarter fallback and error surfacing.
- Updated `AuthContext` with backend connectivity detection.
- Updated `AppShell` header with connection/demo status badge.
- `.env.example` documenting `VITE_API_BASE_URL`.
- Verified end-to-end against `http://localhost:5000`.

## Out of Scope
- Changing backend endpoint paths or auth mechanism (already aligned).
- Adding new screens or UI features.
