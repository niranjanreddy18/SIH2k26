import React from 'react';
import { LayoutDashboard, FolderKanban, ShieldAlert, Share2, Binary, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Case Repository', icon: FolderKanban },
    { id: 'shared', label: 'Shared Documents', icon: Share2 },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert },
    ...(user?.role === 'ADMIN' ? [{ id: 'admin', label: 'Admin Directorate', icon: Shield }] : [])
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] shadow-xs">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
          <Binary className="w-4 h-4 text-emerald-600" /> Cryptographic Integrity
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
          Every action is Merkle hash-chained and anchored to the permissioned blockchain ledger.
        </p>
      </div>
    </aside>
  );
};
