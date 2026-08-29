import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon, Lock } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const roleColors: Record<string, string> = {
    INVESTIGATOR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    SENIOR_OFFICER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    FORENSIC_OFFICER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-100 tracking-wide flex items-center gap-2">
            SLIDMS <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">v1.0 MVP</span>
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">Secure Legal & Investigation Document Management System</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-sm font-semibold text-slate-200">{user.name}</div>
            <div className="text-xs text-slate-400">{user.department || 'Department Officer'}</div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${roleColors[user.role] || 'bg-slate-800 text-slate-300'}`}>
            {user.role.replace(/_/g, ' ')}
          </span>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors border border-slate-700"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};

