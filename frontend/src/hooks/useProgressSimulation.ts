"use client";

import { useEffect, useRef, useState } from "react";

export interface ProgressStage {
  name: string;
  targetProgress: number; // 0 to 100
  detail?: string;
}

export interface UseProgressSimulationOptions {
  active: boolean;
  stages?: ProgressStage[];
  externalProgress?: number | null;
  externalStatus?: string | null;
  tips?: string[];
  autoAdvanceSeconds?: number;
}

export function useProgressSimulation({
  active,
  stages = [
    { name: "Initializing pipeline...", targetProgress: 15 },
    { name: "Retrieving syllabus & context...", targetProgress: 40 },
    { name: "Synthesizing question structures...", targetProgress: 75 },
    { name: "Polishing LaTeX & rubric...", targetProgress: 95 },
  ],
  externalProgress,
  externalStatus,
  tips = [
    "Gurukul AI balances Bloom's taxonomy across recall, analytical, and application levels.",
    "Mathematical symbols and formulas are verified via academic KaTeX formatting.",
    "Passage sub-questions follow standard CBSE Roman numeral and mark allocations.",
    "Internal choice questions provide balanced alternative difficulty and word limits.",
  ],
  autoAdvanceSeconds = 3,
}: UseProgressSimulationOptions) {
  const [progress, setProgress] = useState<number>(0);
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [tipIndex, setTipIndex] = useState<number>(0);

  const startTimeRef = useRef<number | null>(null);

  // Timer & active lifecycle
  useEffect(() => {
    if (!active) {
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = Date.now();
    setProgress((prev) => (prev > 0 && prev < 90 ? prev : 5));
    setStageIndex(0);
    setElapsedSeconds(0);

    const timerInterval = setInterval(() => {
      if (startTimeRef.current) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(secs);
      }
    }, 1000);

    const tipInterval = setInterval(() => {
      if (tips && tips.length > 0) {
        setTipIndex((prev) => (prev + 1) % tips.length);
      }
    }, 4500);

    return () => {
      clearInterval(timerInterval);
      clearInterval(tipInterval);
    };
  }, [active, tips]);

  // Smooth progressive animation ticker
  useEffect(() => {
    if (!active) return;

    const progressInterval = setInterval(() => {
      setProgress((currentProgress) => {
        // If external numeric progress is passed, smoothly interpolate toward it
        if (typeof externalProgress === "number" && externalProgress > 0) {
          if (currentProgress < externalProgress) {
            const step = Math.max(0.5, (externalProgress - currentProgress) * 0.2);
            return Math.min(externalProgress, currentProgress + step);
          }
          return currentProgress;
        }

        // Determine current target based on active stage
        const currentStage = stages[stageIndex] || stages[stages.length - 1];
        let target = currentStage ? currentStage.targetProgress : 95;

        // If in synthesis/batch writing phase, let it slowly creep between 30% and 65% based on elapsed time
        if (stageIndex === 1 && target <= 65) {
          target = Math.min(68, 35 + Math.floor(elapsedSeconds * 1.2));
        }

        // Asymptotically approach target with natural slowing
        if (currentProgress < target) {
          const delta = target - currentProgress;
          const increment = Math.max(0.15, delta * 0.07);
          return Math.min(target, currentProgress + increment);
        }

        return currentProgress;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [active, externalProgress, stages, stageIndex, elapsedSeconds]);

  // Stage advancement based on external status keywords or fallback timer
  useEffect(() => {
    if (!active || typeof externalProgress === "number") return;

    if (externalStatus) {
      const lower = externalStatus.toLowerCase();
      let matchedIdx = -1;

      // Smart semantic keyword mapping for backend status streams
      if (lower.includes("architect") || lower.includes("blueprint") || lower.includes("init") || lower.includes("connect")) {
        matchedIdx = 0;
      } else if (lower.includes("writing") || lower.includes("batch") || lower.includes("synthesiz") || lower.includes("parallel") || lower.includes("generat")) {
        matchedIdx = Math.min(1, stages.length - 1);
      } else if (lower.includes("validat") || lower.includes("repair") || lower.includes("rescu") || lower.includes("latex") || lower.includes("rubric")) {
        matchedIdx = Math.min(2, stages.length - 1);
      } else if (lower.includes("final") || lower.includes("touch") || lower.includes("polish") || lower.includes("assembl")) {
        matchedIdx = Math.min(3, stages.length - 1);
      } else {
        // Fallback substring matching
        matchedIdx = stages.findIndex(
          (s) =>
            lower.includes(s.name.toLowerCase().replace(/\.{3}$/, "")) ||
            s.name.toLowerCase().replace(/\.{3}$/, "").includes(lower)
        );
      }

      if (matchedIdx !== -1 && matchedIdx !== stageIndex) {
        setStageIndex(matchedIdx);
      }
      return;
    }

    // Fallback timer-based stage progression (capped before the final stage so it never prematurely claims 95%)
    const stageCount = stages.length;
    if (stageCount <= 1) return;

    const stageIntervalSec = Math.max(4, autoAdvanceSeconds);
    const maxTimerStage = Math.max(0, stageCount - 2); // Cap at second-to-last stage
    const calculatedStage = Math.min(
      maxTimerStage,
      Math.floor(elapsedSeconds / stageIntervalSec)
    );

    if (calculatedStage !== stageIndex && calculatedStage > stageIndex) {
      setStageIndex(calculatedStage);
    }
  }, [active, elapsedSeconds, stages, stageIndex, autoAdvanceSeconds, externalProgress, externalStatus]);

  const currentStage = stages[stageIndex] || stages[0];
  const currentStatusMessage = externalStatus || currentStage?.name || "Processing...";

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return {
    progress: Math.round(progress),
    stageIndex,
    currentStage,
    currentStatusMessage,
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    currentTip: tips[tipIndex] || "",
  };
}
