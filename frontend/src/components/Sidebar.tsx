import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  BookOpen,
  ScrollText,
  Sparkles,
  Library,
  History,
  Flower2,
  Home,
  LogOut,
  GraduationCap,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import type { UserRole } from "@/types/auth";

export type View = "dashboard" | "builder" | "library" | "generate" | "history" | "quiz";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  role?: UserRole;
}

const DEFAULT_NAV_ITEMS: {
  id: View;
  sanskrit: string;
  english: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "dashboard",
    sanskrit: "Aashram",
    english: "Home",
    icon: <Home size={18} />,
  },
  {
    id: "builder",
    sanskrit: "Vidya",
    english: "Templates",
    icon: <BookOpen size={18} />,
  },
  {
    id: "library",
    sanskrit: "Granth",
    english: "Library",
    icon: <Library size={18} />,
  },
  {
    id: "generate",
    sanskrit: "Rachna",
    english: "Generate",
    icon: <Sparkles size={18} />,
  },
  {
    id: "history",
    sanskrit: "Itihas",
    english: "History",
    icon: <History size={18} />,
  },
];

const STUDENT_NAV_ITEMS: {
  id: View;
  sanskrit: string;
  english: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "dashboard",
    sanskrit: "Aashram",
    english: "Dashboard",
    icon: <Home size={18} />,
  },
  {
    id: "quiz",
    sanskrit: "Pariksha",
    english: "Quiz Arena",
    icon: <Sparkles size={18} />,
  },
  {
    id: "history",
    sanskrit: "Itihas",
    english: "My Attempts",
    icon: <History size={18} />,
  },
];

export default function Sidebar({ activeView, onViewChange, role: propRole }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout, setMockRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";
  const activeRole = propRole || user?.role || "teacher";
  const navItems = activeRole === "student" ? STUDENT_NAV_ITEMS : DEFAULT_NAV_ITEMS;

  const roleLabels = {
    admin: { name: "Admin Sanctuary", color: "var(--terracotta)", icon: <ShieldCheck size={14} /> },
    teacher: { name: "Teacher Ashram", color: "var(--forest)", icon: <BookOpen size={14} /> },
    student: { name: "Student Arena", color: "var(--gold)", icon: <GraduationCap size={14} /> },
  };

  const currentRoleMeta = roleLabels[activeRole] || roleLabels.teacher;

  return (
    <aside className="gurukul-sidebar" aria-label="Main navigation">
      {/* Logo */}
      <a href="/" className="gurukul-sidebar__logo">
        <div className="gurukul-sidebar__logo-icon" aria-hidden="true">
          {/* Diya SVG icon */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="9" rx="3" ry="5" fill="hsl(38, 95%, 60%)" opacity="0.9" />
            <ellipse cx="16" cy="10" rx="1.5" ry="3" fill="hsl(48, 100%, 80%)" />
            <rect x="15.5" y="13" width="1" height="3" rx="0.5" fill="hsl(25, 40%, 35%)" />
            <path d="M8 18 Q8 24 16 25 Q24 24 24 18 L22 16 H10 Z" fill="hsl(35, 70%, 55%)" />
            <path d="M8 18 Q8 22 16 23 Q24 22 24 18" stroke="hsl(35, 60%, 40%)" strokeWidth="0.5" fill="none" />
            <path d="M22 20 Q28 20 28 17" stroke="hsl(35, 70%, 55%)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <ellipse cx="13" cy="20" rx="2" ry="1" fill="hsl(38, 80%, 70%)" opacity="0.4" />
          </svg>
        </div>
        <div>
          <div className="gurukul-sidebar__logo-text">Gurukul AI</div>
          <div className="gurukul-sidebar__logo-sub">{currentRoleMeta.name}</div>
        </div>
      </a>

      {/* Role Pill */}
      <div style={{
        margin: "0 12px 14px",
        padding: "6px 10px",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 11,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: currentRoleMeta.color, fontWeight: 600 }}>
          {currentRoleMeta.icon}
          <span style={{ textTransform: "capitalize" }}>{activeRole}</span>
        </div>
        <button
          onClick={() => {
            const nextRole: UserRole = activeRole === "admin" ? "teacher" : activeRole === "teacher" ? "student" : "admin";
            setMockRole(nextRole);
            router.push(`/${nextRole}`);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-3)",
            fontSize: 10,
            cursor: "pointer",
            textDecoration: "underline",
          }}
          title="Switch role"
        >
          Switch
        </button>
      </div>

      {/* Lotus divider */}
      <div className="lotus-divider">
        <span className="lotus-divider__icon"><Flower2 size={14} /></span>
      </div>

      {/* Navigation */}
      <nav className="gurukul-sidebar__nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`gurukul-sidebar__nav-item ${
              activeView === item.id ? "gurukul-sidebar__nav-item--active" : ""
            }`}
            onClick={() => onViewChange(item.id)}
            aria-current={activeView === item.id ? "page" : undefined}
          >
            <span className="gurukul-sidebar__nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="gurukul-sidebar__nav-labels">
              <span className="gurukul-sidebar__nav-sanskrit">{item.sanskrit}</span>
              <span className="gurukul-sidebar__nav-english">{item.english}</span>
            </span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="gurukul-sidebar__footer">
        <div className="lotus-divider" style={{ marginBottom: 12 }}>
          <span className="lotus-divider__icon"><Flower2 size={14} /></span>
        </div>

        {/* User Info & Logout */}
        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            marginBottom: 10,
          }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>
                {user.full_name || "Scholar"}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: "none",
                border: "none",
                color: "var(--terracotta)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Theme toggle */}
        {mounted && (
          <button
            className="theme-toggle"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="theme-toggle__icon">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </span>
            {isDark ? "Day Ashram" : "Night Ashram"}
          </button>
        )}

        {/* AI tagline */}
        <p
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            marginTop: 10,
            textAlign: "center",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Gurukul AI Ecosystem
        </p>
      </div>
    </aside>
  );
}
