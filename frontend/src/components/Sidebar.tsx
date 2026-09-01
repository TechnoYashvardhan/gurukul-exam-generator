"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  BookOpen,
  Sparkles,
  Library,
  History,
  Home,
  LogOut,
  GraduationCap,
  ShieldCheck,
  Send,
  KeyRound,
  FileCode2,
} from "lucide-react";
import type { UserRole } from "@/types/auth";
import ChangePasswordModal from "./ChangePasswordModal";
import GurukulLogo from "./GurukulLogo";

export type View = "dashboard" | "builder" | "library" | "generate" | "import_json" | "history" | "quiz" | "shishyas" | "publishes";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  role?: UserRole;
}

const ADMIN_NAV_ITEMS: {
  id: View;
  sanskrit: string;
  hindi: string;
  english: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "dashboard",
    sanskrit: "Aashram",
    hindi: "आश्रम",
    english: "Home Desk",
    icon: <Home size={17} />,
  },
  {
    id: "shishyas",
    sanskrit: "Students",
    hindi: "शिष्य",
    english: "Students & Cohorts",
    icon: <GraduationCap size={17} />,
  },
  {
    id: "publishes",
    sanskrit: "Prakashan",
    hindi: "प्रकाशन",
    english: "Published Quizzes",
    icon: <Send size={17} />,
  },
  {
    id: "builder",
    sanskrit: "Vidya",
    hindi: "विद्या",
    english: "Exam Blueprints",
    icon: <BookOpen size={17} />,
  },
  {
    id: "library",
    sanskrit: "Granth",
    hindi: "ग्रन्थ",
    english: "Syllabus Library",
    icon: <Library size={17} />,
  },
  {
    id: "generate",
    sanskrit: "Rachna",
    hindi: "रचना",
    english: "Generate Exam",
    icon: <Sparkles size={17} />,
  },
  {
    id: "import_json",
    sanskrit: "Aayat",
    hindi: "आयात",
    english: "JSON Import",
    icon: <FileCode2 size={17} />,
  },
  {
    id: "history",
    sanskrit: "Itihas",
    hindi: "इतिहास",
    english: "Exam Archives",
    icon: <History size={17} />,
  },
];

const DEFAULT_NAV_ITEMS: {
  id: View;
  sanskrit: string;
  hindi: string;
  english: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "dashboard",
    sanskrit: "Aashram",
    hindi: "आश्रम",
    english: "Home Desk",
    icon: <Home size={17} />,
  },
  {
    id: "shishyas",
    sanskrit: "Students",
    hindi: "शिष्य",
    english: "Students & Cohorts",
    icon: <GraduationCap size={17} />,
  },
  {
    id: "publishes",
    sanskrit: "Prakashan",
    hindi: "प्रकाशन",
    english: "Published Quizzes",
    icon: <Send size={17} />,
  },
  {
    id: "builder",
    sanskrit: "Vidya",
    hindi: "विद्या",
    english: "Exam Blueprints",
    icon: <BookOpen size={17} />,
  },
  {
    id: "library",
    sanskrit: "Granth",
    hindi: "ग्रन्थ",
    english: "Syllabus Library",
    icon: <Library size={17} />,
  },
  {
    id: "generate",
    sanskrit: "Rachna",
    hindi: "रचना",
    english: "Generate Exam",
    icon: <Sparkles size={17} />,
  },
  {
    id: "import_json",
    sanskrit: "Aayat",
    hindi: "आयात",
    english: "JSON Import",
    icon: <FileCode2 size={17} />,
  },
  {
    id: "history",
    sanskrit: "Itihas",
    hindi: "इतिहास",
    english: "Exam Archives",
    icon: <History size={17} />,
  },
];

