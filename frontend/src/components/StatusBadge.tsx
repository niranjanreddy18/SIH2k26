import React from 'react';

interface Props {
  type: 'status' | 'classification' | 'verification';
  value: string;
}

export const StatusBadge: React.FC<Props> = ({ type, value }) => {
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';

  if (type === 'status') {
    switch (value) {
      case 'OPEN':
      case 'DRAFT':
        bg = 'bg-blue-950 text-blue-300 border-blue-800';
        break;
      case 'UNDER_INVESTIGATION':
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        bg = 'bg-amber-950 text-amber-300 border-amber-800';
        break;
      case 'APPROVED':
      case 'SIGNED':
        bg = 'bg-emerald-950 text-emerald-300 border-emerald-800';
        break;
      case 'LOCKED':
      case 'CLOSED':
        bg = 'bg-indigo-950 text-indigo-300 border-indigo-800';
        break;
      case 'REJECTED':
        bg = 'bg-rose-950 text-rose-300 border-rose-800';
        break;
    }
  } else if (type === 'classification') {
    switch (value) {
      case 'PUBLIC':
        bg = 'bg-slate-800 text-slate-300 border-slate-700';
        break;
      case 'INTERNAL':
        bg = 'bg-cyan-950 text-cyan-300 border-cyan-800';
        break;
      case 'CONFIDENTIAL':
        bg = 'bg-purple-950 text-purple-300 border-purple-800';
        break;
      case 'HIGHLY_CONFIDENTIAL':
        bg = 'bg-rose-950 text-rose-300 border-rose-800 font-bold';
        break;
    }
  } else if (type === 'verification') {
    switch (value) {
      case 'VERIFIED':
        bg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse';
        break;
      case 'MISMATCH':
        bg = 'bg-rose-500/30 text-rose-300 border-rose-500/60 font-bold animate-bounce';
        break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
};

