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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 mb-2">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">SLIDMS Platform</h1>
          <p className="text-xs text-slate-400">Secure Legal & Investigation Document Management System</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Government Official Email</label>
            <input
              type="email"
              required
              placeholder="officer@police.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Security Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Security Portal'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Persona Quick Login Buttons */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
            ⚡ 1-Click Persona Quick Logins
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('INVESTIGATOR')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 text-blue-400 border border-slate-800 hover:border-blue-500/40 rounded-lg font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold">Inspector Vikram</span>
              <span className="text-[10px] text-slate-500">INVESTIGATOR</span>
            </button>

            <button
              onClick={() => handleQuickLogin('SENIOR_OFFICER')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-lg font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold">ACP Sharma</span>
              <span className="text-[10px] text-slate-500">SENIOR OFFICER</span>
            </button>

            <button
              onClick={() => handleQuickLogin('FORENSIC_OFFICER')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/40 rounded-lg font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold">Dr. Ananya Roy</span>
              <span className="text-[10px] text-slate-500">FORENSIC OFFICER</span>
            </button>

            <button
              onClick={() => handleQuickLogin('ADMIN')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 text-purple-400 border border-slate-800 hover:border-purple-500/40 rounded-lg font-medium text-left transition-colors flex flex-col"
            >
              <span className="font-bold">Admin Officer</span>
              <span className="text-[10px] text-slate-500">SYSTEM ADMIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

