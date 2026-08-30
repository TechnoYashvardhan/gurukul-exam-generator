"use client";

import React, { useState, useMemo, useEffect } from "react";
import MathText from "./MathText";
import { Check, RefreshCw } from "lucide-react";

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
 * Intelligent parser that extracts Column I and Column II items from question text
 */
export function parseMatchText(rawText: string): ParsedMatchData {
  if (!rawText) {
    return { premise: "", columnA: [], columnB: [], hasColumns: false };
  }

  // Check if text has Column I / Column II or similar indicators
  const col1Match = rawText.match(/(?:Column\s*(?:I|1|A)|स्तम्भ\s*1|स्तम्भ\s*I)[:\s\n]+/i);
  const col2Match = rawText.match(/(?:Column\s*(?:II|2|B)|स्तम्भ\s*2|स्तम्भ\s*II)[:\s\n]+/i);

  if (!col1Match || !col2Match || col1Match.index === undefined || col2Match.index === undefined) {
    return parseFallbackLines(rawText);
  }

  const premise = rawText.slice(0, col1Match.index).trim();
  const col1Text = rawText.slice(col1Match.index + col1Match[0].length, col2Match.index).trim();
  const col2Text = rawText.slice(col2Match.index + col2Match[0].length).trim();

  const columnA = parseItems(col1Text);
  const columnB = parseItems(col2Text);

  if (columnA.length >= 2 && columnB.length >= 2) {
    return { premise, columnA, columnB, hasColumns: true };
  }

  return parseFallbackLines(rawText);
}

function parseItems(text: string): ColumnItem[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: ColumnItem[] = [];

  for (const line of lines) {
    // Matches patterns like: 1. Text, 1) Text, (1) Text, (i) Text, (a) Text, p. Text, p) Text
    const m = line.match(/^[\(\[]?([0-9a-zA-ZivxIVX]+)[\)\]\.\:\-]\s*(.+)$/);
    if (m) {
      items.push({ id: m[1].trim(), text: m[2].trim() });
    } else if (items.length > 0) {
      // Append multi-line content to previous item
      items[items.length - 1].text += " " + line;
    } else {
      items.push({ id: `${items.length + 1}`, text: line });
    }
  }

  return items;
}

