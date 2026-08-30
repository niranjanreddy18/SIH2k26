import React from 'react';

interface Props {
  type: 'status' | 'classification' | 'verification';
  value: string;
}

export const StatusBadge: React.FC<Props> = ({ type, value }) => {
  let bg = 'bg-slate-100 text-slate-700 border-slate-300';

  if (type === 'status') {
    switch (value) {
      case 'OPEN':
      case 'DRAFT':
        bg = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'UNDER_INVESTIGATION':
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        bg = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'APPROVED':
      case 'SIGNED':
        bg = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
        break;
      case 'LOCKED':
      case 'CLOSED':
        bg = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
        break;
      case 'REJECTED':
        bg = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
        break;
    }
  } else if (type === 'classification') {
    switch (value) {
      case 'PUBLIC':
        bg = 'bg-slate-100 text-slate-700 border-slate-200';
        break;
      case 'INTERNAL':
        bg = 'bg-cyan-50 text-cyan-700 border-cyan-200 font-medium';
        break;
      case 'CONFIDENTIAL':
        bg = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
        break;
      case 'HIGHLY_CONFIDENTIAL':
        bg = 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
        break;
    }
  } else if (type === 'verification') {
    switch (value) {
      case 'VERIFIED':
        bg = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
        break;
      case 'MISMATCH':
        bg = 'bg-rose-50 text-rose-700 border-rose-300 font-black animate-pulse';
        break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${bg}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
};
