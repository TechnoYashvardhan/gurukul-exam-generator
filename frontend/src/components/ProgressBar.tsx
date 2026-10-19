"use client";

import React from "react";
import { Sparkles, CheckCircle2, Clock, Lightbulb, Activity } from "lucide-react";
import type { ProgressStage } from "@/hooks/useProgressSimulation";

export interface ProgressBarProps {
  progress: number; // 0 to 100
  size?: "sm" | "md" | "lg";
  color?: "accent" | "gradient" | "forest" | "gold" | "indigo";
  animated?: boolean;
  striped?: boolean;
  showLabel?: boolean;
  label?: string;
  sublabel?: string;
  showPercentage?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ProgressBar({
  progress,
  size = "md",
  color = "gradient",
  animated = true,
  striped = true,
  showLabel = false,
  label,
  sublabel,
  showPercentage = false,
  className = "",
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  const heightMap = {
    sm: "6px",
    md: "10px",
    lg: "16px",
  };

  const colorStyles: Record<string, { bg: string; shadow: string }> = {
    gradient: {
      bg: "linear-gradient(90deg, #ea580c 0%, #f59e0b 50%, #6366f1 100%)",
      shadow: "0 0 12px rgba(234, 88, 12, 0.4)",
    },
    accent: {
      bg: "linear-gradient(90deg, var(--terracotta, #ea580c), var(--accent, #d97706))",
      shadow: "0 0 10px rgba(217, 119, 6, 0.35)",
    },
    forest: {
      bg: "linear-gradient(90deg, #10b981, #059669)",
      shadow: "0 0 10px rgba(16, 185, 129, 0.35)",
    },
    gold: {
      bg: "linear-gradient(90deg, #f59e0b, #d97706)",
      shadow: "0 0 10px rgba(245, 158, 11, 0.35)",
    },
    indigo: {
      bg: "linear-gradient(90deg, #6366f1, #8b5cf6)",
      shadow: "0 0 10px rgba(99, 102, 241, 0.35)",
    },
  };

  const selectedTheme = colorStyles[color] || colorStyles.gradient;

  return (
    <div className={`gk-progress-wrapper ${className}`} style={{ width: "100%", ...style }}>
      {(showLabel || showPercentage) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
            fontSize: size === "sm" ? "11.5px" : "13px",
          }}
        >
          {showLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
              <span style={{ color: "var(--text, #1e293b)" }}>{label}</span>
              {sublabel && (
                <span style={{ color: "var(--text-3, #94a3b8)", fontSize: "11.5px", fontWeight: 400 }}>
                  ({sublabel})
                </span>
              )}
            </div>
          )}
          {showPercentage && (
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                color: "var(--accent, #ea580c)",
                marginLeft: "auto",
              }}
            >
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div
        style={{
          width: "100%",
          height: heightMap[size],
          background: "var(--surface-sunken, rgba(0, 0, 0, 0.08))",
          borderRadius: "999px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.12)",
          border: "1px solid var(--border, rgba(226, 232, 240, 0.6))",
        }}
      >
        {/* Fill Bar */}
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: selectedTheme.bg,
            borderRadius: "999px",
            transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            boxShadow: clamped > 0 ? selectedTheme.shadow : "none",
          }}
        >
          {/* Active Shimmer Wave */}
          {animated && clamped < 100 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  "linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%)",
                backgroundSize: "200% 100%",
                animation: "gkShimmerMove 1.6s infinite linear",
              }}
            />
          )}

          {/* Striped Pattern */}
          {striped && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
                backgroundSize: "16px 16px",
                animation: animated ? "gkStripesMove 1s linear infinite" : "none",
                opacity: 0.6,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export interface ProgressTrackerProps {
  title: string;
  subtitle?: string;
  stages?: ProgressStage[];
  stageIndex?: number;
  progress: number;
  statusMessage?: string;
  formattedTime?: string;
  tip?: string;
  variant?: "card" | "modal" | "inline";
  onCancel?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ProgressTracker({
  title,
  subtitle,
  stages = [],
  stageIndex = 0,
  progress,
  statusMessage,
  formattedTime,
  tip,
  variant = "card",
  onCancel,
  className = "",
  style,
}: ProgressTrackerProps) {
  const content = (
    <div
      className={`gk-progress-tracker gk-progress-tracker--${variant} ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: variant === "inline" ? "10px 14px" : "20px 24px",
        background: variant === "modal" ? "var(--surface, #ffffff)" : "var(--surface-sunken, #f8fafc)",
        border: "1.5px solid var(--accent-mid, rgba(234, 88, 12, 0.25))",
        borderRadius: "var(--radius-md, 12px)",
        boxShadow: variant === "modal" ? "0 20px 50px rgba(0, 0, 0, 0.35)" : "0 4px 16px rgba(0, 0, 0, 0.04)",
        ...style,
      }}
    >
      {/* Top Header with Title, Timer & Active Pulse */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(99, 102, 241, 0.15))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent, #ea580c)",
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} className="spin" style={{ animationDuration: "6s" }} />
          </div>
          <div>
            <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text, #1e293b)", lineHeight: 1.3 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: "12px", color: "var(--text-3, #64748b)", marginTop: "2px" }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Live Elapsed Timer */}
        {formattedTime && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--accent, #ea580c)",
              flexShrink: 0,
            }}
          >
            <Clock size={12} />
            <span>{formattedTime}</span>
          </div>
        )}
      </div>

      {/* Progress Bar with Live % */}
      <div>
        <ProgressBar
          progress={progress}
          size="md"
          color="gradient"
          showPercentage={true}
          showLabel={true}
          label={statusMessage || "Processing..."}
        />
      </div>

      {/* Multi-Stage Stepper & Status Indicator */}
      {stages && stages.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "4px",
          }}
        >
          {/* Step Progress Pills - Clean, wrapping and responsive without clipping */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {stages.map((stg, idx) => {
              const isCompleted = idx < stageIndex || progress >= 100;
              const isCurrent = idx === stageIndex && progress < 100;

              return (
                <div
                  key={idx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background: isCurrent
                      ? "rgba(234, 88, 12, 0.12)"
                      : isCompleted
                      ? "rgba(16, 185, 129, 0.1)"
                      : "var(--surface, #ffffff)",
                    border: isCurrent
                      ? "1.5px solid var(--accent, #ea580c)"
                      : isCompleted
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid var(--border, #e2e8f0)",
                    fontSize: "11.5px",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent
                      ? "var(--accent, #ea580c)"
                      : isCompleted
                      ? "var(--forest, #10b981)"
                      : "var(--text-3, #94a3b8)",
                    transition: "all 0.25s ease",
                    boxShadow: isCurrent ? "0 2px 8px rgba(234, 88, 12, 0.15)" : "none",
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={13} style={{ flexShrink: 0, color: "var(--forest, #10b981)" }} />
                  ) : isCurrent ? (
                    <span
                      className="spin"
                      style={{
                        width: 10,
                        height: 10,
                        border: "2px solid currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "var(--border, #e2e8f0)",
                        color: "var(--text-3, #94a3b8)",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                  )}
                  <span style={{ lineHeight: 1.2 }}>
                    {stg.name.replace(/\.{3}$/, "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pedagogical AI Tip or Live Insight */}
      {tip && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "8px 12px",
            background: "rgba(99, 102, 241, 0.06)",
            border: "1px solid rgba(99, 102, 241, 0.18)",
            borderRadius: "var(--radius-sm, 6px)",
            fontSize: "12px",
            color: "var(--text-2, #475569)",
            lineHeight: 1.45,
          }}
        >
          <Lightbulb size={14} style={{ color: "var(--primary, #6366f1)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "var(--primary, #6366f1)", marginRight: "4px" }}>Gurukul Insight:</strong>
            <span>{tip}</span>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "modal") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
        }}
      >
        <div style={{ maxWidth: "540px", width: "100%", animation: "fadeIn 0.25s ease-out" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
