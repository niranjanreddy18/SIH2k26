import React from 'react';

interface Props {
  type: 'status' | 'classification' | 'verification';
  value: string;
  size?: 'sm' | 'md';
}

// Status colors per UX spec §1.1
const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; pulse?: boolean }> = {
  // Document statuses
  DRAFT:         { color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  SUBMITTED:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)'  },
  UNDER_REVIEW:  { color: '#818cf8', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)'  },
  APPROVED:      { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
  REJECTED:      { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'   },
  SIGNED:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
  LOCKED:        { color: '#a78bfa', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.3)'  },
  ARCHIVED:      { color: '#6b7280', bg: 'rgba(75,85,99,0.15)',    border: 'rgba(75,85,99,0.3)'    },
  // Case statuses
  OPEN:                  { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
  UNDER_INVESTIGATION:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)'  },
  CHARGESHEET_PREPARED:  { color: '#818cf8', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)'  },
  COURT_SUBMITTED:       { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
  CLOSED:                { color: '#6b7280', bg: 'rgba(75,85,99,0.15)',    border: 'rgba(75,85,99,0.3)'    },
  // Verification
  VERIFIED:   { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
  MISMATCH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  pulse: true },
};

const CLASSIFICATION_STYLES: Record<string, { color: string; bg: string; border: string; pulse?: boolean }> = {
  PUBLIC:              { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  INTERNAL:            { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)' },
  CONFIDENTIAL:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  HIGHLY_CONFIDENTIAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.5)',  pulse: true },
};

export const StatusBadge: React.FC<Props> = ({ type, value, size = 'sm' }) => {
  const map = type === 'classification' ? CLASSIFICATION_STYLES : STATUS_STYLES;
  const style = map[value] ?? { color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' };

  const label = value.replace(/_/g, ' ');
  const fontSize = size === 'md' ? '11px' : '10px';
  const padding  = size === 'md' ? '4px 10px' : '2px 8px';

  return (
    <span
      className={style.pulse ? 'animate-pulse-border-red' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize,
        fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.04em',
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '9999px',
        padding,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
};
