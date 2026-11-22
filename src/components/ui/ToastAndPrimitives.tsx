import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (title: string, variant?: ToastVariant, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, variant: ToastVariant = 'info', description?: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 lg:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const icon =
            t.variant === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#39856A] shrink-0 mt-0.5" />
            ) : t.variant === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#D65A5A] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-[#527DA8] shrink-0 mt-0.5" />
            );
          return (
            <div
              key={t.id}
              className="pointer-events-auto bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl px-4 py-3 shadow-sm flex items-start gap-3 transition-all duration-200"
            >
              {icon}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#243447] dark:text-slate-100">
                  {t.title}
                </div>
                {t.description && (
                  <div className="text-xs text-[#718096] dark:text-slate-400 mt-0.5 leading-relaxed">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="p-0.5 rounded text-[#A0AEC0] hover:text-[#243447] dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
    };
  }
  return ctx;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#243447] dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#718096] dark:text-slate-400 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-3.5 w-1/3 bg-[#E4E8EE] dark:bg-[#263344] rounded" />
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`h-3 bg-[#F1F4F8] dark:bg-[#1E2B3B] rounded ${
            idx === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-8 text-center space-y-3">
      <div className="w-10 h-10 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 flex items-center justify-center mx-auto">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[#243447] dark:text-white">{title}</h3>
        <p className="text-xs text-[#718096] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#243B53]/30 backdrop-blur-[1px]"
    >
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl max-w-sm w-full p-5 space-y-4 shadow-lg">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[#243447] dark:text-white">{title}</h3>
          <p className="text-xs text-[#718096] dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-medium text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-colors ${
              destructive
                ? 'bg-[#D65A5A] hover:bg-[#BF4B4B]'
                : 'bg-[#243B53] hover:bg-[#1B2D40]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
