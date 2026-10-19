"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/types/auth";
import { GraduationCap, ArrowRight, Lock, Mail, User as UserIcon, Eye, EyeOff, BookOpen } from "lucide-react";
import Toast, { ToastVariant } from "@/components/Toast";
import GurukulLogo from "@/components/GurukulLogo";
import DiyaAnimation from "@/components/DiyaAnimation";
import ParticleBackground from "@/components/ParticleBackground";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [scholarId, setScholarId] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const { user, isLoading, signup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") router.replace("/admin");
      else if (user.role === "student") router.replace("/student");
      else router.replace("/teacher");
    }
  }, [user, isLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setToast({ message: "Please fill out all required fields.", variant: "error" });
      return;
    }
    if (role === "student" && (!scholarId || !scholarId.match(/^\d{7}$/))) {
      setToast({ message: "Students must provide a valid 7-digit Scholar ID.", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const newUser = await signup(email, password, fullName, role, role === "student" ? scholarId : undefined);
      setToast({ message: `Sanctuary initialized for ${newUser.full_name}!`, variant: "success" });
      setTimeout(() => {
        if (newUser.role === "student") router.push("/student");
        else router.push("/teacher");
      }, 400);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create account.", variant: "error" });
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
          subtitle="Empowering Educators to Forge Deeply Balanced Assessments"
          shloka="विद्ययाऽमृतमश्नुते"
          translation="Through knowledge, immortality is attained"
        />
      </div>

      {/* ── Right Registration Form Panel ── */}
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
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Brand Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <GurukulLogo size={46} showText={true} subtitle="Assessment Studio" />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 100,
                  background: "var(--forest-light)",
                  border: "1px solid var(--forest)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--forest)",
                  fontWeight: 700,
                }}
              >
                <BookOpen size={12} /> Teacher Portal
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
              Join the Faculty
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
              Create your educator workspace to synthesize blueprints and generate question papers.
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Student Provisioning Alert Banner */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-light)",
                border: "1px solid var(--accent-mid)",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontWeight: 700, fontSize: 12.5 }}>
                <GraduationCap size={16} />
                <span>Notice for Students <span className="shloka" style={{ fontWeight: 600, fontSize: "11px" }}>(शिष्य)</span></span>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.45 }}>
                Student accounts are managed and provisioned directly by institution administrators. If you are a scholar, please sign in with your 7-digit Scholar ID.
              </p>
              <Link
                href="/login"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginTop: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "underline",
                }}
              >
                Sign in with Scholar ID <ArrowRight size={12} />
              </Link>
            </div>

            {/* Full Name */}
            <div className="gk-field">
              <label className="gk-label" htmlFor="fullName">Full Name</label>
              <div style={{ position: "relative" }}>
                <input
                  id="fullName"
                  type="text"
                  className="gk-input"
                  placeholder="e.g. Dr. Raghav Sharma / Prof. Garg"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: 40, height: 44 }}
                  required
                />
                <UserIcon
                  size={16}
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

            {/* Email Address */}
            <div className="gk-field">
              <label className="gk-label" htmlFor="email">Institutional Email</label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  type="email"
                  className="gk-input"
                  placeholder="e.g. educator@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 40, height: 44 }}
                  required
                />
                <Mail
                  size={16}
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

            {/* Password */}
            <div className="gk-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="gk-label" htmlFor="password">Password</label>
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
                  style={{ paddingLeft: 40, paddingRight: 40, height: 44 }}
                  required
                />
                <Lock
                  size={16}
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
                marginTop: 6,
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
                  <span>Create Educator Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div
            style={{
              textAlign: "center",
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid var(--border)",
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            Already an accredited member?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--accent)",
                fontWeight: 700,
                textDecoration: "none",
                marginLeft: 4,
              }}
            >
              Sign In Here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
