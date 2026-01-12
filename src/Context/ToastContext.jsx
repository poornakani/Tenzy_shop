import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
} from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((toast) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const payload = {
      id,
      title: toast?.title ?? "Added to cart",
      message: toast?.message ?? "",
      image: toast?.image ?? "",
      duration: toast?.duration ?? 2200,
    };

    setToasts((prev) => [payload, ...prev].slice(0, 4));

    // auto remove
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, payload.duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, showToast, removeToast }),
    [toasts, showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
