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
        // If external progress is passed, smoothly interpolate toward it
        if (typeof externalProgress === "number" && externalProgress > 0) {
          if (currentProgress < externalProgress) {
            const step = Math.max(0.5, (externalProgress - currentProgress) * 0.2);
            return Math.min(externalProgress, currentProgress + step);
          }
          return currentProgress;
        }

        // Determine current target based on stages and elapsed time
        const currentStage = stages[stageIndex] || stages[stages.length - 1];
        const target = currentStage ? currentStage.targetProgress : 95;

        // Asymptotically approach target
        if (currentProgress < target) {
          const delta = target - currentProgress;
          const increment = Math.max(0.2, delta * 0.08);
          return Math.min(target, currentProgress + increment);
        }

        return currentProgress;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [active, externalProgress, stages, stageIndex]);

  // Stage advancement based on elapsed time if no external override
  useEffect(() => {
    if (!active || typeof externalProgress === "number") return;

    const stageCount = stages.length;
    if (stageCount <= 1) return;

    const stageIntervalSec = Math.max(2, autoAdvanceSeconds);
    const calculatedStage = Math.min(
      stageCount - 1,
      Math.floor(elapsedSeconds / stageIntervalSec)
    );

    if (calculatedStage !== stageIndex) {
      setStageIndex(calculatedStage);
    }
  }, [active, elapsedSeconds, stages, stageIndex, autoAdvanceSeconds, externalProgress]);

  // Map external status to stage if it matches
  useEffect(() => {
    if (!externalStatus) return;
    const lower = externalStatus.toLowerCase();
    const matchedIdx = stages.findIndex(
      (s) =>
        lower.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(lower)
    );
    if (matchedIdx !== -1 && matchedIdx !== stageIndex) {
      setStageIndex(matchedIdx);
    }
  }, [externalStatus, stages, stageIndex]);

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