const STUDENT_NAV_ITEMS: {
  id: View;
  sanskrit: string;
  hindi: string;
  english: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "dashboard",
    sanskrit: "Aashram",
    hindi: "आश्रम",
    english: "My Dashboard",
    icon: <Home size={17} />,
  },
  {
    id: "quiz",
    sanskrit: "Pariksha",
    hindi: "परीक्षा",
    english: "Quiz Arena",
    icon: <Sparkles size={17} />,
  },
  {
    id: "history",
    sanskrit: "Itihas",
    hindi: "इतिहास",
    english: "My Attempts",
    icon: <History size={17} />,
  },
];

const emptySubscribe = () => () => {};

export default function Sidebar({ activeView, onViewChange, role: propRole }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const isDark = theme === "dark";
  const activeRole = propRole || user?.role || "teacher";
  const navItems = activeRole === "student" ? STUDENT_NAV_ITEMS : activeRole === "admin" ? ADMIN_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  const roleMeta = {
    admin: { label: "Admin Portal", hindi: "प्रशासक", color: "var(--terracotta)", icon: <ShieldCheck size={13} /> },
    teacher: { label: "Teacher Ashram", hindi: "शिक्षक", color: "var(--forest)", icon: <BookOpen size={13} /> },
    student: { label: "Student Arena", hindi: "विद्यार्थी", color: "var(--gold)", icon: <GraduationCap size={13} /> },
  }[activeRole] || { label: "Teacher Ashram", hindi: "शिक्षक", color: "var(--forest)", icon: <BookOpen size={13} /> };

  return (
    <aside className="gurukul-sidebar" aria-label="Main navigation">
      {/* Brand Header */}
      <a
        href="/"
        style={{
          padding: "20px 18px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textDecoration: "none",
        }}
      >
        <GurukulLogo size={38} showText={true} subtitle="Exam Generator" />
      </a>

      {/* Role Pill */}
      <div style={{ padding: "0 14px 12px" }}>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 7,
            fontSize: "11.5px",
            color: roleMeta.color,
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {roleMeta.icon}
            <span>{roleMeta.label}</span>
          </div>
          <span className="shloka" style={{ fontSize: "11px", fontWeight: 600, opacity: 0.85 }}>
            {roleMeta.hindi}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="gurukul-sidebar__nav"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          padding: "6px 10px",
          overflowY: "auto",
        }}
        aria-label="Primary navigation"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="gk-btn"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                justifyContent: "flex-start",
                gap: 10,
                background: isActive ? "var(--accent-light)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-2)",
                border: isActive ? "1px solid var(--accent-mid)" : "1px solid transparent",
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s ease",
                textAlign: "left",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-3)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {item.icon}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", lineHeight: 1.2, fontWeight: isActive ? 700 : 600 }}>
                    {item.sanskrit}
                  </span>
                  <span
                    className="shloka"
                    style={{
                      fontSize: "11.5px",
                      color: isActive ? "var(--accent)" : "var(--text-3)",
                      fontStyle: "normal",
                      fontWeight: 600,
                    }}
                  >
                    {item.hindi}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "10.5px",
                    color: isActive ? "var(--accent-hover)" : "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {item.english}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile & Theme */}
      <div
        style={{
          padding: "12px 14px 16px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* User Card */}
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                {user.full_name || "User"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                {user.scholar_id ? `ID: ${user.scholar_id}` : user.email}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={() => setShowPasswordModal(true)}
                title="Change Password"
                className="gk-btn gk-btn--icon"
                style={{ width: 26, height: 26, padding: 0 }}
              >
                <KeyRound size={13} />
              </button>
              <button
                onClick={logout}
                title="Sign Out"
                className="gk-btn gk-btn--icon"
                style={{ width: 26, height: 26, padding: 0, color: "var(--terracotta)" }}
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}

        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />

        {/* Theme Toggle Button */}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="gk-btn gk-btn--secondary"
            style={{
              width: "100%",
              justifyContent: "center",
              fontSize: "12px",
              padding: "7px 12px",
              gap: 8,
            }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={14} color="var(--gold)" /> : <Moon size={14} color="var(--accent)" />}
            <span>{isDark ? "Day Mode" : "Night Mode"}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
