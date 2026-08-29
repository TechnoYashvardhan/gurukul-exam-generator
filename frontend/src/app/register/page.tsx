"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/types/auth";
import { BookOpen, ShieldCheck, GraduationCap, ArrowRight, Lock, Mail, User as UserIcon } from "lucide-react";
import Toast, { ToastVariant } from "@/components/Toast";

const ParticleBackground = dynamic(
  () => import("@/components/ParticleBackground"),
  { ssr: false }
);

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [scholarId, setScholarId] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const { signup } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setToast({ message: "Please fill out all fields.", variant: "error" });
      return;
    }
    if (role === "student" && (!scholarId || !scholarId.match(/^\d{7}$/))) {
      setToast({ message: "Students must enter a valid 7-digit Scholar ID.", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const user = await signup(email, password, fullName, role, role === "student" ? scholarId : undefined);
      setToast({ message: `Account ready for ${user.full_name}!`, variant: "success" });
      setTimeout(() => {
        if (user.role === "student") router.push("/student");
        else router.push("/teacher");
      }, 500);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create account.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ParticleBackground />
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          padding: "36px 32px",
          backdropFilter: "blur(12px)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "var(--accent-light)",
              border: "2px solid var(--accent-mid)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: "var(--accent)",
            }}>
              <GraduationCap size={24} />
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-1)",
              marginBottom: 6,
            }}>
              Join Gurukul AI
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              Select your portal role below
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Student Info Notice */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--accent-light)",
                border: "1px solid var(--accent-mid)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>
                <GraduationCap size={18} />
                <span>Student (Shishya) Accounts</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                Students cannot self-register. Your account has been provisioned by your institution admin with your <strong>7-Digit Scholar ID</strong> and default password (<code>student@dsvv123</code>).
              </p>
              <Link
                href="/login"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginTop: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "underline",
                }}
              >
                Sign In With Scholar ID <ArrowRight size={13} />
              </Link>
            </div>

            <div className="gk-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="gk-label">Registration Role</label>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: "var(--forest-light)",
                    color: "var(--forest)",
                    fontWeight: 700,
                  }}
                >
                  Teacher (Guru)
                </span>
              </div>
            </div>

            <div className="gk-field">
              <label className="gk-label" htmlFor="fullName">Full Name</label>
              <div style={{ position: "relative" }}>
                <input
                  id="fullName"
                  type="text"
                  className="gk-input"
                  placeholder="e.g. Acharya Chanakya / Arjuna"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: 38 }}
                  required
                />
                <UserIcon size={16} style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                }} />
              </div>
            </div>

            <div className="gk-field">
              <label className="gk-label" htmlFor="email">Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  type="email"
                  className="gk-input"
                  placeholder="e.g. you@gurukul.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 38 }}
                  required
                />
                <Mail size={16} style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                }} />
              </div>
            </div>

            <div className="gk-field">
              <label className="gk-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type="password"
                  className="gk-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 38 }}
                  required
                />
                <Lock size={16} style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                }} />
              </div>
            </div>

            <button
              type="submit"
              className="gk-btn gk-btn--primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 6, height: 42 }}
            >
              {loading ? (
                <span className="spin" style={{
                  width: 16,
                  height: 16,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                }} />
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-2)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
