import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    setOptions(normalized);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div className="animate-fade-in-up" style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '16px', width: '100%', maxWidth: '400px',
            boxShadow: 'var(--shadow-modal)', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                padding: '7px', borderRadius: '8px',
                background: options.danger ? 'var(--danger-bg)' : 'var(--primary-dim)',
                border: `1px solid ${options.danger ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.2)'}`,
              }}>
                <AlertTriangle size={16} color={options.danger ? 'var(--danger)' : 'var(--primary)'} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {options.title || (options.danger ? 'Confirm Destructive Action' : 'Confirm Action')}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              {options.message}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => close(false)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
                {options.cancelLabel || 'Cancel'}
              </button>
              <button onClick={() => close(true)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: options.danger ? 'var(--danger)' : 'var(--primary)', color: 'white',
                border: 'none', cursor: 'pointer',
              }}>
                {options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx.confirm;
};
