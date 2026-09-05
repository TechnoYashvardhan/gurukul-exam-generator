"use client";

import React, { useEffect, useState } from "react";
import { Clock, Hourglass } from "lucide-react";

interface QuizCountdownProps {
  targetDate: string; // ISO 8601 UTC string e.g. "2026-09-04T12:00:00Z"
  onComplete?: () => void;
  prefix?: string;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export default function QuizCountdown({
  targetDate,
  onComplete,
  prefix = "Starts in: ",
  className,
  style,
  compact = false,
}: QuizCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    let hasCompleted = false;

    const calcTime = () => {
      const targetTime = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({
          totalMs: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isFinished: true,
        });
        if (!hasCompleted && onComplete) {
          hasCompleted = true;
          onComplete();
        }
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        totalMs: diff,
        days,
        hours,
        minutes,
        seconds,
        isFinished: false,
      });
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 4, ...style }}>
        <Clock size={12} className="spin" />
        <span>Calculating...</span>
      </span>
    );
  }

  if (timeLeft.isFinished) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "var(--forest, #16a34a)",
          fontWeight: 700,
          ...style,
        }}
      >
        <span>⚡ Live Now</span>
      </span>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  let formatted = "";
  if (timeLeft.days > 0) {
    formatted = `${timeLeft.days}d ${timeLeft.hours}h ${pad(timeLeft.minutes)}m`;
  } else if (timeLeft.hours > 0) {
    formatted = `${timeLeft.hours}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`;
  } else {
    formatted = `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        fontFamily: "var(--font-mono, monospace)",
        fontWeight: 600,
        ...style,
      }}
    >
      <Hourglass
        size={compact ? 12 : 14}
        style={{
          animation: "pulse 1.5s ease-in-out infinite",
          flexShrink: 0,
        }}
      />
      <span>
        {prefix}
        {formatted}
      </span>
    </span>
  );
}
