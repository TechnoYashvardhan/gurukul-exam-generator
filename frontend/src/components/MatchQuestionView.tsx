"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import MathText from "./MathText";
import { Check, RefreshCw, Sparkles, HelpCircle, X, Zap } from "lucide-react";

export interface ColumnItem {
  id: string;
  text: string;
}

export interface ParsedMatchData {
  premise: string;
  columnA: ColumnItem[];
  columnB: ColumnItem[];
  hasColumns: boolean;
}

const IGNORED_PAREN_WORDS = new Set([
  "non", "and", "the", "for", "with", "via", "per", "etc", "eg", "ie", "approx", "opt", "vol", "fig", "ref", "inc"
]);

/**
 * Robust, foolproof parser that extracts Column I and Column II items from all LLM formats.
 * Fixes parenthetical words like (non-volatile) from being recognized as identifiers.
 */
export function parseMatchText(rawText: string): ParsedMatchData {
  if (!rawText) {
    return { premise: "", columnA: [], columnB: [], hasColumns: false };
  }

  const text = rawText.trim();

  // 1. Search for Column I / Column II header boundaries
  const col1Regex = /(?:(?:^|[\n\.\:\;])\s*)(?:Column\s*[-–—:]?\s*(?:I|1|A)|स्तम्भ\s*[-–—:]?\s*(?:1|I)|कॉलम\s*[-–—:]?\s*(?:1|I))\s*[:\-\n\s]+/gi;
  const col2Regex = /(?:(?:^|[\n\.\:\;])\s*)(?:Column\s*[-–—:]?\s*(?:II|2|B)|स्तम्भ\s*[-–—:]?\s*(?:2|II)|कॉलम\s*[-–—:]?\s*(?:2|II))\s*[:\-\n\s]+/gi;

  const col1Matches = Array.from(text.matchAll(col1Regex));
  const col2Matches = Array.from(text.matchAll(col2Regex));

  if (col1Matches.length > 0 && col2Matches.length > 0) {
    const col2M = col2Matches[col2Matches.length - 1];
    const validCol1 = col1Matches.filter((m) => (m.index ?? 0) < (col2M.index ?? 0));

    if (validCol1.length > 0) {
      const col1M = validCol1[validCol1.length - 1];
      const col1Idx = col1M.index ?? 0;
      const col2Idx = col2M.index ?? 0;

      const premise = text.slice(0, col1Idx).trim();
      const col1Raw = text.slice(col1Idx + col1M[0].length, col2Idx).trim();
      const col2Raw = text.slice(col2Idx + col2M[0].length).trim();

      const aItems = parseTokenItems(col1Raw, "numeric");
      const bItems = parseTokenItems(col2Raw, "alpha");

      if (aItems.length >= 2 && bItems.length >= 2) {
        return { premise, columnA: aItems, columnB: bItems, hasColumns: true };
      }
    }
  }

  // 2. Fallback: Parse row-by-row hyphenated lines (e.g., "1. Term - (p) Definition")
  const hyphenParsed = parseHyphenatedRows(text);
  if (hyphenParsed.hasColumns) {
    return hyphenParsed;
  }

  // 3. Fallback: Parse loose numbered and lettered items in text
  return parseLooseItems(text);
}

