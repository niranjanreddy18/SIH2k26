import React from 'react';
import {
  LayoutDashboard, FolderKanban, Share2, ShieldAlert,
  Shield, ChevronRight, Binary
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'cases',     label: 'Case Repository',   icon: FolderKanban    },
  { id: 'shared',    label: 'Shared Docs',       icon: Share2          },
  { id: 'audit',     label: 'Audit Trail',       icon: ShieldAlert     },
];

const ADMIN_ITEM = { id: 'admin', label: 'Admin Directorate', icon: Shield };

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const items = user?.role === 'ADMIN' ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 12px',
    }}>
      <nav>
        <div style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-muted)', padding: '4px 12px 8px',
          textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
        }}>
          Navigation
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id || (id === 'cases' && activeTab === 'case-detail');
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  border: 'none',
                  textAlign: 'left',
                  transition: 'all 150ms',
                  position: 'relative',
                  background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={16} style={{ flexShrink: 0, color: isActive ? '#3b82f6' : 'var(--text-muted)' }} />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && <ChevronRight size={12} style={{ color: '#3b82f6', opacity: 0.6 }} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Blockchain Badge */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '10px',
        padding: '12px',
        marginTop: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Binary size={14} color="#3b82f6" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>
            Cryptographic Integrity
          </span>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Every action is Merkle hash-chained and anchored to the Hyperledger Fabric permissioned ledger.
        </p>
      </div>
    </aside>
  );
};
