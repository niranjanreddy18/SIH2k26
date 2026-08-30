import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, ArrowRight, Loader } from 'lucide-react';
import { UserRole } from '../types';

const PERSONAS = [
  { role: 'INVESTIGATOR'    as UserRole, name: 'Inspector Vikram Singh', dept: 'Cyber Crime Cell · CID', badge: '#1d4ed8', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', roleLabel: 'INVESTIGATOR' },
  { role: 'SENIOR_OFFICER'  as UserRole, name: 'ACP Rajeshwar Sharma',   dept: 'Additional Commissioner',  badge: '#5b21b6', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', roleLabel: 'SENIOR OFFICER' },
  { role: 'FORENSIC_OFFICER'as UserRole, name: 'Dr. Ananya Roy',          dept: 'CFSL Forensics Division',  badge: '#065f46', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', roleLabel: 'FORENSIC OFFICER' },
  { role: 'ADMIN'            as UserRole, name: 'Admin Desk Officer',       dept: 'SLIDMS Directorate',       badge: '#7f1d1d', color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   roleLabel: 'DIRECTORATE ADMIN' },
];

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [quickRole, setQuickRole] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setQuickRole(role);
    setError(null);
    try {
      await quickLogin(role);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setQuickRole(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%), var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="animate-glow-blue" style={{
            display: 'inline-flex', padding: '16px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '20px', marginBottom: '16px',
          }}>
            <ShieldCheck size={36} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            SLIDMS
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            Secure Legal &amp; Investigation Document Management System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Error banner */}
          {error && (
            <div className="animate-fade-in" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', marginBottom: '20px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', color: '#f87171', fontSize: '13px',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Official Government Email
              </label>
              <input
                type="email"
                required
                placeholder="officer@police.gov.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="input-dark"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Security Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="input-dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: loading ? 'rgba(59,130,246,0.5)' : '#3b82f6',
                color: 'white', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none', transition: 'background 200ms',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader size={15} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In to Security Portal
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            margin: '24px 0', 
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>
              ⚡ 1-CLICK DEMO LOGIN
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Persona cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {PERSONAS.map(p => {
              const isLoading = quickRole === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => handleQuickLogin(p.role)}
                  disabled={!!quickRole}
                  style={{
                    padding: '12px', borderRadius: '10px', textAlign: 'left',
                    background: p.bg, border: `1px solid ${p.border}`,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'transform 150ms, box-shadow 150ms',
                    opacity: quickRole && !isLoading ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                >
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', justifyContent: 'center' }}>
                      <Loader size={14} color={p.color} className="animate-spin" />
                      <span style={{ fontSize: '11px', color: p.color, fontWeight: 600 }}>Authenticating…</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.3 }}>
                        {p.dept}
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                        color: p.color, background: 'rgba(0,0,0,0.2)',
                        borderRadius: '9999px', padding: '2px 7px',
                      }}>
                        {p.roleLabel}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>
          SLIDMS v1.0 · Smart India Hackathon 2k26 · Cryptographic Chain of Custody
        </p>
      </div>
    </div>
  );
};
