import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { isForceOfflineEnabled } from '@/lib/offlineStore';
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}
interface NotificationContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const addToast = useCallback((type: Toast['type'], message: string) => {
    if (isForceOfflineEnabled() && (type === 'error' || type === 'warning')) {
      const lower = message.toLowerCase();
      if (
        lower.includes('offline') ||
        lower.includes('cloud') ||
        lower.includes('sync') ||
        lower.includes('unreachable') ||
        lower.includes('network') ||
        lower.includes('fetch') ||
        lower.includes('failed')
      ) {
        return; 
      }
    }
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);
  const toast = useRef({
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
    warning: (msg: string) => addToast('warning', msg),
  }).current;
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options: {
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          type: 'info',
          ...options,
        },
        resolve,
      });
    });
  }, []);
  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };
  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'border-success/30 bg-success/10 text-success';
      case 'error':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      case 'warning':
        return 'border-warning/30 bg-warning/10 text-warning';
      case 'info':
      default:
        return 'border-primary/30 bg-primary/10 text-primary';
    }
  };
  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-primary flex-shrink-0" />;
    }
  };
  const getConfirmButtonColor = (type: ConfirmOptions['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      case 'warning':
        return 'bg-warning text-warning-foreground hover:bg-warning/90';
      case 'info':
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };
  const getConfirmIcon = (type: ConfirmOptions['type']) => {
    switch (type) {
      case 'danger':
        return <XCircle className="w-12 h-12 text-destructive mx-auto" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-warning mx-auto" />;
      case 'info':
      default:
        return <Info className="w-12 h-12 text-primary mx-auto" />;
    }
  };
  return (
    <NotificationContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-card p-4 rounded-xl border flex items-center gap-3 shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 animate-fade-in ${getToastStyles(
              t.type
            )}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 text-xs font-semibold">{t.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 animate-scale-in space-y-4">
            <div className="text-center space-y-2">
              {getConfirmIcon(confirmState.options.type)}
              <h3 className="text-base font-bold text-foreground">{confirmState.options.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {confirmState.options.message}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 text-xs font-bold transition-colors cursor-pointer border border-border/40"
              >
                {confirmState.options.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md ${getConfirmButtonColor(
                  confirmState.options.type
                )}`}
              >
                {confirmState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
