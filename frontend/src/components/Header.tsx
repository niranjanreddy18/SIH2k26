import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, Link2, Bell } from 'lucide-react';
import api from '../services/api';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  INVESTIGATOR:    { label: 'INVESTIGATOR',    color: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
  SENIOR_OFFICER:  { label: 'SENIOR OFFICER',  color: '#a78bfa', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.3)'  },
  FORENSIC_OFFICER:{ label: 'FORENSIC OFFICER',color: '#34d399', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
  ADMIN:           { label: 'DIRECTORATE ADMIN',color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'   },
};

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [fabricConnected, setFabricConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/blockchain/status')
      .then(r => setFabricConnected(r.data?.data?.connected ?? false))
      .catch(() => setFabricConnected(false));
  }, [user]);

  const role = user ? ROLE_CONFIG[user.role] : null;

  return (
    <header style={{
      height: '60px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      boxShadow: '0 1px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Left — Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="animate-glow-blue" style={{
          padding: '8px',
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '10px',
          display: 'flex',
        }}>
          <ShieldCheck size={20} color="#3b82f6" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              SLIDMS
            </h1>
            <span style={{
              fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '9999px', padding: '2px 8px', letterSpacing: '0.04em',
            }}>SECURE</span>
            {fabricConnected === true && (
              <span style={{
                fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: '#34d399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '9999px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                FABRIC LIVE
              </span>
            )}
            {fabricConnected === false && (
              <span style={{
                fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '9999px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <Link2 size={8} />
                LOCAL LEDGER
              </span>
            )}
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
            Secure Legal &amp; Investigation Document Management
          </p>
        </div>
      </div>

      {/* Right — User controls */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Notification bell */}
          <button style={{
            padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            <Bell size={16} />
          </button>

          {/* User info */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user.department || 'Department Officer'}
            </div>
          </div>

          {/* Role pill */}
          {role && (
            <span style={{
              fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.05em',
              color: role.color, background: role.bg, border: `1px solid ${role.border}`,
              borderRadius: '9999px', padding: '4px 10px',
            }}>
              {role.label}
            </span>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign Out"
            style={{
              padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
};
