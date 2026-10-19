"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ArrowRight, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Toast, { ToastVariant } from "@/components/Toast";
import GurukulLogo from "@/components/GurukulLogo";
import DiyaAnimation from "@/components/DiyaAnimation";
import ParticleBackground from "@/components/ParticleBackground";

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
      setToast({ message: "Please enter both credentials.", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      setToast({ message: `Welcome back, ${loggedUser.full_name || "Scholar"}!`, variant: "success" });
      setTimeout(() => {
        if (loggedUser.role === "admin") router.push("/admin");
        else if (loggedUser.role === "student") router.push("/student");
        else router.push("/teacher");
      }, 400);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to sign in. Please verify your details.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col lg:flex-row min-h-screen"
      style={{
        background: "var(--bg)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <ParticleBackground />
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* ── Visual Hero Panel (Cinematic Diya Animation, Always Active) ── */}
      <div
        className="w-full lg:w-1/2 flex-shrink-0"
        style={{
          position: "relative",
          minHeight: "360px",
          display: "flex",
          borderRight: "1px solid var(--border)",
          background: "linear-gradient(135deg, rgba(234, 88, 12, 0.04) 0%, rgba(217, 119, 6, 0.02) 100%)",
          zIndex: 2,
        }}
      >
        <DiyaAnimation
          title="Gurukul AI"
          subtitle="Curriculum Synthesis & Verified Examination Sanctuary"
          shloka="तमसो मा ज्योतिर्गमय"
          translation="Lead me from darkness unto light"
        />
      </div>

      {/* ── Right Auth Form Panel ── */}
      <div
        className="w-full lg:w-1/2 flex-1"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "36px 28px",
          background: "var(--surface)",
          position: "relative",
          zIndex: 3,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Brand Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <GurukulLogo size={46} showText={true} subtitle="Curriculum Engine" />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 100,
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-3)",
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={12} color="var(--forest)" /> v2.4 Secured
              </span>
            </div>

            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              Enter the Sanctuary
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
              Sign in with your credentials to access your academic desk.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Identity / Identifier Field */}
            <div className="gk-field">
              <label
                className="gk-label"
                htmlFor="email"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: "var(--text-2)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Scholar ID / Email / Username</span>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>e.g. 2410852</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  type="text"
                  className="gk-input"
                  placeholder="7-digit Scholar ID or institutional email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    paddingLeft: 40,
                    height: 46,
                    fontSize: 14,
                    borderRadius: "var(--radius-md)",
                    transition: "all 0.2s var(--ease-smooth)",
                  }}
                  required
                />
                <UserIcon
                  size={17}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-3)",
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="gk-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label
                  className="gk-label"
                  htmlFor="password"
                  style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em", color: "var(--text-2)" }}
                >
                  Password
                </label>
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
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
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
                  style={{
                    paddingLeft: 40,
                    paddingRight: 40,
                    height: 46,
                    fontSize: 14,
                    borderRadius: "var(--radius-md)",
                    transition: "all 0.2s var(--ease-smooth)",
                  }}
                  required
                />
                <Lock
                  size={17}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-3)",
                  }}
                />
              </div>
            </div>

            {/* Scholar / Student Guidance Strip */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-light)",
                border: "1px solid var(--accent-mid)",
                fontSize: 12,
                color: "var(--text-2)",
                lineHeight: 1.5,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 16 }}>🎓</span>
              <div>
                <strong>Students <span className="shloka" style={{ color: "var(--accent)", fontWeight: 600 }}>(शिष्य)</span>:</strong>{" "}
                Sign in with your <strong>7-Digit Scholar ID</strong> and account password assigned by your institution.
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="gk-btn gk-btn--primary"
              disabled={loading}
              style={{
                width: "100%",
                height: 46,
                fontSize: 14.5,
                fontWeight: 700,
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.25)",
              }}
            >
              {loading ? (
                <span
                  className="spin"
                  style={{
                    width: 18,
                    height: 18,
                    border: "2.5px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div
            style={{
              textAlign: "center",
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid var(--border)",
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            Looking to register a new Educator workspace?{" "}
            <Link
              href="/register"
              style={{
                color: "var(--accent)",
                fontWeight: 700,
                textDecoration: "none",
                marginLeft: 4,
              }}
            >
              Register Here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
