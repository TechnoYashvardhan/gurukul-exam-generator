"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, BookOpen, ScrollText, Sparkles, Library, History, Flower2 } from "lucide-react";

type View = "builder" | "library" | "generate";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const NAV_ITEMS: {
  id: View;
  sanskrit: string;
  english: string;
  icon: React.ReactNode;
}[] = [
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
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  return (
    <aside className="gurukul-sidebar" aria-label="Main navigation">
      {/* Logo */}
      <a href="/" className="gurukul-sidebar__logo">
        <div className="gurukul-sidebar__logo-icon" aria-hidden="true">
          {/* Diya SVG icon */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Flame */}
            <ellipse cx="16" cy="9" rx="3" ry="5" fill="hsl(38, 95%, 60%)" opacity="0.9"/>
            <ellipse cx="16" cy="10" rx="1.5" ry="3" fill="hsl(48, 100%, 80%)"/>
            {/* Wick */}
            <rect x="15.5" y="13" width="1" height="3" rx="0.5" fill="hsl(25, 40%, 35%)"/>
            {/* Diya bowl */}
            <path d="M8 18 Q8 24 16 25 Q24 24 24 18 L22 16 H10 Z" fill="hsl(35, 70%, 55%)"/>
            <path d="M8 18 Q8 22 16 23 Q24 22 24 18" stroke="hsl(35, 60%, 40%)" strokeWidth="0.5" fill="none"/>
            {/* Handle */}
            <path d="M22 20 Q28 20 28 17" stroke="hsl(35, 70%, 55%)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            {/* Oil shine */}
            <ellipse cx="13" cy="20" rx="2" ry="1" fill="hsl(38, 80%, 70%)" opacity="0.4"/>
          </svg>
        </div>
        <div>
          <div className="gurukul-sidebar__logo-text">Gurukul</div>
          <div className="gurukul-sidebar__logo-sub">AI · Exam Generator</div>
        </div>
      </a>

      {/* Lotus divider */}
      <div className="lotus-divider">
        <span className="lotus-divider__icon"><Flower2 size={14} /></span>
      </div>

      {/* Navigation */}
      <nav className="gurukul-sidebar__nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
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

        {/* History (coming soon) */}
        <button
          className="gurukul-sidebar__nav-item"
          style={{ opacity: 0.45, cursor: "not-allowed" }}
          title="Coming soon"
          disabled
        >
          <span className="gurukul-sidebar__nav-icon" aria-hidden="true">
            <History size={18} />
          </span>
          <span className="gurukul-sidebar__nav-labels">
            <span className="gurukul-sidebar__nav-sanskrit">Itihas</span>
            <span className="gurukul-sidebar__nav-english">History · Soon</span>
          </span>
        </button>
      </nav>

      {/* Footer */}
      <div className="gurukul-sidebar__footer">
        <div className="lotus-divider" style={{ marginBottom: 12 }}>
          <span className="lotus-divider__icon"><Flower2 size={14} /></span>
        </div>

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
          Powered by Llama 3.3 70B
        </p>
      </div>
    </aside>
  );
}
