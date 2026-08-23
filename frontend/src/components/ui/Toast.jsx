// frontend/src/components/ui/Toast.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-hc-success flex-shrink-0" />,
  error:   <XCircle     className="w-5 h-5 text-hc-danger  flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-hc-warning flex-shrink-0" />,
  info:    <Info        className="w-5 h-5 text-hc-blue   flex-shrink-0" />,
};

const STRIP = {
  success: "border-l-4 border-hc-success bg-hc-success-soft",
  error:   "border-l-4 border-hc-danger  bg-hc-danger-soft",
  warning: "border-l-4 border-hc-warning bg-hc-warning-soft",
  info:    "border-l-4 border-hc-blue    bg-hc-blue-soft",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} role="alert"
            className={"pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-hc-card-lg max-w-sm w-full bg-hc-surface border border-hc-border animate-slide-up " + (STRIP[t.type] || STRIP.info)}>
            {ICONS[t.type] || ICONS.info}
            <p className="text-sm font-medium text-hc-text flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-hc-text-light hover:text-hc-text transition-colors" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx.toast;
};

export default ToastProvider;