function parseFallbackLines(rawText: string): ParsedMatchData {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const numItems: ColumnItem[] = [];
  const letterItems: ColumnItem[] = [];
  const premiseLines: string[] = [];

  for (const line of lines) {
    const numMatch = line.match(/^[\(\[]?([0-9ivxIVX]+)[\)\]\.\:\-]\s*(.+)$/);
    const letMatch = line.match(/^[\(\[]?([a-zA-Z])[\)\]\.\:\-]\s*(.+)$/);

    if (numMatch && !line.toLowerCase().includes("column")) {
      numItems.push({ id: numMatch[1], text: numMatch[2] });
    } else if (letMatch && !line.toLowerCase().includes("column")) {
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

const PAIR_COLORS = [
  { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", badge: "#dbeafe" }, // Blue
  { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", badge: "#dcfce7" }, // Green
  { bg: "#faf5ff", border: "#a855f7", text: "#7e22ce", badge: "#f3e8ff" }, // Purple
  { bg: "#fff7ed", border: "#f97316", text: "#c2410c", badge: "#ffedd5" }, // Orange
  { bg: "#ecfeff", border: "#06b6d4", text: "#0e7490", badge: "#cffafe" }, // Cyan
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
  const [pairs, setPairs] = useState<Record<string, string>>({}); // { "1": "p", "2": "q" }

  // Sync pairs with option selected if student clicks an option directly
  useEffect(() => {
    if (userAnswer && options) {
      const opt = options.find((o) => o.key.toUpperCase() === userAnswer.toUpperCase());
      if (opt) {
        // Parse code like "1-q, 2-s, 3-r, 4-p"
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
  }, [userAnswer, options]);

  // Handle interactive click-to-pair
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

    // Try finding an option that matches this pairing
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
    <div className="match-question-view" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Question Premise */}
      {parsed.premise && (
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>
          <MathText content={parsed.premise} />
        </div>
      )}

      {/* 2-Column Academic Match Card */}
      {parsed.hasColumns ? (
        <div
          style={{
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: "12.5px",
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              Column I (स्तम्भ I)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--forest)" }} />
              Column II (स्तम्भ II)
            </div>
          </div>

          {/* Interactive / Academic Columns Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              padding: "14px 16px",
            }}
          >
            {/* Column A (Left) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {parsed.columnA.map((item, idx) => {
                const isSelected = selectedLeft === item.id;
                const pairedRight = pairs[item.id];
                const colorIdx = idx % PAIR_COLORS.length;
                const pairStyle = pairedRight ? PAIR_COLORS[colorIdx] : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleLeftClick(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: isSelected
                        ? "2px solid var(--accent)"
                        : pairedRight
                        ? `1.5px solid ${pairStyle?.border}`
                        : "1px solid var(--border)",
                      background: isSelected
                        ? "var(--accent-light)"
                        : pairedRight
                        ? pairStyle?.bg
                        : "var(--surface)",
                      cursor: isInteractive ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 0 0 3px rgba(180, 83, 9, 0.15)" : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: pairedRight ? pairStyle?.badge : "var(--surface-sunken)",
                        color: pairedRight ? pairStyle?.text : "var(--text-1)",
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      {item.id}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text)", flex: 1, lineHeight: 1.5 }}>
                      <MathText content={item.text} />
                    </span>
                    {pairedRight && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: pairStyle?.border,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        → ({pairedRight})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column B (Right) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {parsed.columnB.map((item) => {
                // Check if this right item is paired with any left item
                const pairedLeftKey = Object.keys(pairs).find((k) => pairs[k]?.toLowerCase() === item.id.toLowerCase());
                const leftIdx = pairedLeftKey ? parsed.columnA.findIndex((a) => a.id === pairedLeftKey) : -1;
                const pairStyle = leftIdx >= 0 ? PAIR_COLORS[leftIdx % PAIR_COLORS.length] : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleRightClick(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: pairedLeftKey
                        ? `1.5px solid ${pairStyle?.border}`
                        : selectedLeft
                        ? "1.5px dashed var(--accent)"
                        : "1px solid var(--border)",
                      background: pairedLeftKey ? pairStyle?.bg : "var(--surface)",
                      cursor: isInteractive && selectedLeft ? "pointer" : "default",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: pairedLeftKey ? pairStyle?.badge : "var(--surface-sunken)",
                        color: pairedLeftKey ? pairStyle?.text : "var(--text-1)",
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      ({item.id})
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text)", flex: 1, lineHeight: 1.5 }}>
                      <MathText content={item.text} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Help Hint & Reset */}
          {isInteractive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                fontSize: "12px",
                color: "var(--text-2)",
              }}
            >
              <span>
                {selectedLeft
                  ? `👉 Selected [ ${selectedLeft} ]. Click its matching item in Column II to connect!`
                  : "💡 Click an item in Column I, then click its pair in Column II."}
              </span>
              {Object.keys(pairs).length > 0 && (
                <button
                  type="button"
                  onClick={handleResetPairs}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "transparent",
                    border: "none",
                    color: "var(--text-3)",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={12} /> Clear Matching
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: "13.5px", lineHeight: 1.6 }}>
          <MathText content={questionText} />
        </div>
      )}

      {/* Options Grid (A, B, C, D code combinations) */}
      {options && options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Matching Codes / उत्तर विकल्प:
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 8,
            }}
          >
            {options.map((opt) => {
              const isSelected = userAnswer?.toUpperCase() === opt.key.toUpperCase();
              const isCorrect = isAnswerKeyMode && opt.key.toUpperCase() === correctAnswer?.toUpperCase();

              return (
                <div
                  key={opt.key}
                  onClick={() => onSelectAnswer && onSelectAnswer(opt.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
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
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: isCorrect
                        ? "var(--forest)"
                        : isSelected
                        ? "var(--accent)"
                        : "var(--surface-sunken)",
                      color: isCorrect || isSelected ? "#fff" : "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    {opt.key}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: isSelected || isCorrect ? 600 : 400 }}>
                    <MathText content={opt.text} />
                  </span>
                  {isCorrect && (
                    <span style={{ marginLeft: "auto", color: "var(--forest)", display: "flex", alignItems: "center" }}>
                      <Check size={16} />
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