function parseTokenItems(str: string, defaultPrefixType: "numeric" | "alpha" = "numeric"): ColumnItem[] {
  // Matches strict identifiers like 1., (1), [1], 1), (p), p., p), [p], (iv), iv. followed by space & word
  const pattern = /(?:^|[\n,;\s]+)(?:(?:\((?<id1>[0-9]{1,3}|[ivxIVX]{1,4}|[a-zA-Z])\))|(?:\[(?<id2>[0-9]{1,3}|[ivxIVX]{1,4}|[a-zA-Z])\])|(?<id3>[0-9]{1,3}|[ivxIVX]{1,4}|[a-zA-Z])[\.\)\:\-])(?=\s+[A-Za-z0-9\$\\\(])/g;
  const rawMatches = Array.from(str.matchAll(pattern));

  // Filter out common English parenthetical words like (non), (approx), etc.
  const matches = rawMatches.filter((m) => {
    const id = (m.groups?.id1 || m.groups?.id2 || m.groups?.id3 || "").toLowerCase().trim();
    return id && !IGNORED_PAREN_WORDS.has(id);
  });

  if (matches.length < 2) {
    const lines = str.split("\n").map((l) => l.trim()).filter(Boolean);
    const items: ColumnItem[] = [];
    const bulletRegex = /^[\(\[]?(?:([0-9]{1,3})|([ivxIVX]{1,4})|([a-zA-Z]))[\)\]\.\:\-]\s*(.+)$/;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const m = line.match(bulletRegex);
      const matchId = m ? (m[1] || m[2] || m[3]) : null;
      if (matchId && !IGNORED_PAREN_WORDS.has(matchId.toLowerCase())) {
        items.push({ id: matchId.trim(), text: m![4].trim() });
      } else {
        const fallbackId = defaultPrefixType === "numeric" ? `${idx + 1}` : String.fromCharCode(112 + idx); // p, q, r...
        items.push({ id: fallbackId, text: line });
      }
    }
    if (items.length >= 2) return items;
  }

  const items: ColumnItem[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const itemId = (m.groups?.id1 || m.groups?.id2 || m.groups?.id3 || `${i + 1}`).trim();
    const startPos = (m.index ?? 0) + m[0].length;
    const endPos = i + 1 < matches.length ? (matches[i + 1].index ?? str.length) : str.length;
    let content = str.slice(startPos, endPos).trim();
    content = content.replace(/[,\.;]+$/, "").trim();

    if (content) {
      items.push({ id: itemId, text: content });
    }
  }

  return items;
}

function parseHyphenatedRows(rawText: string): ParsedMatchData {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const colA: ColumnItem[] = [];
  const colB: ColumnItem[] = [];
  const premiseLines: string[] = [];

  for (const line of lines) {
    const rowMatch = line.match(/^[\(\[]?([0-9ivxIVX]{1,3}|[a-zA-Z]{1,2})[\)\]\.\:\-]?\s*(.+?)\s*[-–—:]\s*[\(\[]?([a-zA-Z0-9]{1,4})[\)\]\.\:\-]?\s*(.+)$/);
    if (rowMatch && !IGNORED_PAREN_WORDS.has(rowMatch[1].toLowerCase()) && !IGNORED_PAREN_WORDS.has(rowMatch[3].toLowerCase())) {
      colA.push({ id: rowMatch[1].trim(), text: rowMatch[2].trim() });
      colB.push({ id: rowMatch[3].trim(), text: rowMatch[4].trim() });
    } else {
      if (colA.length === 0) premiseLines.push(line);
    }
  }

  if (colA.length >= 2 && colB.length >= 2) {
    return {
      premise: premiseLines.join(" ").trim(),
      columnA: colA,
      columnB: colB,
      hasColumns: true,
    };
  }

  return { premise: rawText, columnA: [], columnB: [], hasColumns: false };
}

function parseLooseItems(rawText: string): ParsedMatchData {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const numItems: ColumnItem[] = [];
  const letterItems: ColumnItem[] = [];
  const premiseLines: string[] = [];

  for (const line of lines) {
    const numMatch = line.match(/^[\(\[]?([0-9ivxIVX]{1,3})[\)\]\.\:\-]\s*(.+)$/);
    const letMatch = line.match(/^[\(\[]?([a-zA-Z]{1,2})[\)\]\.\:\-]\s*(.+)$/);

    if (numMatch && !line.toLowerCase().includes("column") && !line.toLowerCase().includes("स्तम्भ") && !IGNORED_PAREN_WORDS.has(numMatch[1].toLowerCase())) {
      numItems.push({ id: numMatch[1], text: numMatch[2] });
    } else if (letMatch && !line.toLowerCase().includes("column") && !line.toLowerCase().includes("स्तम्भ") && !IGNORED_PAREN_WORDS.has(letMatch[1].toLowerCase())) {
      letterItems.push({ id: letMatch[1], text: letMatch[2] });
    } else {
      if (numItems.length === 0 && letterItems.length === 0) {
        premiseLines.push(line);
      }
    }
  }

  if (numItems.length >= 2 && letterItems.length >= 2) {
    return {
      premise: premiseLines.join(" ").trim(),
      columnA: numItems,
      columnB: letterItems,
      hasColumns: true,
    };
  }

  return { premise: rawText, columnA: [], columnB: [], hasColumns: false };
}

interface MatchQuestionViewProps {
  questionText: string;
  options?: { key: string; text: string }[] | null;
  correctAnswer?: string | null;
  userAnswer?: string | null;
  onSelectAnswer?: (key: string) => void;
  isInteractive?: boolean;
  isAnswerKeyMode?: boolean;
}

