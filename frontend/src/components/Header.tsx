import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, Link2, Search, FileText, FolderKanban, Loader, X } from 'lucide-react';
import api from '../services/api';
import { SearchResultItem } from '../types';

interface Props {
  onSelectCase?: (caseId: string) => void;
}

// ts_headline() wraps matches in << >> — split on those and highlight the middle piece.
function renderSnippet(snippet: string) {
  const parts = snippet.split(/(<<|>>)/);
  const out: React.ReactNode[] = [];
  let highlighting = false;
  parts.forEach((part, i) => {
    if (part === '<<') { highlighting = true; return; }
    if (part === '>>') { highlighting = false; return; }
    if (!part) return;
    out.push(highlighting
      ? <mark key={i} style={{ background: 'rgba(59,130,246,0.35)', color: '#93c5fd', borderRadius: '2px', padding: '0 1px' }}>{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>);
  });
  return out;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  INVESTIGATOR:    { label: 'INVESTIGATOR',    color: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
  SENIOR_OFFICER:  { label: 'SENIOR OFFICER',  color: '#a78bfa', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.3)'  },
  FORENSIC_OFFICER:{ label: 'FORENSIC OFFICER',color: '#34d399', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
  ADMIN:           { label: 'DIRECTORATE ADMIN',color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'   },
};

export const Header: React.FC<Props> = ({ onSelectCase }) => {
  const { user, logout } = useAuth();
  const [fabricConnected, setFabricConnected] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearchError(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      setSearchError(false);
      api.get(`/search?q=${encodeURIComponent(query.trim())}`)
        .then(res => { if (res.data.success) setResults(res.data.data.items || []); })
        .catch(() => setSearchError(true))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelectResult = (item: SearchResultItem) => {
    onSelectCase?.(item.caseId);
    setShowResults(false);
    setQuery('');
    setResults([]);
  };

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

      {/* Center — Global search */}
      {user && (
        <div ref={searchBoxRef} style={{ position: 'relative', flex: 1, maxWidth: '420px', margin: '0 24px' }}>
          <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search cases & documents..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            style={{
              width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 12px 8px 32px',
              fontSize: '12px', outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          )}

          {showResults && query.trim().length >= 2 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
              boxShadow: 'var(--shadow-modal)', maxHeight: '400px', overflowY: 'auto', zIndex: 50,
            }}>
              {searching ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Loader size={16} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Searching...</div>
                </div>
              ) : searchError ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--danger)' }}>
                  Search failed. Try again.
                </div>
              ) : results.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                  No matches for "{query}"
                </div>
              ) : (
                results.map((item, i) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                      {item.type === 'case'
                        ? <FolderKanban size={12} color="#60a5fa" />
                        : <FileText size={12} color="#34d399" />}
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                      <span style={{
                        fontSize: '8px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                        color: item.type === 'case' ? '#60a5fa' : '#34d399',
                        background: item.type === 'case' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                        border: `1px solid ${item.type === 'case' ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.25)'}`,
                        borderRadius: '9999px', padding: '1px 6px', marginLeft: 'auto',
                      }}>{item.type.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '3px' }}>
                      {item.firNumber}
                    </div>
                    {item.snippet && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {renderSnippet(item.snippet)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Right — User controls */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
