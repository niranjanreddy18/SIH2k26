import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authService, healthService } from "@/services/slidms";
import { isBackendUnreachable } from "@/services/api";
import { DEMO_USERS, MOCK_USER } from "@/lib/slidms/mock";
import type { Role, User } from "@/lib/slidms/types";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  demo: boolean;
  connected: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isReviewer: boolean;
  isAdmin: boolean;
  checkConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "accessToken";
const DEMO_USER_KEY = "slidms.demoUser";

function personaFor(email: string): User {
  const key = email.split("@")[0]?.toLowerCase() ?? "";
  if (key.includes("admin")) return DEMO_USERS["admin"]!;
  if (key.includes("senior")) return DEMO_USERS["senior"]!;
  if (key.includes("forensic")) return DEMO_USERS["forensic"]!;
  return MOCK_USER;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      await healthService.check();
      setConnected(true);
      return true;
    } catch (error) {
      const unreachable = isBackendUnreachable(error);
      setConnected(unreachable ? false : true);
      return unreachable ? false : true;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    setAccessToken(token);

    (async () => {
      try {
        const [me] = await Promise.all([authService.me(), healthService.check()]);
        if (!cancelled) {
          setUser(me);
          setDemo(false);
          setConnected(true);
          window.localStorage.removeItem(DEMO_USER_KEY);
        }
      } catch (error) {
        if (isBackendUnreachable(error)) {
          // Backend unreachable (offline demo) — restore the persona so the
          // authenticated shell still renders for the presentation.
          const stored = window.localStorage.getItem(DEMO_USER_KEY);
          if (!cancelled) {
            setUser(stored ? (JSON.parse(stored) as User) : MOCK_USER);
            setDemo(true);
            setConnected(false);
          }
        } else {
          // Backend rejected the session — clear it and stop loading.
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(DEMO_USER_KEY);
          if (!cancelled) {
            setAccessToken(null);
            setUser(null);
            setDemo(false);
            setConnected(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await authService.login(email, password);
      window.localStorage.setItem(TOKEN_KEY, data.accessToken);
      window.localStorage.removeItem(DEMO_USER_KEY);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setDemo(false);
      setConnected(true);
    } catch (error) {
      if (!isBackendUnreachable(error)) {
        throw error; // real backend rejection — surface it
      }
      const persona = personaFor(email);
      window.localStorage.setItem(TOKEN_KEY, "demo-access-token");
      window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(persona));
      setAccessToken("demo-access-token");
      setUser(persona);
      setDemo(true);
      setConnected(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* offline demo — clear locally anyway */
    }
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(DEMO_USER_KEY);
    setAccessToken(null);
    setUser(null);
    setDemo(false);
    setConnected(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...roles: Role[]) => (user ? roles.includes(user.role) : false);
    return {
      user,
      accessToken,
      loading,
      demo,
      connected,
      login,
      logout,
      hasRole,
      isReviewer: hasRole("SENIOR_OFFICER", "ADMIN"),
      isAdmin: hasRole("ADMIN"),
      checkConnection,
    };
  }, [user, accessToken, loading, demo, connected, login, logout, checkConnection]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
