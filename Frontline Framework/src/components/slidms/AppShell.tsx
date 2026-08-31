import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  Bell,
  Building2,
  ChevronDown,
  FileStack,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  ScrollText,
  Search,
  PlugZap,
  Settings,
  ShieldCheck,
  Share2,
  Stamp,
  UserCog,
  Users,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import commandBg from "@/assets/command-bg.jpg";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/slidms/format";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/slidms/badges";
import { DemoBadge } from "@/components/slidms/panels";
import { ThemeToggle } from "@/components/slidms/ThemeToggle";
import { GlobalSearch } from "@/components/slidms/GlobalSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cases", label: "Cases", icon: FolderOpen },
  { to: "/documents", label: "Documents", icon: FileText },
  // { to: "/evidence", label: "Evidence", icon: FileStack },
  { to: "/audit", label: "Audit Trail", icon: ScrollText },
  { to: "/shared", label: "Shared", icon: Share2 },
  { to: "/diagnostics", label: "API Diagnostics", icon: PlugZap },
  { to: "/settings", label: "Settings", icon: Settings },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary glow-primary">
        <ShieldCheck className="size-5" />
      </span>
      {!compact ? (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-[0.18em] text-foreground">SLIDMS</p>
          <p className="text-[10px] uppercase tracking-wider text-subtle">Govt. of India</p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <BrandMark />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Operations
        </p>
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
              isActive(item.to)
                ? "border border-primary/45 bg-linear-to-r from-primary/28 to-primary/10 text-foreground shadow-[0_8px_22px_-14px_rgba(37,99,235,0.9)]"
                : "border border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-4 shrink-0",
                isActive(item.to)
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary",
              )}
            />
            {item.label}
          </Link>
        ))}

        {isAdmin ? (
          <>
            <p className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Admin Directorate
            </p>
            <Link
              to="/admin"
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
                isActive("/admin")
                  ? "border border-danger/45 bg-linear-to-r from-danger/25 to-danger/8 text-foreground"
                  : "border border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <UserCog className="size-4 shrink-0 text-danger" />
              Control Panel
            </Link>
          </>
        ) : null}
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-primary/12 text-[11px] font-semibold text-primary">
            {initials(user?.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-foreground">
              {user?.name ?? "Officer"}
            </span>
            <span className="block truncate text-[10px] text-subtle">{user?.department}</span>
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </div>
    </div>
  );
}

function ConnectionBadge() {
  const { connected, demo, checkConnection } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (connected === null && !demo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-muted-foreground/30 bg-muted-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <AlertCircle className="size-3" /> Checking…
      </span>
    );
  }

  if (connected && !demo) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-verified/35 bg-verified/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-verified"
        title="Backend connected"
      >
        <Wifi className="size-3" /> Live
      </span>
    );
  }

  return (
    <button
      onClick={async () => {
        setRetrying(true);
        await checkConnection();
        setRetrying(false);
      }}
      disabled={retrying}
      className="inline-flex items-center gap-1 rounded-md border border-pending/35 bg-pending/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pending transition-colors hover:bg-pending/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      title={demo ? "Backend unreachable — demo data active" : "Backend connection unknown"}
    >
      {retrying ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
      {demo ? "Retry connection" : "Check backend"}
    </button>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  demo,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  demo?: boolean | undefined;
}) {
  const { user, logout, demo: authDemo } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const wash = pathname.startsWith("/dashboard")
    ? "section-wash-dashboard"
    : pathname.startsWith("/cases")
      ? "section-wash-cases"
      : pathname.startsWith("/documents") || pathname.startsWith("/evidence")
        ? "section-wash-documents"
        : "section-wash-default";

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <img
        src={commandBg}
        alt=""
        aria-hidden
        loading="lazy"
        width={1920}
        height={1080}
        className="backdrop-image pointer-events-none fixed inset-0 size-full object-cover"
      />
      <div className="backdrop-veil pointer-events-none fixed inset-0" />
      <div className={cn("pointer-events-none fixed inset-0 opacity-70", wash)} />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-sidebar-border bg-sidebar/90 backdrop-blur-md lg:block">
        <SidebarNav />
      </aside>

      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background-deep/80 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[260px] border-r border-sidebar-border animate-slide-up">
            <button
              onClick={() => setDrawer(false)}
              className="absolute right-2 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[240px]">
        <header className="header-accent sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
          />

          <button
            onClick={() => setDrawer(true)}
            className="rounded-md border border-border p-2 text-muted-foreground lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold leading-tight text-foreground">
                {title}
              </h1>
              <DemoBadge show={demo ?? authDemo} />
              <ConnectionBadge />
            </div>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>

          <div className="hidden sm:block">
            <GlobalSearch />
          </div>

          {actions}

          <ThemeToggle />

          <button
            className="relative rounded-lg border border-border bg-background-raised p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Notifications, 1 unread"
          >
            <Bell className="size-4" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-pending"
            />
          </button>

          <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {initials(user?.name)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-xs font-semibold text-foreground">
              {user?.name}
            </span>
            <span className="block text-[10px] text-subtle">
              {user?.role.replace("_", " ")}
            </span>
          </span>

        </header>

        <main className="relative mx-auto w-full max-w-[1600px] px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
