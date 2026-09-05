"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Lock, X, CheckCircle2, ShieldCheck, KeyRound, Eye, EyeOff, ExternalLink } from "lucide-react";
import { authApi } from "@/lib/api";
import Toast, { ToastVariant } from "./Toast";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setToast(null);
    }
  }, [isOpen]);

  const openInSeparateWindow = () => {
    const width = 480;
    const height = 620;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    window.open(
      "/change-password?popup=true",
      "GurukulChangePassword",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ message: "Please fill in all password fields.", variant: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ message: "New password must be at least 6 characters.", variant: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: "New password and confirmation do not match.", variant: "error" });
      return;
    }
    if (newPassword === currentPassword) {
      setToast({ message: "New password must be different from current password.", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setToast({ message: res.message || "Password updated successfully!", variant: "success" });
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to change password.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="gk-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(10, 12, 18, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="gk-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 16px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          padding: "26px 24px 22px",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
        }}
      >
        {toast && (
          <div style={{ marginBottom: 14 }}>
            <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
          </div>
        )}

        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--accent-light, rgba(234, 88, 12, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent, #ea580c)",
                flexShrink: 0,
              }}
            >
              <KeyRound size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
                Change Your Password
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                Update your account password securely
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={openInSeparateWindow}
              title="Open in separate window"
              className="gk-btn gk-btn--icon"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
                background: "var(--surface-sunken)",
              }}
            >
              <ExternalLink size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="gk-btn gk-btn--icon"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
                background: "var(--surface-sunken)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Current Password */}
          <div className="gk-field">
            <label className="gk-label" htmlFor="currPw">Current Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="currPw"
                type={showCurrent ? "text" : "password"}
                className="gk-input"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ paddingLeft: 38, paddingRight: 38 }}
                required
              />
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                  pointerEvents: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="gk-field">
            <label className="gk-label" htmlFor="newPw">New Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="newPw"
                type={showNew ? "text" : "password"}
                className="gk-input"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ paddingLeft: 38, paddingRight: 38 }}
                required
              />
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                  pointerEvents: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="gk-field">
            <label className="gk-label" htmlFor="confPw">Confirm New Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="confPw"
                type={showConfirm ? "text" : "password"}
                className="gk-input"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: 38, paddingRight: 38 }}
                required
              />
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                  pointerEvents: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="gk-btn gk-btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="gk-btn gk-btn--primary"
              disabled={loading}
              style={{ minWidth: 150 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="spin" style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} />
                  Updating...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} /> Save New Password
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
