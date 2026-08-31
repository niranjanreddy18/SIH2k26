import axios, { type AxiosError } from "axios";

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL — backend uses HttpOnly cookie for refresh token
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 with silent refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (error?.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const accessToken = data?.data?.accessToken as string;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("accessToken", accessToken);
        }
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
      } catch {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("accessToken");
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

/** All backend responses use { success, data, message }. */
export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };
export type Paginated<T> = { items: T[]; page: number; limit: number; total: number };

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url, { params });
  return res.data.data;
}

export async function post<T>(url: string, body?: unknown, isForm = false): Promise<T> {
  const res = await api.post<ApiEnvelope<T>>(
    url,
    body,
    isForm ? { headers: { "Content-Type": "multipart/form-data" } } : undefined,
  );
  return res.data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await api.delete<ApiEnvelope<T>>(url);
  return res.data.data;
}

/** Absolute URL for binary endpoints (download/preview) used with <a> / <iframe>. */
export function fileUrl(path: string) {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("accessToken") : null;
  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE_URL}${path}${token ? `${separator}token=${encodeURIComponent(token)}` : ""}`;
}

/** Returns true when the request never reached the backend (network/CORS/unreachable). */
export function isBackendUnreachable(error: unknown): boolean {
  const axiosError = error as AxiosError | undefined;
  if (!axiosError) return false;
  if (axiosError.code && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(axiosError.code))
    return true;
  if (axiosError.message?.toLowerCase().includes("network error")) return true;
  return !axiosError.response;
}

/**
 * Calls the live backend first. If the backend is unreachable (demo / offline
 * environment) the spec-accurate demo fixtures are returned instead. If the
 * backend responds with an error (4xx/5xx), the error is thrown so the UI can
 * surface it.
 */
export async function withFallback<T>(
  request: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; demo: boolean }> {
  try {
    return { data: await request(), demo: false };
  } catch (error) {
    if (isBackendUnreachable(error)) {
      return { data: fallback, demo: true };
    }
    throw error;
  }
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  const e = error as { response?: { data?: { message?: string; error?: string } } };
  return e?.response?.data?.message || e?.response?.data?.error || fallback;
}
