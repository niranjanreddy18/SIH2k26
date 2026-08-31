import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <span className="grid size-12 place-items-center rounded-2xl border border-primary/40 bg-primary/12 text-primary glow-primary">
          <ShieldCheck className="size-6 animate-pulse" />
        </span>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Establishing secure session
        </p>
      </div>
    );
  }

  return <Outlet />;
}
