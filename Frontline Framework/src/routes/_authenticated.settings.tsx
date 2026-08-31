import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Check,
  Cpu,
  Database,
  Download,
  Key,
  Layers,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Sliders,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { GlassPanel, PanelHeader, SectionGlow } from "@/components/slidms/panels";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "System & Security Settings — SLIDMS" },
      {
        name: "description",
        content:
          "Configure cryptographic hashing algorithms, blockchain peer parameters, security thresholds, and interface preferences.",
      },
      { property: "og:title", content: "System & Security Settings — SLIDMS" },
      {
        property: "og:description",
        content: "Configure cryptographic parameters, Hyperledger node connections, and security alerts.",
      },
    ],
  }),
  component: SettingsPage,
});

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background-raised/40 p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-foreground">{title}</h4>
            {badge && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary uppercase">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Security Preferences
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [autoAnchor, setAutoAnchor] = useState(true);
  const [hashAlgorithm, setHashAlgorithm] = useState("SHA-256");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [tamperDetectionLevel, setTamperDetectionLevel] = useState("STRICT");

  // Notifications
  const [notifyStatusChanges, setNotifyStatusChanges] = useState(true);
  const [notifyCustodyHandover, setNotifyCustodyHandover] = useState(true);
  const [notifyTamperAlerts, setNotifyTamperAlerts] = useState(true);
  const [notifyShareExpiry, setNotifyShareExpiry] = useState(true);

  // Network & Node
  const [channelName, setChannelName] = useState("slidms-channel");
  const [peerEndpoint, setPeerEndpoint] = useState("localhost:7051");
  const [mspId, setMspId] = useState("PoliceDeptMSP");
  const [storageVault, setStorageVault] = useState("PostgreSQL Encrypted Vault");

  // UI / Display
  const [denseTables, setDenseTables] = useState(false);
  const [monoHashes, setMonoHashes] = useState(true);
  const [defaultLanding, setDefaultLanding] = useState("/dashboard");

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Security & system preferences saved successfully");
    }, 600);
  };

  const handleReset = () => {
    setMfaEnabled(true);
    setAutoAnchor(true);
    setHashAlgorithm("SHA-256");
    setSessionTimeout("30");
    setNotifyStatusChanges(true);
    setNotifyCustodyHandover(true);
    setNotifyTamperAlerts(true);
    setNotifyShareExpiry(true);
    setDenseTables(false);
    setMonoHashes(true);
    setDefaultLanding("/dashboard");
    toast.info("Settings restored to factory defaults");
  };

  const handleExportCert = () => {
    const certContent = `-----BEGIN CERTIFICATE-----
MIIClTCCAf4CCQC4f9U...[SLIDMS Officer Identity Certificate]...
Officer: ${user?.name || "Officer"}
Role: ${user?.role || "INVESTIGATOR"}
Organization: PoliceDeptMSP
Channel: slidms-channel
Issued: ${new Date().toISOString()}
-----END CERTIFICATE-----`;
    const blob = new Blob([certContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slidms-cert-${user?.id || "officer"}.pem`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Officer public certificate downloaded (.pem)");
  };

  return (
    <AppShell
      title="Settings"
      subtitle="Security parameters, cryptographic protocols and platform configuration"
    >
      <SectionGlow />

      {/* Header Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Platform Settings</h2>
          <p className="text-xs text-muted-foreground">
            Manage node consensus, cryptographic signatures, notification webhooks, and interface preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background-raised px-3 text-xs font-semibold text-muted-foreground hover:bg-background-deep hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Defaults
          </button>
          <button
            onClick={handleExportCert}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            <Download className="size-3.5" /> Export Cert (.pem)
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="glow-primary inline-flex h-9 items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Preferences
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── 1. Cryptographic Security & Ledger ───────────────────────────── */}
        <div className="space-y-4">
          <GlassPanel glow>
            <PanelHeader
              title="Cryptographic & Ledger Security"
              subtitle="Tamper-proofing algorithms and Hyperledger anchoring"
              icon={Shield}
            />
            <div className="space-y-3 p-4">
              <ToggleRow
                icon={ShieldCheck}
                title="Automated Hyperledger Blockchain Anchoring"
                description="Immediately anchors document versions and digital signatures to Hyperledger Fabric when approved by senior officers."
                checked={autoAnchor}
                onChange={setAutoAnchor}
                badge="Recommended"
              />

              <ToggleRow
                icon={Smartphone}
                title="Multi-Factor Authentication (MFA / TOTP)"
                description="Enforce hardware or authenticator app 2FA on sign-in and cryptographic signing actions."
                checked={mfaEnabled}
                onChange={setMfaEnabled}
                badge="Active"
              />

              <div className="rounded-xl border border-border bg-background-raised/40 p-4">
                <div className="flex items-center gap-2">
                  <Key className="size-4 text-primary" />
                  <label className="text-xs font-semibold text-foreground">
                    Document Digest Algorithm
                  </label>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Cryptographic hashing standard for file tamper-proofing and blockchain anchoring.
                </p>
                <select
                  value={hashAlgorithm}
                  onChange={(e) => setHashAlgorithm(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-input bg-background-deep px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="SHA-256">SHA-256 (NIST Standard · 256-bit hash)</option>
                  <option value="SHA-512">SHA-512 (High Security · 512-bit hash)</option>
                  <option value="BLAKE3">BLAKE3 (High Throughput · 256-bit hash)</option>
                </select>
              </div>

              <div className="rounded-xl border border-border bg-background-raised/40 p-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-pending" />
                  <label className="text-xs font-semibold text-foreground">
                    Tamper Detection Sensitivity
                  </label>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Threshold for automatic quarantine when database checksum diverges from blockchain.
                </p>
                <select
                  value={tamperDetectionLevel}
                  onChange={(e) => setTamperDetectionLevel(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-input bg-background-deep px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="STRICT">Strict (Auto-Lock document & notify Directorate Admin)</option>
                  <option value="WARN_ONLY">Warning Only (Log audit alert without immediate lock)</option>
                </select>
              </div>

              <div className="rounded-xl border border-border bg-background-raised/40 p-4">
                <label className="text-xs font-semibold text-foreground">
                  Inactivity Session Lockout
                </label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Automatically lock the interface after a period of user inactivity.
                </p>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-input bg-background-deep px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes (Default)</option>
                  <option value="60">1 Hour</option>
                  <option value="240">4 Hours</option>
                </select>
              </div>
            </div>
          </GlassPanel>

          {/* ─── 2. Node & Network Parameters ──────────────────────────────── */}
          <GlassPanel>
            <PanelHeader
              title="Hyperledger Node & Storage Vault"
              subtitle="Connection parameters for distributed ledger peers"
              icon={Server}
            />
            <div className="space-y-3 p-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Hyperledger Channel</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background-deep px-3 font-mono text-xs text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Peer Endpoint</label>
                  <input
                    type="text"
                    value={peerEndpoint}
                    onChange={(e) => setPeerEndpoint(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background-deep px-3 font-mono text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">MSP Identifier</label>
                  <input
                    type="text"
                    value={mspId}
                    onChange={(e) => setMspId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background-deep px-3 font-mono text-xs text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Storage Vault Engine</label>
                <select
                  value={storageVault}
                  onChange={(e) => setStorageVault(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background-deep px-3 text-xs text-foreground"
                >
                  <option value="PostgreSQL Encrypted Vault">
                    PostgreSQL Encrypted Vault (Local Disk AES-256)
                  </option>
                  <option value="AWS S3 Encrypted Storage">AWS S3 (SSE-KMS Encryption)</option>
                  <option value="IPFS Private Cluster">IPFS Private InterPlanetary Node</option>
                </select>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* ─── 3. Notifications & Interface Preferences ────────────────────── */}
        <div className="space-y-4">
          <GlassPanel>
            <PanelHeader
              title="Audit & Notification Alerts"
              subtitle="Configurable alerts for high-value legal events"
              icon={Bell}
            />
            <div className="space-y-3 p-4">
              <ToggleRow
                icon={ShieldAlert}
                title="Critical Tamper Detection Alerts"
                description="Instant high-priority alerts whenever hash validation or blockchain chaincode endorsement fails."
                checked={notifyTamperAlerts}
                onChange={setNotifyTamperAlerts}
                badge="High Priority"
              />

              <ToggleRow
                icon={Layers}
                title="Document Lifecycle Progression"
                description="Receive notifications when documents you authored are submitted, approved, signed or rejected."
                checked={notifyStatusChanges}
                onChange={setNotifyStatusChanges}
              />

              <ToggleRow
                icon={Database}
                title="Chain-of-Custody Handovers"
                description="Alerts whenever physical or digital evidence custody is assigned or transferred to your badge."
                checked={notifyCustodyHandover}
                onChange={setNotifyCustodyHandover}
              />

              <ToggleRow
                icon={Key}
                title="Share Expiry Reminders"
                description="Send warning notification 24 hours before a time-bound document share expires."
                checked={notifyShareExpiry}
                onChange={setNotifyShareExpiry}
              />
            </div>
          </GlassPanel>

          <GlassPanel>
            <PanelHeader
              title="Interface & Display Preferences"
              subtitle="Customize workspace density and visual layout"
              icon={Sliders}
            />
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background-raised/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                    {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  </span>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Theme Mode</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Current theme: <span className="font-semibold uppercase text-primary">{theme}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background-deep p-1">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                      theme === "dark"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                      theme === "light"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>

              <ToggleRow
                icon={Cpu}
                title="Monospace Cryptographic Hashes"
                description="Render all SHA-256 hashes, transaction IDs, and public keys in monospaced teal typography."
                checked={monoHashes}
                onChange={setMonoHashes}
              />

              <ToggleRow
                icon={Layers}
                title="Compact Table Density"
                description="Compress table row padding in case registers and audit trails to show more data per screen."
                checked={denseTables}
                onChange={setDenseTables}
              />

              <div className="rounded-xl border border-border bg-background-raised/40 p-4">
                <label className="text-xs font-semibold text-foreground">Default Landing Workspace</label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  The initial view shown after authenticating with your credentials.
                </p>
                <select
                  value={defaultLanding}
                  onChange={(e) => setDefaultLanding(e.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-input bg-background-deep px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="/dashboard">Executive Operations Dashboard</option>
                  <option value="/cases">Case Files & FIR Workspace</option>
                  <option value="/documents">Document Integrity Center</option>
                  <option value="/evidence">Evidence & Custody Chain</option>
                  <option value="/audit">Security Audit Ledger</option>
                </select>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </AppShell>
  );
}
