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
  const numericSize = typeof size === "number" ? size : parseInt(String(size), 10) || 38;

  return (
    <div
      className={`gurukul-logo-wrap ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: showText ? "12px" : "0",
        ...style,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        style={{
          flexShrink: 0,
          filter: "drop-shadow(0 3px 10px rgba(184, 58, 36, 0.35))",
        }}
      >
        <defs>
          {/* Subtle Squircle Background Accent */}
          <linearGradient id="gkLogoTileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1724" />
            <stop offset="100%" stopColor="#120E17" />
          </linearGradient>

          {/* Flame Halo Glow */}
          <radialGradient id="gkLogoFlameGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Terracotta Clay Gradients */}
          <linearGradient id="gkLogoClayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BD3820" />
            <stop offset="100%" stopColor="#7E1C0E" />
          </linearGradient>

          {/* Oil Pool */}
          <linearGradient id="gkLogoOilGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Gold Trim */}
          <linearGradient id="gkLogoGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
        </defs>

        {/* Squircle Badge Tile */}
        <rect width="100" height="100" rx="24" fill="url(#gkLogoTileGrad)" />
        <rect
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="22.5"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeOpacity="0.25"
        />

        {/* Ambient Flame Glow */}
        <circle cx="50" cy="36" r="28" fill="url(#gkLogoFlameGlow)" />

        {/* ── 3-TIER LIVING FLAME ── */}
        {/* Outer Yellow/Gold Flame */}
        <path
          d="M50 10
             C62 26 64 42 50 54
             C36 42 38 26 50 10 Z"
          fill="#FBBF24"
          filter="drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))"
        />

        {/* Middle Orange Flame */}
        <path
          d="M50 24
             C58 35 59 45 50 54
             C41 45 42 35 50 24 Z"
          fill="#F97316"
        />

        {/* Inner Crimson Flame */}
        <path
          d="M50 36
             C55 43 55 49 50 54
             C45 49 45 43 50 36 Z"
          fill="#B91C1C"
        />

        {/* ── TERRACOTTA DIYA BOWL ── */}
        {/* Back Basin Cavity */}
        <path
          d="M12 60
             C16 56 36 54 50 56
             C64 54 84 56 88 60
             C82 63 66 65 50 64
             C34 65 18 63 12 60 Z"
          fill="#5E1408"
        />

        {/* Oil Pools */}
        <ellipse cx="32" cy="61" rx="18" ry="3.5" fill="url(#gkLogoOilGrad)" />
        <ellipse cx="68" cy="61" rx="18" ry="3.5" fill="url(#gkLogoOilGrad)" />

        {/* Main Clay Body */}
        <path
          d="M12 60
             C12 60 15 82 50 91
             C85 82 88 60 88 60
             C80 64 66 66 50 64
             C34 66 20 64 12 60 Z"
          fill="url(#gkLogoClayGrad)"
          stroke="#5E1408"
          strokeWidth="0.8"
        />

        {/* Center Lip / Spout Peak */}
        <path
          d="M50 54 L46 60 C48 64 52 64 54 60 Z"
          fill="#8C2212"
        />

        {/* Gold Side Trims */}
        <path
          d="M13 67 C20 72 30 73 32 72 L32 82 C30 86 37 89 37 89 C32 86 29 80 29 74 C26 74 19 71 13 67 Z"
          fill="url(#gkLogoGoldGrad)"
          opacity="0.9"
        />
        <path
          d="M87 67 C80 72 70 73 68 72 L68 82 C70 86 63 89 63 89 C68 86 71 80 71 74 C74 74 81 71 87 67 Z"
          fill="url(#gkLogoGoldGrad)"
          opacity="0.9"
        />

        {/* ── EMBOSSED LOTUS MOTIF ── */}
        {/* Center Bud */}
        <path
          d="M50 67 C53 73 54 78 50 83 C46 78 47 73 50 67 Z"
          fill="#E05B3D"
        />
        {/* Inner Petals */}
        <path
          d="M50 82 C45 77 42 72 44 69 C46 73 48 78 50 82 Z"
          fill="#DE6648"
        />
        <path
          d="M50 82 C55 77 58 72 56 69 C54 73 52 78 50 82 Z"
          fill="#DE6648"
        />
        {/* Outer Petals */}
        <path
          d="M50 83 C42 80 37 75 39 72 C42 75 46 80 50 83 Z"
          fill="#E5765A"
        />
        <path
          d="M50 83 C58 80 63 75 61 72 C58 75 54 80 50 83 Z"
          fill="#E5765A"
        />
        {/* Bottom Drop */}
        <path
          d="M50 87 C52 85 53 83 50 83 C47 83 48 85 50 87 Z"
          fill="#E05B3D"
        />
      </svg>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: numericSize > 40 ? "22px" : "18px",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>Gurukul</span>
            <span
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, var(--gold) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 900,
              }}
            >
              AI
            </span>
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-3)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: "2px",
                fontWeight: 600,
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
