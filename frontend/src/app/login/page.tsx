"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";
import { BookOpen, ShieldCheck, GraduationCap, ArrowRight, Lock, Mail, Sparkles, User as UserIcon } from "lucide-react";
import Toast, { ToastVariant } from "@/components/Toast";

const ParticleBackground = dynamic(
  () => import("@/components/ParticleBackground"),
  { ssr: false }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const { login, setMockRole } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ message: "Please enter both email and password.", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      setToast({ message: `Welcome back, ${user.full_name || "Scholar"}!`, variant: "success" });
      setTimeout(() => {
        if (user.role === "admin") router.push("/admin");
        else if (user.role === "student") router.push("/student");
        else router.push("/teacher");
      }, 500);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to login. Please try again.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (role: "admin" | "teacher" | "student") => {
    setMockRole(role);
    setToast({ message: `Logged in as demo ${role.toUpperCase()}`, variant: "info" });
    setTimeout(() => {
      if (role === "admin") router.push("/admin");
      else if (role === "student") router.push("/student");
      else router.push("/teacher");
    }, 400);
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
          maxWidth: 440,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          padding: "36px 32px",
          backdropFilter: "blur(12px)",
        }}>
          {/* Logo & Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "var(--accent-light)",
              border: "2px solid var(--accent-mid)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--accent)",
            }}>
              <BookOpen size={26} />
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-1)",
              marginBottom: 6,
            }}>
              Gurukul AI
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              Sign in to your learning & examination sanctuary
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="gk-field">
              <label className="gk-label" htmlFor="email">Email / 7-Digit Scholar ID / Admin Username</label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  type="text"
                  className="gk-input"
                  placeholder="e.g. 2410852, Admin_DSVV01, or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              style={{ width: "100%", justifyContent: "center", marginTop: 4, height: 42 }}
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
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              textAlign: "center",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}>
              <Sparkles size={13} color="var(--gold)" />
              Quick Fill Credentials
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className="gk-btn gk-btn--secondary gk-btn--sm"
                onClick={() => {
                  setEmail("Admin_DSVV01");
                  setPassword("OmBhBS@123");
                }}
                style={{ flexDirection: "column", padding: "10px 4px", height: "auto", fontSize: 11 }}
                title="Fill Admin credentials"
              >
                <ShieldCheck size={16} color="var(--terracotta)" />
                <span style={{ fontWeight: 700 }}>Admin DSVV</span>
                <span style={{ fontSize: 9.5, opacity: 0.7 }}>Admin_DSVV01</span>
              </button>

              <button
                type="button"
                className="gk-btn gk-btn--secondary gk-btn--sm"
                onClick={() => {
                  setEmail("teacher@gurukul.local");
                  setPassword("teacher123");
                }}
                style={{ flexDirection: "column", padding: "10px 4px", height: "auto", fontSize: 11 }}
                title="Fill Teacher credentials"
              >
                <BookOpen size={16} color="var(--forest)" />
                <span style={{ fontWeight: 700 }}>Teacher</span>
                <span style={{ fontSize: 9.5, opacity: 0.7 }}>Worldwide</span>
              </button>

              <button
                type="button"
                className="gk-btn gk-btn--secondary gk-btn--sm"
                onClick={() => {
                  setEmail("2410852");
                  setPassword("student@dsvv123");
                }}
                style={{ flexDirection: "column", padding: "10px 4px", height: "auto", fontSize: 11 }}
                title="Fill Sample Student credentials"
              >
                <GraduationCap size={16} color="var(--gold)" />
                <span style={{ fontWeight: 700 }}>Student</span>
                <span style={{ fontSize: 9.5, opacity: 0.7 }}>ID: 2410852</span>
              </button>
            </div>
          </div>

          {/* Footer Link */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-2)" }}>
            Don't have an account?{" "}
            <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
