# Connect SLIDMS Backend — Final Steps

## Goal
Make your locally-running backend (`http://localhost:5000`) serve real data to the SLIDMS frontend by configuring CORS, cookies, and confirming endpoint behavior.

## Verified frontend assumptions
- Base URL: `http://localhost:5000` (override with `VITE_API_BASE_URL`)
- Response envelope: `{ success, data, message }`
- Auth: JWT access token returned in login response body + refresh token as `HttpOnly` cookie
- Endpoint paths: identical to `src/services/slidms.ts`

## Backend checklist

### 1. CORS configuration
Allow the frontend origins and credentials. Example Express middleware:

```js
const allowedOrigins = [
  "http://localhost:8080",
  "https://id-preview--72d75bf9-23c9-4723-8700-529fe94b473c.lovable.app",
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));
```

### 2. Refresh-token cookie
When logging in, set the refresh token cookie with these attributes:
- `HttpOnly`
- `Path=/`
- `SameSite=Lax` for local dev, or `SameSite=None; Secure` for preview/published cross-origin

### 3. Response envelope
Ensure every endpoint returns:

```json
{ "success": true, "data": { ... }, "message": "..." }
```

### 4. Required endpoints to implement first
At minimum, implement these so the header badge shows "Live" and the login flow works:
- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

## Verification steps

1. Start your backend on `http://localhost:5000`.
2. Open the frontend preview and look at the header badge:
   - **Live** = backend reachable
   - **Retry connection** = backend unreachable or CORS blocked
3. Open browser DevTools → Network tab and check the `/health` request.
4. Log in with any credentials. If login fails, check the `/auth/login` response in DevTools.
5. Navigate to Cases, Documents, and Audit to confirm real data loads.

## If you hit errors

- **CORS error**: `Access-Control-Allow-Origin` must be the exact frontend origin, not `*`, and `Access-Control-Allow-Credentials: true` must be present.
- **401 after refresh**: `/auth/refresh` must return `{ success: true, data: { accessToken: "..." } }`.
- **Demo data still showing**: Header badge shows **Retry connection**; backend is not reachable from the preview.
- **Wrong shape error**: Share the exact JSON your backend returns and I will adjust the parser.

## Out of scope
- Adding new screens or UI features.
- Changing backend endpoint paths or auth mechanism.
