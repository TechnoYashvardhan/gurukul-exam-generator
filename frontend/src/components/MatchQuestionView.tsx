"use client";

import React, { useState, useMemo, useEffect } from "react";
import MathText from "./MathText";
import { Check, RefreshCw, Sparkles, HelpCircle } from "lucide-react";

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

/**
 * Robust, foolproof parser that extracts Column I and Column II items from all LLM formats:
 * - Multiline formatted Column I & Column II
 * - Single-line comma-separated Column I: 1. A, 2. B... Column II: (p) X, (q) Y...
 * - Row-by-row hyphenated pairs: 1. A - (p) B
 * - Hindi headers: स्तम्भ I / स्तम्भ II, कॉलम 1 / कॉलम 2
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

      const aItems = parseTokenItems(col1Raw);
      const bItems = parseTokenItems(col2Raw);

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

function parseTokenItems(str: string): ColumnItem[] {
  // Tokenize by item markers like 1., (1), [1], 1), (a), (p), p., p), [p]
  const pattern = /(?:^|[\n,;\s]+)(?:(?:\((?P<id1>[0-9a-zA-ZivxIVX]+)\))|(?:\[(?P<id2>[0-9a-zA-ZivxIVX]+)\])|(?P<id3>[0-9a-zA-ZivxIVX]+)[\.\)\:\-])\s*/g;
  const matches = Array.from(str.matchAll(pattern));

  if (matches.length < 2) {
    const lines = str.split("\n").map((l) => l.trim()).filter(Boolean);
    const items: ColumnItem[] = [];
    for (const line of lines) {
      const m = line.match(/^[\(\[]?([0-9a-zA-ZivxIVX]+)[\)\]\.\:\-]\s*(.+)$/);
      if (m) {
        items.push({ id: m[1].trim(), text: m[2].trim() });
      } else if (items.length > 0) {
        items[items.length - 1].text += " " + line;
      }
    }
    return items;
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
    const rowMatch = line.match(/^[\(\[]?([0-9ivxIVX]+|[a-zA-Z])[\)\]\.\:\-]?\s*(.+?)\s*[-–—:]\s*[\(\[]?([a-zA-Z0-9]+)[\)\]\.\:\-]?\s*(.+)$/);
    if (rowMatch) {
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
    const numMatch = line.match(/^[\(\[]?([0-9ivxIVX]+)[\)\]\.\:\-]\s*(.+)$/);
    const letMatch = line.match(/^[\(\[]?([a-zA-Z])[\)\]\.\:\-]\s*(.+)$/);

    if (numMatch && !line.toLowerCase().includes("column") && !line.toLowerCase().includes("स्तम्भ")) {
      numItems.push({ id: numMatch[1], text: numMatch[2] });
    } else if (letMatch && !line.toLowerCase().includes("column") && !line.toLowerCase().includes("स्तम्भ")) {
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
  { bg: "rgba(234, 88, 12, 0.08)", border: "#ea580c", text: "#c2410c", badgeBg: "#ffedd5", badgeText: "#9a3412" },
  { bg: "rgba(16, 185, 129, 0.08)", border: "#10b981", text: "#047857", badgeBg: "#d1fae5", badgeText: "#065f46" },
  { bg: "rgba(99, 102, 241, 0.08)", border: "#6366f1", text: "#4338ca", badgeBg: "#e0e7ff", badgeText: "#3730a3" },
  { bg: "rgba(236, 72, 153, 0.08)", border: "#ec4899", text: "#be185d", badgeBg: "#fce7f3", badgeText: "#9d174d" },
  { bg: "rgba(14, 165, 233, 0.08)", border: "#0ea5e9", text: "#0369a1", badgeBg: "#e0f2fe", badgeText: "#075985" },
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

  const handleLeftClick = (id: string) => {
    if (!isInteractive) return;
    if (selectedLeft === id) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(id);
    }
  };

  const handleRightClick = (rightId: string) => {
    if (!isInteractive || !selectedLeft) return;

    const newPairs = { ...pairs, [selectedLeft]: rightId };
    setPairs(newPairs);
    setSelectedLeft(null);

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

  const handleResetPairs = () => {
    setPairs({});
    setSelectedLeft(null);
  };

  return (
    <div className="match-workbench" style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
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

      {/* 2-Column Comparative Table / Workbench */}
      {parsed.hasColumns ? (
        <div
          className="match-grid-container"
          style={{
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
              padding: "10px 16px",
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

          {/* Dual Columns Content */}
          <div
            className="match-grid-body"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              padding: "16px",
              background: "var(--surface)",
            }}
          >
            {/* Left Column (Column I) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {parsed.columnA.map((item, idx) => {
                const isSelected = selectedLeft === item.id;
                const pairedRight = pairs[item.id];
                const palette = PAIR_PALETTES[idx % PAIR_PALETTES.length];

                return (
                  <div
                    key={item.id}
                    onClick={() => handleLeftClick(item.id)}
                    className={`match-item-card match-item-card--left ${isSelected ? "match-item--active" : ""} ${pairedRight ? "match-item--paired" : ""}`}
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
                        : "1px solid var(--border)",
                      background: isSelected
                        ? "var(--accent-light)"
                        : pairedRight
                        ? palette.bg
                        : "var(--surface)",
                      cursor: isInteractive ? "pointer" : "default",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: isSelected ? "0 0 0 3px rgba(234, 88, 12, 0.2)" : "none",
                    }}
                  >
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
                    <span style={{ fontSize: "13.5px", color: "var(--text)", flex: 1, lineHeight: 1.5, fontWeight: 500 }}>
                      <MathText content={item.text} />
                    </span>
                    {pairedRight && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: palette.border,
                          color: "#ffffff",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ⇄ ({pairedRight})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Column (Column II) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {parsed.columnB.map((item) => {
                const pairedLeftKey = Object.keys(pairs).find((k) => pairs[k]?.toLowerCase() === item.id.toLowerCase());
                const leftIdx = pairedLeftKey ? parsed.columnA.findIndex((a) => a.id === pairedLeftKey) : -1;
                const palette = leftIdx >= 0 ? PAIR_PALETTES[leftIdx % PAIR_PALETTES.length] : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleRightClick(item.id)}
                    className={`match-item-card match-item-card--right ${pairedLeftKey ? "match-item--paired" : ""}`}
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
                        : "1px solid var(--border)",
                      background: pairedLeftKey ? palette?.bg : "var(--surface)",
                      cursor: isInteractive && selectedLeft ? "pointer" : "default",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
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
                    <span style={{ fontSize: "13.5px", color: "var(--text)", flex: 1, lineHeight: 1.5, fontWeight: 500 }}>
                      <MathText content={item.text} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Match Workbench Ribbon */}
          {isInteractive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                padding: "10px 16px",
                background: "var(--surface-sunken)",
                borderTop: "1px solid var(--border)",
                fontSize: "12.5px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
                {selectedLeft ? (
                  <span style={{ color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={14} /> Selected [ Item {selectedLeft} ] — Now click its match in Column II!
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <HelpCircle size={14} /> Click an item in Column I, then click its pair in Column II.
                  </span>
                )}
              </div>

              {Object.keys(pairs).length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {Object.entries(pairs).map(([l, r], idx) => {
                      const pal = PAIR_PALETTES[idx % PAIR_PALETTES.length];
                      return (
                        <span
                          key={l}
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: pal.badgeBg,
                            color: pal.badgeText,
                            border: `1px solid ${pal.border}`,
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
                    <RefreshCw size={12} /> Clear
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

      {/* Answer Options Grid (A, B, C, D) */}
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
