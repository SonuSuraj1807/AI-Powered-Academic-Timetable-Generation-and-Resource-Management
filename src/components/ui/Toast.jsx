/**
 * Toast — Notification toast system for user feedback.
 * Usage: import { showToast } from './Toast'; showToast('success', 'Saved!');
 */
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'var(--success-subtle)', border: 'var(--success)', icon: 'var(--success)' },
  error: { bg: 'var(--danger-subtle)', border: 'var(--danger)', icon: 'var(--danger)' },
  warning: { bg: 'var(--warning-subtle)', border: 'var(--warning)', icon: 'var(--warning)' },
  info: { bg: 'var(--accent-blue-subtle)', border: 'var(--accent-blue)', icon: 'var(--accent-blue)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 'var(--z-toast)',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '8px',
        maxWidth: '400px',
      }}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          const colors = COLORS[toast.type] || COLORS.info;
          return (
            <div
              key={toast.id}
              className="animate-slide-in-right"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px',
                background: 'var(--bg-card)',
                border: `1px solid var(--border-secondary)`,
                borderLeft: `3px solid ${colors.border}`,
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <Icon size={18} style={{ color: colors.icon, flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ color: 'var(--text-muted)', padding: '2px', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export default ToastProvider;
