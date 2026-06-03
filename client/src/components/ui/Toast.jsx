import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Bell, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { isDark } = useTheme();

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = 'success') => {
      // Deterministic-enough id without Date.now()/random in render paths.
      const id = `${type}-${message}-${Math.floor(performance.now())}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={`${isDark ? 'dark ' : ''}fixed bottom-5 right-5 z-[60] flex flex-col gap-2`}>
        {toasts.map((t) => {
          const Icon = t.type === 'error' ? AlertCircle : t.type === 'info' ? Bell : CheckCircle2;
          const color = t.type === 'error' ? '#dc2626' : t.type === 'info' ? '#1e40af' : '#16a34a';
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-md"
            >
              <Icon size={18} style={{ color }} />
              <span className="text-sm text-ink">{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-subtle hover:text-ink">
                <X size={16} />
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
  if (!ctx) return { show: () => {} };
  return ctx;
}
