"use client";

import React from "react";

interface GurukulLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  subtitle?: string;
}

export default function GurukulLogo({
  size = 38,
  className = "",
  style,
  showText = false,
  subtitle = "Exam Generator",
}: GurukulLogoProps) {
  return (
    <div
      className={`gurukul-logo-wrap ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: showText ? "10px" : "0",
        ...style,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        style={{ flexShrink: 0, borderRadius: "24%" }}
      >
        <defs>
          {/* Background Radiant Gradient */}
          <linearGradient id="gkLogoBgComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Gold Flame Gradient */}
          <linearGradient id="gkLogoFlameComp" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Squircle Container Badge */}
        <rect width="100" height="100" rx="24" fill="url(#gkLogoBgComp)" />

        {/* Open Granth Pages (Vedic Manuscript Base) */}
        <path
          d="M50 78 C35 72 20 74 15 78 C15 54 34 50 50 55 C66 50 85 54 85 78 C80 74 65 72 50 78 Z"
          fill="#ffffff"
          fillOpacity="0.95"
        />
        <path d="M50 78 V55" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />

        {/* Outer Flame / Sacred Lotus Petals */}
        <path
          d="M50 16 C38 32 32 45 42 54 C46 51 48 46 50 42 C52 46 54 51 58 54 C68 45 62 32 50 16 Z"
          fill="url(#gkLogoFlameComp)"
        />

        {/* Center AI Star / Core Sparkle */}
        <path
          d="M50 32 Q50 39 57 39 Q50 39 50 46 Q50 39 43 39 Q50 39 50 32 Z"
          fill="#ffffff"
        />

        {/* Subtle Vedic Halo Dots */}
        <circle cx="50" cy="12" r="2.5" fill="#fef3c7" />
        <circle cx="38" cy="18" r="1.5" fill="#fef3c7" opacity="0.8" />
        <circle cx="62" cy="18" r="1.5" fill="#fef3c7" opacity="0.8" />
      </svg>

      {showText && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "17px",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Gurukul AI
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-3)",
                letterSpacing: "0.06em",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
