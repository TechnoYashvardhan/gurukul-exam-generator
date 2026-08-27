"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

export default function Toast({
  message,
  variant = "info",
  onClose,
  duration = 3500,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="gk-toast-wrap" role="alert" aria-live="polite">
      <div className={`gk-toast gk-toast--${variant}`}>
        <span className="gk-toast__icon">{ICONS[variant]}</span>
        <span className="gk-toast__msg">{message}</span>
        <button
          className="gk-toast__close"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          ×
        </button>
        {/* Progress bar */}
        <div
          className="gk-toast__progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
