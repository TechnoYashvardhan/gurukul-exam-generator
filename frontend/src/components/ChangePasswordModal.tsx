"use client";

import React, { useState } from "react";
import { Lock, X, CheckCircle2, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  if (!isOpen) return null;

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

  return (
    <div className="gk-modal-backdrop" onClick={onClose}>
      <div
        className="gk-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, padding: "28px 24px" }}
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
                background: "var(--accent-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
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
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-3)" }}
          >
            <X size={20} />
          </button>
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
                style={{ paddingLeft: 36, paddingRight: 36 }}
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
                style={{ paddingLeft: 36, paddingRight: 36 }}
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
                type="password"
                className="gk-input"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: 36 }}
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
                }}
              />
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
              style={{ minWidth: 140 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="spin" style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} />
                  Updating...
                </span>
              ) : (
                <>
                  <ShieldCheck size={16} /> Save New Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
