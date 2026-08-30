import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_META: Record<ToastType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: 'var(--success)', bg: 'var(--success-bg)', border: 'rgba(16,185,129,0.35)' },
  error:   { icon: XCircle,      color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'rgba(239,68,68,0.35)' },
  warning: { icon: AlertTriangle,color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'rgba(245,158,11,0.35)' },
  info:    { icon: Info,         color: 'var(--primary)', bg: 'var(--primary-dim)',border: 'rgba(59,130,246,0.35)' },
};

const DISMISS_MS = 5000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), DISMISS_MS);
  }, [dismiss]);

  const value: ToastContextType = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    warning: (m) => push('warning', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 200,
        display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px',
      }}>
        {toasts.map(t => {
          const meta = TOAST_META[t.type];
          const Icon = meta.icon;
          return (
            <div key={t.id} className="animate-fade-in-up" style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'var(--bg-surface)', border: `1px solid ${meta.border}`,
              borderRadius: '10px', padding: '12px 14px',
              boxShadow: 'var(--shadow-modal)',
            }}>
              <div style={{
                flexShrink: 0, width: '26px', height: '26px', borderRadius: '7px',
                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color={meta.color} />
              </div>
              <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5', paddingTop: '3px' }}>
                {t.message}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
