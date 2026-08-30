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
        style={{ flexShrink: 0, borderRadius: "22%" }}
      >
        <defs>
          {/* Vedic Saffron-Gold Radiant Gradient */}
          <linearGradient id="gkLogoBgVedic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Glowing Sacred Flame Gradient */}
          <linearGradient id="gkVedicFlame" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Inner Core Flame */}
          <linearGradient id="gkInnerFlame" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Squircle Badge with Golden Inner Rim */}
        <rect width="100" height="100" rx="22" fill="url(#gkLogoBgVedic)" />
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="20"
          stroke="#fef3c7"
          strokeWidth="1.2"
          strokeOpacity="0.35"
        />

        {/* Surya Mandala Rays (Sun of Knowledge Aura) */}
        <g stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
          <line x1="50" y1="8" x2="50" y2="14" />
          <line x1="50" y1="86" x2="50" y2="92" />
          <line x1="8" y1="50" x2="14" y2="50" />
          <line x1="86" y1="50" x2="92" y2="50" />
          <line x1="20" y1="20" x2="25" y2="25" />
          <line x1="80" y1="20" x2="75" y2="25" />
          <line x1="20" y1="80" x2="25" y2="75" />
          <line x1="80" y1="80" x2="75" y2="75" />
        </g>

        {/* Open Granth Pages (Layered Palm Leaf Manuscript) */}
        <path
          d="M50 78 C34 72 20 74 15 78 C15 56 32 52 50 57 C68 52 85 56 85 78 C80 74 66 72 50 78 Z"
          fill="#ffffff"
        />
        {/* Spine Line & Sacred Bookmark Ribbon */}
        <path d="M50 78 V57" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M50 78 L53 84 L50 82 L47 84 Z" fill="#fef3c7" />

        {/* Multi-tiered Vedic Flame (ज्ञान दीप) */}
        <path
          d="M50 15 C34 32 30 46 41 55 C46 52 48 47 50 43 C52 47 54 52 59 55 C70 46 66 32 50 15 Z"
          fill="url(#gkVedicFlame)"
        />

        {/* Inner Heart Flame */}
        <path
          d="M50 25 C42 36 42 46 50 51 C58 46 58 36 50 25 Z"
          fill="url(#gkInnerFlame)"
          opacity="0.9"
        />

        {/* AI Diamond Sparkle (प्रज्ञा) */}
        <path
          d="M50 34 Q50 40 56 40 Q50 40 50 46 Q50 40 44 40 Q50 40 50 34 Z"
          fill="#ffffff"
        />

        {/* Sacred Bindi / Tilak Top Dot */}
        <circle cx="50" cy="11" r="2" fill="#fffbeb" />
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