const PAIR_PALETTES = [
  { border: "#ea580c", text: "#c2410c", bg: "rgba(234, 88, 12, 0.08)", badgeBg: "#ffedd5", badgeText: "#9a3412", glow: "rgba(234, 88, 12, 0.35)" }, // Saffron / Amber
  { border: "#10b981", text: "#047857", bg: "rgba(16, 185, 129, 0.08)", badgeBg: "#d1fae5", badgeText: "#065f46", glow: "rgba(16, 185, 129, 0.35)" }, // Emerald
  { border: "#6366f1", text: "#4338ca", bg: "rgba(99, 102, 241, 0.08)", badgeBg: "#e0e7ff", badgeText: "#3730a3", glow: "rgba(99, 102, 241, 0.35)" }, // Indigo
  { border: "#ec4899", text: "#be185d", bg: "rgba(236, 72, 153, 0.08)", badgeBg: "#fce7f3", badgeText: "#9d174d", glow: "rgba(236, 72, 153, 0.35)" }, // Magenta
  { border: "#0ea5e9", text: "#0369a1", bg: "rgba(14, 165, 233, 0.08)", badgeBg: "#e0f2fe", badgeText: "#075985", glow: "rgba(14, 165, 233, 0.35)" }, // Sky
];

export default function MatchQuestionView({
  questionText,
  options,
  correctAnswer,
  userAnswer,
  onSelectAnswer,
  isInteractive = false,
  isAnswerKeyMode = false,
}: MatchQuestionViewProps) {
  const parsed = useMemo(() => parseMatchText(questionText), [questionText]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [hoveredWire, setHoveredWire] = useState<string | null>(null);

  // Live Drag-and-Drop Wire State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // DOM node references to measure precise anchor port coordinates for SVG Bezier lines
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pinCoords, setPinCoords] = useState<{
    left: Record<string, { x: number; y: number }>;
    right: Record<string, { x: number; y: number }>;
  }>({ left: {}, right: {} });

  // Measure relative port pin coordinates
  const updatePinCoordinates = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const leftMap: Record<string, { x: number; y: number }> = {};
    for (const [id, el] of Object.entries(leftPinRefs.current)) {
      if (el) {
        const r = el.getBoundingClientRect();
        leftMap[id] = {
          x: r.right - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top,
        };
      }
    }

    const rightMap: Record<string, { x: number; y: number }> = {};
    for (const [id, el] of Object.entries(rightPinRefs.current)) {
      if (el) {
        const r = el.getBoundingClientRect();
        rightMap[id] = {
          x: r.left - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top,
        };
      }
    }

    setPinCoords({ left: leftMap, right: rightMap });
  }, []);

  // Update wire coordinates on layout / resize
  useEffect(() => {
    updatePinCoordinates();
    const ro = new ResizeObserver(() => updatePinCoordinates());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updatePinCoordinates);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updatePinCoordinates);
    };
  }, [updatePinCoordinates, parsed]);

  // Sync pairs when student clicks an option or when viewing answer key
  useEffect(() => {
    const activeKey = isAnswerKeyMode ? correctAnswer : userAnswer;
    if (activeKey && options) {
      const opt = options.find((o) => o.key.toUpperCase() === activeKey.toUpperCase());
      if (opt) {
        const newPairs: Record<string, string> = {};
        const matches = opt.text.matchAll(/([0-9ivxIVX]+)\s*[\-\:\=]\s*\(?([a-zA-Z0-9]+)\)?/gi);
        for (const m of matches) {
          newPairs[m[1]] = m[2];
        }
        if (Object.keys(newPairs).length > 0) {
          setPairs(newPairs);
        }
      }
    }
  }, [userAnswer, correctAnswer, options, isAnswerKeyMode]);

  // Connect Pair Helper
  const connectPair = (leftId: string, rightId: string) => {
    const newPairs = { ...pairs, [leftId]: rightId };
    setPairs(newPairs);
    setSelectedLeft(null);
    setIsDragging(false);
    setDragStart(null);

    // Auto-match corresponding MCQ option code
    if (options && onSelectAnswer) {
      const matchOpt = options.find((opt) => {
        let matchesAll = true;
        for (const [l, r] of Object.entries(newPairs)) {
          const reg = new RegExp(`${l}\\s*[\\-\\:\\=]\\s*\\(?${r}\\)?`, "i");
          if (!reg.test(opt.text)) {
            matchesAll = false;
            break;
          }
        }
        return matchesAll && Object.keys(newPairs).length >= parsed.columnA.length;
      });

      if (matchOpt) {
        onSelectAnswer(matchOpt.key);
      }
    }
  };

  const removePair = (leftId: string) => {
    const next = { ...pairs };
    delete next[leftId];
    setPairs(next);
  };

  const handleResetPairs = () => {
    setPairs({});
    setSelectedLeft(null);
    setIsDragging(false);
    setDragStart(null);
  };

  // Click Left Node
  const handleLeftClick = (id: string) => {
    if (!isInteractive) return;
    if (selectedLeft === id) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(id);
    }
  };

  // Click Right Node
  const handleRightClick = (rightId: string) => {
    if (!isInteractive || !selectedLeft) return;
    connectPair(selectedLeft, rightId);
  };

  // Drag Wire Start
  const handleDragStart = (id: string, e: React.PointerEvent) => {
    if (!isInteractive || !containerRef.current) return;
    e.preventDefault();
    const containerRect = containerRef.current.getBoundingClientRect();
    const pin = pinCoords.left[id] || { x: 0, y: 0 };
    setIsDragging(true);
    setDragStart({ id, x: pin.x, y: pin.y });
    setDragPos({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });
    setSelectedLeft(id);
  };

  // Drag Wire Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setDragPos({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    });
  };

  // Drag Wire End / Drop
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
    }
  };

  return (
    <div
      className="match-workbench-root match-workbench"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", userSelect: isDragging ? "none" : "auto" }}
    >
      {/* Premise Statement */}
      {parsed.premise && (
        <div
          className="match-premise"
          style={{
            fontSize: "14.5px",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.6,
          }}
        >
          <MathText content={parsed.premise} />
        </div>
      )}

      {/* ── Node Canvas Workbench ── */}
      {parsed.hasColumns ? (
        <div
          ref={containerRef}
          className="match-canvas-container match-grid-container"
          style={{
            position: "relative",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Header Row */}
          <div
            className="match-grid-header"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--surface-sunken)",
              borderBottom: "1.5px solid var(--border)",
              padding: "10px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "13px", color: "var(--accent)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              <span>स्तम्भ I (Column I)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "13px", color: "var(--forest)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--forest)" }} />
              <span>स्तम्भ II (Column II)</span>
            </div>
          </div>

          {/* ── Interactive SVG Wire Layer ── */}
          <svg
            className="match-svg-layer no-print"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <defs>
              <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render established connection wires */}
            {Object.entries(pairs).map(([leftId, rightId]) => {
              const start = pinCoords.left[leftId];
              const rightKey = Object.keys(pinCoords.right).find((k) => k.toLowerCase() === rightId.toLowerCase());
              const end = rightKey ? pinCoords.right[rightKey] : null;

              if (!start || !end) return null;

              const leftIdx = parsed.columnA.findIndex((a) => a.id === leftId);
              const palette = PAIR_PALETTES[(leftIdx >= 0 ? leftIdx : 0) % PAIR_PALETTES.length];
              const isHovered = hoveredWire === leftId;

              // Cubic Bezier Control Points
              const dx = Math.max((end.x - start.x) * 0.5, 40);
              const pathD = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;

              return (
                <g key={`wire-${leftId}`} onMouseEnter={() => setHoveredWire(leftId)} onMouseLeave={() => setHoveredWire(null)}>
                  {/* Outer Glow Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={palette.border}
                    strokeWidth={isHovered ? 8 : 5}
                    strokeOpacity={isHovered ? 0.4 : 0.2}
                    strokeLinecap="round"
                    style={{ transition: "stroke-width 0.15s ease" }}
                  />

                  {/* Main Wire Spline */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={palette.border}
                    strokeWidth={isHovered ? 3 : 2.5}
                    strokeLinecap="round"
                  />

                  {/* Animated Flow Pulse */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeDasharray="6 8"
                    strokeLinecap="round"
                    style={{
                      animation: "flowWire 1.5s linear infinite",
                      opacity: 0.85,
                    }}
                  />

                  {/* Start / End Port Pins */}
                  <circle cx={start.x} cy={start.y} r={4.5} fill={palette.border} stroke="#ffffff" strokeWidth={1.5} />
                  <circle cx={end.x} cy={end.y} r={4.5} fill={palette.border} stroke="#ffffff" strokeWidth={1.5} />

                  {/* Interactive Delete/Disconnect Scissor Badge */}
                  {isInteractive && (
                    <g
                      transform={`translate(${midX}, ${midY})`}
                      style={{ pointerEvents: "auto", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePair(leftId);
                      }}
                    >
                      <circle r={10} fill={palette.border} stroke="#ffffff" strokeWidth={1.5} />
                      <text
                        x={0}
                        y={3.5}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={9}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        ✕
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Live Dragging Rubberband Wire */}
            {isDragging && dragStart && (
              <g>
                <path
                  d={`M ${dragStart.x} ${dragStart.y} C ${dragStart.x + Math.max((dragPos.x - dragStart.x) * 0.5, 30)} ${dragStart.y}, ${dragPos.x - 30} ${dragPos.y}, ${dragPos.x} ${dragPos.y}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
                <circle cx={dragPos.x} cy={dragPos.y} r={6} fill="var(--accent)" stroke="#ffffff" strokeWidth={2} />
              </g>
            )}
          </svg>

          {/* ── Node Columns Grid ── */}
          <div
            className="match-grid-body"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 28,
              padding: "18px 20px",
              background: "var(--surface)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Left Column (Column I Nodes) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {parsed.columnA.map((item, idx) => {
                const isSelected = selectedLeft === item.id;
                const pairedRight = pairs[item.id];
                const palette = PAIR_PALETTES[idx % PAIR_PALETTES.length];

                return (
                  <div
                    key={item.id}
                    onClick={() => handleLeftClick(item.id)}
                    className={`node-card node-card--left ${isSelected ? "node-card--active" : ""} ${pairedRight ? "node-card--paired" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: isSelected
                        ? "2px solid var(--accent)"
                        : pairedRight
                        ? `1.5px solid ${palette.border}`
                        : "1.5px solid var(--border)",
                      background: isSelected
                        ? "var(--accent-light)"
                        : pairedRight
                        ? palette.bg
                        : "var(--surface)",
                      cursor: isInteractive ? "pointer" : "default",
                      transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      boxShadow: isSelected ? "0 0 0 3px rgba(234, 88, 12, 0.2)" : "var(--shadow-sm)",
                    }}
                  >
                    {/* ID Badge */}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: "12px",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        background: pairedRight ? palette.badgeBg : "var(--surface-sunken)",
                        color: pairedRight ? palette.badgeText : "var(--accent)",
                        border: `1px solid ${pairedRight ? palette.border : "var(--border)"}`,
                        flexShrink: 0,
                      }}
                    >
                      {item.id}
                    </span>

                    {/* Text */}
                    <span style={{ fontSize: "13.5px", color: "var(--text)", flex: 1, lineHeight: 1.5, fontWeight: 500 }}>
                      <MathText content={item.text} />
                    </span>

                    {/* Anchor Output Pin Port (Right Edge) */}
                    <div
                      ref={(el) => {
                        leftPinRefs.current[item.id] = el;
                      }}
                      onPointerDown={(e) => handleDragStart(item.id, e)}
                      className="node-port node-port--out no-print"
                      title="Click or drag to connect"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: pairedRight ? palette.border : isSelected ? "var(--accent)" : "var(--surface-sunken)",
                        border: "2px solid #ffffff",
                        boxShadow: isSelected ? "0 0 0 3px rgba(234, 88, 12, 0.35)" : "0 1px 3px rgba(0,0,0,0.15)",
                        cursor: isInteractive ? "crosshair" : "default",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ffffff" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column (Column II Nodes) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {parsed.columnB.map((item) => {
                const pairedLeftKey = Object.keys(pairs).find((k) => pairs[k]?.toLowerCase() === item.id.toLowerCase());
                const leftIdx = pairedLeftKey ? parsed.columnA.findIndex((a) => a.id === pairedLeftKey) : -1;
                const palette = leftIdx >= 0 ? PAIR_PALETTES[leftIdx % PAIR_PALETTES.length] : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleRightClick(item.id)}
                    className={`node-card node-card--right ${pairedLeftKey ? "node-card--paired" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: pairedLeftKey
                        ? `1.5px solid ${palette?.border}`
                        : selectedLeft
                        ? "1.5px dashed var(--accent)"
                        : "1.5px solid var(--border)",
                      background: pairedLeftKey ? palette?.bg : "var(--surface)",
                      cursor: isInteractive && selectedLeft ? "pointer" : "default",
                      transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {/* Anchor Input Pin Port (Left Edge) */}
                    <div
                      ref={(el) => {
                        rightPinRefs.current[item.id] = el;
                      }}
                      className="node-port node-port--in no-print"
                      title="Drop or click here to connect"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: pairedLeftKey ? palette?.border : selectedLeft ? "var(--accent)" : "var(--surface-sunken)",
                        border: "2px solid #ffffff",
                        boxShadow: selectedLeft ? "0 0 0 3px rgba(234, 88, 12, 0.35)" : "0 1px 3px rgba(0,0,0,0.15)",
                        cursor: isInteractive ? "crosshair" : "default",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ffffff" }} />
                    </div>

                    {/* ID Badge */}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: "12px",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        background: pairedLeftKey ? palette?.badgeBg : "var(--surface-sunken)",
                        color: pairedLeftKey ? palette?.badgeText : "var(--forest)",
                        border: `1px solid ${pairedLeftKey ? palette?.border : "var(--border)"}`,
                        flexShrink: 0,
                      }}
                    >
                      ({item.id})
                    </span>

                    {/* Text */}
                    <span style={{ fontSize: "13.5px", color: "var(--text)", flex: 1, lineHeight: 1.5, fontWeight: 500 }}>
                      <MathText content={item.text} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Interactive Workbench Ribbon ── */}
          {isInteractive && (
            <div
              className="no-print"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                padding: "10px 18px",
                background: "var(--surface-sunken)",
                borderTop: "1px solid var(--border)",
                fontSize: "12.5px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
                {selectedLeft ? (
                  <span style={{ color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Zap size={14} /> Selected [ Node {selectedLeft} ] — Click its matching pin in Column II to connect wire!
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <HelpCircle size={14} /> Drag from a node pin $\bullet$ or click two items to draw a connecting wire.
                  </span>
                )}
              </div>

              {Object.keys(pairs).length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(pairs).map(([l, r], idx) => {
                      const pal = PAIR_PALETTES[idx % PAIR_PALETTES.length];
                      return (
                        <span
                          key={l}
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "5px",
                            background: pal.badgeBg,
                            color: pal.badgeText,
                            border: `1px solid ${pal.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {l} ⇄ ({r})
                        </span>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPairs}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "transparent",
                      border: "none",
                      color: "var(--terracotta)",
                      cursor: "pointer",
                      fontSize: "11.5px",
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={12} /> Clear Wires
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: "14px", lineHeight: 1.6, padding: "12px", background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <MathText content={questionText} />
        </div>
      )}

      {/* ── Answer Options Grid (A, B, C, D) ── */}
      {options && options.length > 0 && (
        <div className="match-options-wrap" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Matching Codes (उत्तर विकल्प):
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {options.map((opt) => {
              const isSelected = userAnswer?.toUpperCase() === opt.key.toUpperCase();
              const isCorrect = isAnswerKeyMode && opt.key.toUpperCase() === correctAnswer?.toUpperCase();

              return (
                <div
                  key={opt.key}
                  onClick={() => onSelectAnswer && onSelectAnswer(opt.key)}
                  className={`match-option-pill ${isSelected ? "match-option--selected" : ""} ${isCorrect ? "match-option--correct" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: isCorrect
                      ? "2px solid var(--forest)"
                      : isSelected
                      ? "2px solid var(--accent)"
                      : "1px solid var(--border)",
                    background: isCorrect
                      ? "var(--forest-light)"
                      : isSelected
                      ? "var(--accent-light)"
                      : "var(--surface)",
                    cursor: onSelectAnswer ? "pointer" : "default",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: isCorrect
                        ? "var(--forest)"
                        : isSelected
                        ? "var(--accent)"
                        : "var(--surface-sunken)",
                      color: isCorrect || isSelected ? "#ffffff" : "var(--text-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    {opt.key}
                  </span>
                  <span style={{ fontSize: "13.5px", fontWeight: isSelected || isCorrect ? 700 : 500, color: "var(--text)" }}>
                    <MathText content={opt.text} />
                  </span>
                  {isCorrect && (
                    <span style={{ marginLeft: "auto", color: "var(--forest)", display: "flex", alignItems: "center" }}>
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
