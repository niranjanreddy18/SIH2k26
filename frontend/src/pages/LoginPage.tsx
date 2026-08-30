import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await quickLogin(role);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200 mb-1">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SLIDMS Security Portal</h1>
          <p className="text-xs text-slate-500">Secure Legal & Investigation Document Management System</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Government Email</label>
            <input
              type="email"
              required
              placeholder="officer@police.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Security Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Security Portal'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Persona Quick Login Buttons */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            ⚡ 1-Click Persona Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <button
              onClick={() => handleQuickLogin('INVESTIGATOR')}
              className="p-3 bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 border border-blue-200 rounded-xl font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-blue-950">Inspector Vikram</span>
              <span className="text-[10px] text-blue-600 font-mono font-bold">INVESTIGATOR</span>
            </button>

            <button
              onClick={() => handleQuickLogin('SENIOR_OFFICER')}
              className="p-3 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 border border-amber-200 rounded-xl font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-amber-950">ACP Sharma</span>
              <span className="text-[10px] text-amber-600 font-mono font-bold">SENIOR OFFICER</span>
            </button>

            <button
              onClick={() => handleQuickLogin('FORENSIC_OFFICER')}
              className="p-3 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-xl font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-emerald-950">Dr. Ananya Roy</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">FORENSIC OFFICER</span>
            </button>

            <button
              onClick={() => handleQuickLogin('ADMIN')}
              className="p-3 bg-purple-50/70 hover:bg-purple-100/80 text-purple-900 border border-purple-200 rounded-xl font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-purple-950">Admin Desk</span>
              <span className="text-[10px] text-purple-600 font-mono font-bold">DIRECTORATE ADMIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
