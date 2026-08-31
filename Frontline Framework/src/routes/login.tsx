import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import govBuilding from "@/assets/login-hero.jpg";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/slidms/ThemeToggle";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Officer Sign In — SLIDMS Secure Access" },
      {
        name: "description",
        content:
          "Authorised access portal for SLIDMS, the secure legal and investigation document management system for Indian law enforcement.",
      },
      { property: "og:title", content: "Officer Sign In — SLIDMS Secure Access" },
      {
        property: "og:description",
        content: "Secure. Traceable. Trusted. Authorised government personnel only.",
      },
    ],
  }),
  component: LoginPage,
});

const PERSONAS = [
  { label: "Investigator", email: "investigator@police.gov.in" },
  { label: "Senior Officer", email: "senior@police.gov.in" },
  { label: "Forensic Officer", email: "forensic@lab.gov.in" },
  { label: "Admin", email: "admin@slidms.gov.in" },
];

function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("investigator@police.gov.in");
  const [password, setPassword] = useState("Password123!");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Secure session established");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 423
          ? "Account locked. Contact the administrator."
          : errorMessage(error, "Invalid credentials."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background-deep lg:grid-cols-[1.1fr_minmax(420px,0.9fr)]">
      {/* Left visual area */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={govBuilding}
          alt="Secure evidence archive corridor with fingerprint hologram"
          width={1024}
          height={1280}
          className="absolute inset-0 size-full object-cover opacity-70"
        />
<div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, color-mix(in srgb, var(--background-deep) 94%, transparent) 10%, color-mix(in srgb, var(--background) 84%, transparent) 45%, color-mix(in srgb, var(--background-raised) 66%, transparent) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 380px at 20% 25%, color-mix(in srgb, var(--primary) 26%, transparent), transparent 70%), radial-gradient(600px 340px at 70% 85%, color-mix(in srgb, var(--chain) 22%, transparent), transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-primary/60 to-transparent"
        />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-primary/18 to-transparent"
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="animate-fade-in flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border border-primary/40 bg-primary/12 text-primary glow-primary">
              <Landmark className="size-6" />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                Government of India
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">
                सत्यमेव जयते · Ministry of Home Affairs
              </p>
            </div>
          </div>

          <div className="animate-slide-up max-w-xl">
            <h1 className="text-6xl font-bold tracking-[0.16em] text-foreground">SLIDMS</h1>
            <p className="mt-4 text-lg font-medium text-foreground/90">
              Secure Legal &amp; Investigation Document Management System
            </p>
            <p className="mono mt-6 text-sm uppercase tracking-[0.28em] text-primary">
              Secure. Traceable. Trusted.
            </p>
            <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: "SHA-256 integrity" },
                { icon: Fingerprint, label: "Immutable audit chain" },
                { icon: Lock, label: "Role-based access" },
              ].map((f) => (
                <div key={f.label} className="glass-panel flex items-center gap-2 px-3 py-2.5">
                  <f.icon className="size-4 shrink-0 text-primary" />
                  <span className="text-[11px] font-medium text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] uppercase tracking-[0.2em] text-subtle">
            Smart India Hackathon 2026 · Restricted Government System
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="relative flex items-center justify-center px-5 py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(520px 320px at 60% 15%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 70%), radial-gradient(460px 300px at 20% 95%, color-mix(in srgb, var(--chain) 14%, transparent), transparent 72%)",
          }}
        />
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="glass-panel animate-slide-up relative w-full max-w-sm p-7">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent"
          />
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-sm font-semibold tracking-[0.18em] text-foreground">SLIDMS</p>
          </div>

          <h2 className="text-xl font-semibold text-foreground">Welcome Back</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in with your departmental credentials to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Official Email
              </span>
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@police.gov.in"
                  className="h-10 w-full rounded-lg border border-input bg-background-raised pl-9 pr-3 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </span>
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="h-10 w-full rounded-lg border border-input bg-background-raised pl-9 pr-10 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle transition-colors hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => toast.info("Contact your department administrator to reset access.")}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="glow-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-bright text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {submitting ? "Authenticating" : "Sign In"}
            </button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-subtle">
            <ShieldCheck className="size-3.5 text-verified" />
            Secure access. All activity is audited.
          </p>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Demo personas
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => {
                    setEmail(p.email);
                    setPassword("Password123!");
                  }}
                  className="rounded-lg border border-border bg-background-raised px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
