import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Search, FileText, FolderKanban, Loader, X,
  LayoutDashboard, Share2, Shield,
} from 'lucide-react';
import api from '../services/api';
import { SearchResultItem } from '../types';
import { Logo } from './Logo';

interface Props {
  onSelectCase?: (caseId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
      ? <mark key={i} style={{ background: 'rgba(37,99,235,0.18)', color: 'var(--primary-hover)', borderRadius: '2px', padding: '0 1px' }}>{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>);
  });
  return out;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  INVESTIGATOR: { label: 'INVESTIGATOR', color: '#2563eb', bg: 'rgba(37,99,235,0.10)', border: 'rgba(37,99,235,0.25)' },
  SENIOR_OFFICER: { label: 'SENIOR OFFICER', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.25)' },
  FORENSIC_OFFICER: { label: 'FORENSIC OFFICER', color: '#059669', bg: 'rgba(5,150,105,0.10)', border: 'rgba(5,150,105,0.25)' },
  ADMIN: { label: 'DIRECTORATE ADMIN', color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
};

// "Audit Trail" was removed as a standalone nav item/page — per-case audit
// history still lives inside CaseDetailPage's own Audit tab.
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cases', label: 'Cases', icon: FolderKanban },
  { id: 'shared', label: 'Shared', icon: Share2 },
];

const ADMIN_ITEM = { id: 'admin', label: 'Admin', icon: Shield };

export const Header: React.FC<Props> = ({ onSelectCase, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
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

  const role = user ? ROLE_CONFIG[user.role] : null;
  const navItems = user?.role === 'ADMIN' ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

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
      padding: '0 20px',
      justifyContent: 'space-between',
      gap: '20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Left group — Logo, search, nav (search sits between the logo and the routes) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <Logo size={30} />
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              SLIDMS
            </h1>
          </div>
        </div>

        {user && (
          <div ref={searchBoxRef} style={{ position: 'relative', width: '260px', flexShrink: 1, minWidth: '140px' }}>
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
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '340px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
                boxShadow: 'var(--shadow-modal)', maxHeight: '400px', overflowY: 'auto', zIndex: 50,
                textAlign: 'left',
              }}>
                {searching ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Loader size={16} color="var(--primary)" className="animate-spin" style={{ margin: '0 auto 6px' }} />
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
                        borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-dim)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                        {item.type === 'case'
                          ? <FolderKanban size={12} color="var(--primary)" />
                          : <FileText size={12} color="var(--success)" />}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                        <span style={{
                          fontSize: '8px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                          color: item.type === 'case' ? 'var(--primary)' : 'var(--success)',
                          background: item.type === 'case' ? 'var(--primary-dim)' : 'var(--success-bg)',
                          border: `1px solid ${item.type === 'case' ? 'var(--primary)' : 'var(--success)'}`,
                          borderRadius: '9999px', padding: '1px 6px', marginLeft: 'auto', opacity: 0.9,
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

        {user && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id || (id === 'cases' && activeTab === 'case-detail');
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    border: 'none',
                    whiteSpace: 'nowrap',
                    background: isActive ? 'var(--primary-dim)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'color 150ms, background 150ms',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
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
                  <Icon size={15} style={{ flexShrink: 0, color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                  {label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right — User controls */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user.department || 'Department Officer'}
            </div>
          </div>

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

          <button
            onClick={logout}
            title="Sign Out"
            style={{
              padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
};
