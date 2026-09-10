"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";
import { ArrowRight, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import Toast, { ToastVariant } from "@/components/Toast";
import GurukulLogo from "@/components/GurukulLogo";

const ParticleBackground = dynamic(
  () => import("@/components/ParticleBackground"),
  { ssr: false }
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") router.replace("/admin");
      else if (user.role === "student") router.replace("/student");
      else router.replace("/teacher");
    }
  }, [user, isLoading, router]);

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
        <div
          className="lens-card"
          style={{
            width: "100%",
            maxWidth: 440,
            padding: "36px 32px",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Logo & Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <GurukulLogo size={54} />
            </div>
            <h1 style={{
              fontFamily: "var(--font-heading)",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              marginBottom: 4,
            }}>
              Gurukul AI
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              Sign in to your curriculum synthesis workspace
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
                  placeholder="e.g. 2410852, scholar ID, or email"
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="gk-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: showPassword ? "var(--accent)" : "var(--text-3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "2px 4px",
                    borderRadius: "var(--radius-sm)",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="gk-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  required
                />
                <Lock size={16} style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: showPassword ? "var(--accent)" : "var(--text-3)",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Student sign-in guide */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-light)",
                border: "1px solid var(--accent-mid)",
                fontSize: 12,
                color: "var(--text-2)",
                lineHeight: 1.4,
              }}
            >
              🎓 <strong>Students <span className="shloka" style={{ fontWeight: 600, fontSize: "12px", color: "var(--accent)" }}>(शिष्य)</span>:</strong> Sign in with your <strong>7-Digit Scholar ID</strong> (or registered email) and your account password. You can change your password anytime from your dashboard.
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
