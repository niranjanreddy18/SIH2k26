import React from 'react';
import { LayoutDashboard, FolderKanban, FileCheck2, ShieldAlert, Share2, Binary } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Case Repository', icon: FolderKanban },
    { id: 'shared', label: 'Shared Documents', icon: Share2 },
    { id: 'audit', label: 'Audit Logs', icon: ShieldAlert }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <Binary className="w-4 h-4" /> SHA-256 & Ledger Anchored
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          All document actions generate DB-level hash chains and ledger anchors.
        </p>
      </div>
    </aside>
  );
};

