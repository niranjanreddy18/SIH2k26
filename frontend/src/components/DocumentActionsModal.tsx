import React from 'react';
import {
  X, FileText, ShieldCheck, Eye, Link2, History, Layers, Download, Share2,
  Send, CheckCircle2, XCircle, FileSignature, Lock, Loader,
} from 'lucide-react';
import { Document } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  doc: Document;
  isSeniorOfficer: boolean;
  downloading: boolean;
  onClose: () => void;
  onVerify: () => void;
  onPreview: () => void;
  onBlockchain: () => void;
  onAudit: () => void;
  onVersions: () => void;
  onNewVersion: () => void;
  onDownload: () => void;
  onShare: () => void;
  onWorkflow: (action: 'submit' | 'approve' | 'reject' | 'sign' | 'lock') => void;
}

interface Tile {
  icon: React.ElementType;
  label: string;
  caption: string;
  color: string;
  bg: string;
  border: string;
  onClick: () => void;
  filled?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export const DocumentActionsModal: React.FC<Props> = ({
  doc, isSeniorOfficer, downloading, onClose,
  onVerify, onPreview, onBlockchain, onAudit, onVersions, onNewVersion,
  onDownload, onShare, onWorkflow,
}) => {
  const status = doc.currentVersion?.status || 'DRAFT';
  const run = (fn: () => void) => { onClose(); fn(); };

  const quickTiles: Tile[] = [
    { icon: Eye, label: 'Preview', caption: 'View file contents', color: 'var(--primary)', bg: 'var(--primary-dim)', border: 'rgba(37,99,235,0.25)', onClick: () => run(onPreview) },
    {
      icon: downloading ? Loader : Download, label: downloading ? 'Downloading…' : 'Download', caption: 'Save a local copy',
      color: 'var(--text-secondary)', bg: 'var(--bg-elevated)', border: 'var(--border)', onClick: () => run(onDownload), disabled: downloading, loading: downloading,
    },
    { icon: Share2, label: 'Share', caption: 'Grant access to an officer', color: 'var(--primary)', bg: 'var(--primary-dim)', border: 'rgba(37,99,235,0.25)', onClick: () => run(onShare) },
  ];

  const verifyTiles: Tile[] = [
    { icon: ShieldCheck, label: 'Verify Integrity', caption: 'Check SHA-256 against ledger', color: 'var(--success)', bg: 'var(--success-bg)', border: 'rgba(5,150,105,0.25)', onClick: () => run(onVerify) },
    { icon: Link2, label: 'Blockchain', caption: 'View Fabric ledger record', color: '#6366f1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)', onClick: () => run(onBlockchain) },
    { icon: Layers, label: 'Versions', caption: 'Browse prior revisions', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.25)', onClick: () => run(onVersions) },
    { icon: History, label: 'Audit', caption: 'Full chain-of-custody log', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.25)', onClick: () => run(onAudit) },
  ];

  const workflowTiles: Tile[] = [];
  if (status !== 'SIGNED' && status !== 'LOCKED') {
    workflowTiles.push({ icon: Layers, label: 'New Version', caption: 'Upload a revised file', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.25)', onClick: () => run(onNewVersion) });
  }
  if (status === 'DRAFT') {
    workflowTiles.push({ icon: Send, label: 'Submit', caption: 'Send for senior review', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'rgba(217,119,6,0.25)', onClick: () => run(() => onWorkflow('submit')) });
  }
  if (isSeniorOfficer && (status === 'SUBMITTED' || status === 'UNDER_REVIEW')) {
    workflowTiles.push(
      { icon: CheckCircle2, label: 'Approve', caption: 'Clear this document', color: 'white', bg: 'var(--success)', border: 'var(--success)', filled: true, onClick: () => run(() => onWorkflow('approve')) },
      { icon: XCircle, label: 'Reject', caption: 'Send back with objection', color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'rgba(220,38,38,0.25)', onClick: () => run(() => onWorkflow('reject')) },
    );
  }
  if (isSeniorOfficer && status === 'APPROVED') {
    workflowTiles.push({ icon: FileSignature, label: 'Sign', caption: 'Apply digital signature', color: 'white', bg: 'var(--primary)', border: 'var(--primary)', filled: true, onClick: () => run(() => onWorkflow('sign')) });
  }
  if (isSeniorOfficer && status === 'SIGNED') {
    workflowTiles.push({ icon: Lock, label: 'Lock', caption: 'Freeze document permanently', color: 'white', bg: '#7c3aed', border: '#7c3aed', filled: true, onClick: () => run(() => onWorkflow('lock')) });
  }

  const renderTiles = (tiles: Tile[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
      {tiles.map(t => (
        <button
          key={t.label}
          onClick={t.onClick}
          disabled={t.disabled}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
            padding: '14px', borderRadius: '10px', textAlign: 'left', cursor: t.disabled ? 'not-allowed' : 'pointer',
            background: t.bg, border: `1px solid ${t.border}`, transition: 'transform 150ms, box-shadow 150ms',
            opacity: t.disabled ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!t.disabled) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
        >
          <t.icon size={18} color={t.color} className={t.loading ? 'animate-spin' : ''} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: t.filled ? 'white' : 'var(--text-primary)' }}>{t.label}</div>
            <div style={{ fontSize: '10.5px', color: t.filled ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>{t.caption}</div>
          </div>
        </button>
      ))}
    </div>
  );

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
      {children}
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '16px', width: '100%', maxWidth: '600px',
          maxHeight: '85vh', overflow: 'hidden', boxShadow: 'var(--shadow-modal)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
            <div style={{ padding: '8px', background: 'var(--primary-dim)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: '8px', flexShrink: 0 }}>
              <FileText size={18} color="var(--primary)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {doc.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)' }}>{doc.type}</span>
                <StatusBadge type="classification" value={doc.classification} />
                {doc.currentVersion && <StatusBadge type="status" value={doc.currentVersion.status} />}
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  v{doc.currentVersion?.versionNo || 1}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {doc.currentVersion?.hash && (
            <div style={{
              fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px',
              wordBreak: 'break-all',
            }}>
              SHA-256: <span style={{ color: 'var(--success)' }}>{doc.currentVersion.hash}</span>
            </div>
          )}

          {workflowTiles.length > 0 && (
            <div>
              <SectionLabel>Workflow — Next Step</SectionLabel>
              {renderTiles(workflowTiles)}
            </div>
          )}

          <div>
            <SectionLabel>Quick Actions</SectionLabel>
            {renderTiles(quickTiles)}
          </div>

          <div>
            <SectionLabel>Verification &amp; History</SectionLabel>
            {renderTiles(verifyTiles)}
          </div>
        </div>
      </div>
    </div>
  );
};
