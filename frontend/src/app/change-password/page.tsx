"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff, ArrowLeft, X, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import GurukulLogo from "@/components/GurukulLogo";
import Toast, { ToastVariant } from "@/components/Toast";

function ChangePasswordContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPopup = searchParams.get("popup") === "true";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      const stored = localStorage.getItem("gk_token");
      if (!stored) {
        router.push("/login");
      }
    }
  }, [token, router]);

  const handleClose = () => {
    if (isPopup && typeof window !== "undefined") {
      window.close();
    } else {
      if (user?.role === "student") router.push("/student");
      else if (user?.role === "admin") router.push("/admin");
      else router.push("/teacher");
    }
  };

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
      setSuccess(true);
      setToast({ message: res.message || "Password updated successfully!", variant: "success" });
      if (isPopup) {
        setTimeout(() => {
          window.close();
        }, 1500);
      }
    } catch (err: any) {
      setToast({ message: err.message || "Failed to change password.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 16px)",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          padding: "32px 28px",
        }}
      >
        {toast && (
          <div style={{ marginBottom: 16 }}>
            <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
          </div>
        )}

        {/* Top bar with logo and back/close */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <GurukulLogo size={32} showText={true} subtitle="Security Portal" />
          <button
            type="button"
            onClick={handleClose}
            className="gk-btn gk-btn--secondary"
            style={{ fontSize: 12, height: 32, padding: "0 10px", gap: 5 }}
          >
            {isPopup ? (
              <>
                <X size={14} /> Close
              </>
            ) : (
              <>
                <ArrowLeft size={14} /> Back
              </>
            )}
          </button>
        </div>

        {/* Title area */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 800,
                color: "var(--text-1, var(--text))",
                letterSpacing: "-0.02em",
              }}
            >
              Change Your Password
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--text-3)" }}>
              Update your account password securely
            </p>
          </div>
        </div>

        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 16px",
              background: "rgba(22, 101, 52, 0.08)",
              border: "1px solid rgba(22, 101, 52, 0.2)",
              borderRadius: "var(--radius)",
            }}
          >
            <CheckCircle2 size={36} color="var(--forest, #10b981)" style={{ margin: "0 auto 10px" }} />
            <h4 style={{ margin: "0 0 6px", color: "var(--forest, #10b981)", fontWeight: 700 }}>
              Password Updated Successfully!
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)" }}>
              {isPopup ? "This window will close automatically..." : "You can now return to your dashboard."}
            </p>
            {!isPopup && (
              <button
                type="button"
                onClick={handleClose}
                className="gk-btn gk-btn--primary"
                style={{ marginTop: 16 }}
              >
                Return to Dashboard
              </button>
            )}
          </div>
        ) : (
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
                  autoComplete="current-password"
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
                  tabIndex={-1}
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
                  autoComplete="new-password"
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
                  tabIndex={-1}
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
                  autoComplete="new-password"
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
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={handleClose}
                disabled={loading}
                style={{ padding: "9px 16px", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gk-btn gk-btn--primary"
                disabled={loading}
                style={{ minWidth: 150, padding: "9px 18px", fontSize: 13 }}
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
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <ChangePasswordContent />
    </Suspense>
  );
}
