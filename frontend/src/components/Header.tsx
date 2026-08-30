import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const roleColors: Record<string, string> = {
    INVESTIGATOR: 'bg-blue-50 text-blue-700 border-blue-200',
    SENIOR_OFFICER: 'bg-amber-50 text-amber-700 border-amber-200',
    FORENSIC_OFFICER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-2">
            SLIDMS <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold">v1.0 MVP</span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">Secure Legal & Investigation Document Management System</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-sm font-bold text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-500">{user.department || 'Department Officer'}</div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${roleColors[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {user.role.replace(/_/g, ' ')}
          </span>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
