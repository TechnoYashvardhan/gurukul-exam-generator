"use client";

import React, { useEffect, useRef } from "react";

interface DiyaAnimationProps {
  title?: string;
  subtitle?: string;
  shloka?: string;
  translation?: string;
  background?: string;
}

export default function DiyaAnimation({
  title = "Gurukul AI",
  subtitle = "Where Traditional Rigor Meets Intelligent Assessment",
  shloka = "तमसो मा ज्योतिर्गमय",
  translation = "Lead me from darkness unto light",
  background = "transparent",
}: DiyaAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flameGroupRef = useRef<SVGGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);
    let animationId: number;

    const resize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", resize);

    // Warm ember particle system
    class Ember {
      x = 0;
      y = 0;
      vx = 0;
      vy = 0;
      size = 0;
      life = 0;
      decay = 0;
      hue = 0;
      age = 0;
      wobbleSpeed = 0;
      wobbleAmp = 0;

      constructor() {
        this.reset();
        this.life = Math.random();
      }

      reset() {
        this.x = width / 2 + (Math.random() - 0.5) * 60;
        this.y = height / 2 - 40 + (Math.random() - 0.5) * 30;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = -(Math.random() * 1.5 + 0.5);
        this.size = Math.random() * 2.4 + 0.6;
        this.life = 1;
        this.decay = Math.random() * 0.009 + 0.004;
        this.hue = 30 + Math.random() * 25; // saffron to warm gold
        this.wobbleSpeed = Math.random() * 0.03 + 0.01;
        this.wobbleAmp = Math.random() * 0.8 + 0.2;
        this.age = 0;
      }

      update(mouseX: number, mouseY: number) {
        this.age++;
        this.x += this.vx + Math.sin(this.age * this.wobbleSpeed) * this.wobbleAmp;
        this.y += this.vy;
        this.vy -= 0.002;
        this.life -= this.decay;

        // Mouse proximity reaction
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.45;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force * 0.6;
        }

        if (this.life <= 0) this.reset();
      }

      draw() {
        if (!ctx) return;
        const alpha = Math.max(0, this.life * 0.75);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 95%, 60%, ${alpha})`;
        ctx.fill();

        if (this.size > 1.4) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * this.life * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${this.hue}, 90%, 55%, ${alpha * 0.2})`;
          ctx.fill();
        }
      }
    }

    const embers: Ember[] = Array.from({ length: 48 }, () => new Ember());
    let mousePos = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (flameGroupRef.current) {
        const flameCenterX = width / 2;
        const flameCenterY = height / 2 - 40;
        const dx = (mousePos.x - flameCenterX) / width;
        const dy = (mousePos.y - flameCenterY) / height;
        const dist = Math.sqrt(Math.pow(mousePos.x - flameCenterX, 2) + Math.pow(mousePos.y - flameCenterY, 2));

        if (dist < 280) {
          const intensity = (280 - dist) / 280;
          const lean = dx * 16 * intensity;
          flameGroupRef.current.style.transform = `rotate(${lean}deg) scale(${1 + intensity * 0.1})`;
        } else {
          flameGroupRef.current.style.transform = "rotate(0deg) scale(1)";
        }
      }
    };

    const handleMouseLeave = () => {
      mousePos = { x: -1000, y: -1000 };
      if (flameGroupRef.current) {
        flameGroupRef.current.style.transform = "rotate(0deg) scale(1)";
      }
    };

    const parentEl = canvas.parentElement;
    parentEl?.addEventListener("mousemove", handleMouseMove);
    parentEl?.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (const e of embers) {
        e.update(mousePos.x, mousePos.y);
        e.draw();
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      parentEl?.removeEventListener("mousemove", handleMouseMove);
      parentEl?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 440,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: background || "transparent",
        color: "var(--text)",
        padding: "24px 20px",
      }}
    >
      {/* ── Keyframes for Organic 3-Tier Flame Animation ── */}
      <style>{`
        @keyframes outerFlameDance {
          0%, 100% {
            transform: scale(1) rotate(0deg) skewX(0deg);
          }
          25% {
            transform: scale(0.97, 1.05) rotate(-1.5deg) skewX(-1deg);
          }
          50% {
            transform: scale(1.04, 0.96) rotate(1.2deg) skewX(0.8deg);
          }
          75% {
            transform: scale(0.98, 1.03) rotate(-0.8deg) skewX(-0.5deg);
          }
        }

        @keyframes middleFlameDance {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          30% {
            transform: scale(1.06, 0.94) rotate(2deg);
          }
          60% {
            transform: scale(0.94, 1.06) rotate(-1.8deg);
          }
          85% {
            transform: scale(1.03, 0.97) rotate(0.9deg);
          }
        }

        @keyframes innerFlameDance {
          0%, 100% {
            transform: scale(1) translateY(0);
            opacity: 0.95;
          }
          35% {
            transform: scale(1.1, 0.9) translateY(1.5px);
            opacity: 1;
          }
          70% {
            transform: scale(0.9, 1.1) translateY(-1.5px);
            opacity: 0.88;
          }
        }

        @keyframes flameGlowBreath {
          0%, 100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.18);
          }
        }

        .diya-outer-flame {
          transform-origin: 200px 205px;
          animation: outerFlameDance 2.6s ease-in-out infinite alternate;
        }

        .diya-middle-flame {
          transform-origin: 200px 205px;
          animation: middleFlameDance 1.9s ease-in-out infinite alternate;
        }

        .diya-inner-flame {
          transform-origin: 200px 205px;
          animation: innerFlameDance 1.3s ease-in-out infinite alternate;
        }

        .diya-glow-halo {
          transform-origin: 200px 120px;
          animation: flameGlowBreath 3s ease-in-out infinite;
        }
      `}</style>

      {/* Canvas for Ember Particles */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Ambient Core Glow */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(234, 88, 12, 0.1) 45%, transparent 70%)",
          filter: "blur(36px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Header Branding */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            lineHeight: 1.15,
          }}
        >
          {title.split(" ")[0]}{" "}
          <span
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, var(--gold) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title.split(" ").slice(1).join(" ") || "AI"}
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "12.5px",
            color: "var(--text-2)",
            letterSpacing: "0.03em",
            marginTop: 6,
            maxWidth: 380,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* ── Terracotta Lotus Diya SVG Stage ── */}
      <div
        style={{
          position: "relative",
          width: "min(340px, 85vw)",
          height: "min(340px, 85vw)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <svg
          viewBox="0 0 400 400"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: "drop-shadow(0 12px 28px rgba(234, 88, 12, 0.25)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12))",
          }}
        >
          <defs>
            {/* Radiant Flame Glow */}
            <radialGradient id="exactDiyaFlameAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#EA580C" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
            </radialGradient>

            {/* Terracotta Clay Gradients */}
            <linearGradient id="exactClayBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9E2A18" />
              <stop offset="40%" stopColor="#BD3820" />
              <stop offset="100%" stopColor="#7E1C0E" />
            </linearGradient>

            <linearGradient id="exactClayRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8C2212" />
              <stop offset="50%" stopColor="#A82E1A" />
              <stop offset="100%" stopColor="#8C2212" />
            </linearGradient>

            {/* Oil Surface Pool Gradients */}
            <linearGradient id="exactOilLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            <linearGradient id="exactOilRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Golden Trim Gradient */}
            <linearGradient id="exactGoldFiligreeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
          </defs>

          {/* Ambient Flame Glow */}
          <circle className="diya-glow-halo" cx="200" cy="120" r="110" fill="url(#exactDiyaFlameAura)" />

          {/* ══════════════════════════════════════════
               ANIMATED 3-TIER LIVING FLAME
               ══════════════════════════════════════════ */}
          <g
            ref={flameGroupRef}
            style={{
              transformOrigin: "200px 205px",
              transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Outer Flame: Radiant Sunny Gold */}
            <path
              className="diya-outer-flame"
              d="M200 32
                 C242 90 248 152 200 205
                 C152 152 158 90 200 32 Z"
              fill="#FBBF24"
              filter="drop-shadow(0 0 14px rgba(251, 191, 36, 0.65))"
            />

            {/* Middle Flame: Vibrant Saffron Orange */}
            <path
              className="diya-middle-flame"
              d="M200 86
                 C232 130 234 168 200 205
                 C166 168 168 130 200 86 Z"
              fill="#F97316"
            />

            {/* Inner Core Flame: Deep Crimson Red */}
            <path
              className="diya-inner-flame"
              d="M200 134
                 C218 160 219 184 200 205
                 C181 184 182 160 200 134 Z"
              fill="#B91C1C"
            />
          </g>

          {/* ══════════════════════════════════════════
               TERRACOTTA DIYA BODY & DUAL OIL BASINS
               ══════════════════════════════════════════ */}
          {/* Back Wall Interior Shadow */}
          <path
            d="M32 232
               C50 216 140 210 200 216
               C260 210 350 216 368 232
               C340 242 270 248 200 246
               C130 248 60 242 32 232 Z"
            fill="#5E1408"
          />

          {/* Left Oil Pool Surface */}
          <ellipse cx="120" cy="235" rx="80" ry="14" fill="url(#exactOilLeftGrad)" />

          {/* Right Oil Pool Surface */}
          <ellipse cx="280" cy="235" rx="80" ry="14" fill="url(#exactOilRightGrad)" />

          {/* Inner Crease Shadow */}
          <path
            d="M36 233 C60 224 150 220 200 226 C150 234 60 238 36 233 Z"
            fill="#7A1C0E"
            opacity="0.8"
          />
          <path
            d="M364 233 C340 224 250 220 200 226 C250 234 340 238 364 233 Z"
            fill="#7A1C0E"
            opacity="0.8"
          />

          {/* Main Terracotta Clay Bowl */}
          <path
            d="M32 230
               C32 230 45 320 200 365
               C355 320 368 230 368 230
               C330 246 270 254 200 246
               C130 254 70 246 32 230 Z"
            fill="url(#exactClayBodyGrad)"
            stroke="#6E1609"
            strokeWidth="1.5"
          />

          {/* Central Spout Peak / Lip */}
          <path
            d="M200 205
               L186 230
               C192 248 208 248 214 230
               Z"
            fill="#8C2212"
          />

          {/* Front Rim Bevel Highlight */}
          <path
            d="M32 230
               C75 252 135 256 194 246
               L200 244
               L206 246
               C265 256 325 252 368 230
               C332 242 270 249 200 241
               C130 249 68 242 32 230 Z"
            fill="url(#exactClayRimGrad)"
            opacity="0.9"
          />

          {/* ══════════════════════════════════════════
               GOLDEN FILIGREE RIBBON TRIMS
               ══════════════════════════════════════════ */}
          {/* Left Golden Filigree Ribbon */}
          <path
            d="M36 260
               C70 280 120 285 130 280
               L128 322
               C122 342 150 354 150 354
               C130 340 118 316 118 290
               C105 288 65 276 36 260 Z"
            fill="url(#exactGoldFiligreeGrad)"
            opacity="0.95"
          />

          {/* Right Golden Filigree Ribbon */}
          <path
            d="M364 260
               C330 280 280 285 270 280
               L272 322
               C278 342 250 354 250 354
               C270 340 282 316 282 290
               C295 288 335 276 364 260 Z"
            fill="url(#exactGoldFiligreeGrad)"
            opacity="0.95"
          />

          {/* ══════════════════════════════════════════
               SACRED LOTUS MOTIF (Padma in Center)
               ══════════════════════════════════════════ */}
          {/* Center Main Petal (Core Bud) */}
          <path
            d="M200 256
               C212 280 216 304 200 324
               C184 304 188 280 200 256 Z"
            fill="#C4442A"
          />
          {/* Center Main Petal Inner Highlight */}
          <path
            d="M200 262
               C208 282 211 300 200 318
               C189 300 192 282 200 262 Z"
            fill="#E05B3D"
          />

          {/* Inner Left Petal */}
          <path
            d="M200 320
               C180 300 168 280 178 266
               C186 282 194 302 200 320 Z"
            fill="#DE6648"
          />
          {/* Inner Right Petal */}
          <path
            d="M200 320
               C220 300 232 280 222 266
               C214 282 206 302 200 320 Z"
            fill="#DE6648"
          />

          {/* Outer Left Petal */}
          <path
            d="M200 324
               C170 310 146 290 156 278
               C168 292 182 310 200 324 Z"
            fill="#E5765A"
          />
          {/* Outer Right Petal */}
          <path
            d="M200 324
               C230 310 254 290 244 278
               C232 292 218 310 200 324 Z"
            fill="#E5765A"
          />

          {/* Low Flanking Petal Left */}
          <path
            d="M195 328
               C165 320 145 312 145 304
               C160 310 180 320 195 328 Z"
            fill="#C85237"
          />
          {/* Low Flanking Petal Right */}
          <path
            d="M205 328
               C235 320 255 312 255 304
               C240 310 220 320 205 328 Z"
            fill="#C85237"
          />

          {/* Base Sepal */}
          <path
            d="M200 342
               C208 332 212 324 200 322
               C188 324 192 332 200 342 Z"
            fill="#E05B3D"
          />
        </svg>
      </div>

      {/* Sanskrit Shloka Shimmer */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          textAlign: "center",
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-shloka)",
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--accent-mid)",
            letterSpacing: "0.06em",
            textShadow: "0 0 16px rgba(245, 158, 11, 0.35)",
          }}
        >
          {shloka}
        </div>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            color: "var(--text-3)",
            letterSpacing: "0.08em",
            marginTop: 4,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {translation}
        </div>
      </div>
    </div>
  );
}
