"use client";

import { useState, useEffect } from "react";
import { History, Printer, X, Edit2, Check, Trash2, FileText, CheckCircle, CheckCircle2, Send, Download, FileCode2, BookOpen, Shuffle, BarChart3 } from "lucide-react";
import { type ExamHistoryEntry } from "@/hooks/useExamHistory";
import MathText from "./MathText";
import { generationApi, adminApi } from "@/lib/api";
import Toast, { ToastVariant } from "./Toast";
import PublishQuizModal from "./PublishQuizModal";
import MatchQuestionView from "./MatchQuestionView";
import { ClassSummary } from "@/types/auth";
import { downloadExamAsJson, downloadExamAsDocx, downloadExamAsMarkdown, getCleanExamTitle } from "@/lib/exportUtils";

interface ExamHistoryProps {
  entries: ExamHistoryEntry[];
  onRemove: (id: string) => void;
  onRename: (id: string, title: string) => void;
  role?: "admin" | "teacher";
}

export default function ExamHistory({ entries, onRemove, onRename, role = "teacher" }: ExamHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"exam" | "key" | null>(null);
  const [publishedMap, setPublishedMap] = useState<Record<string, boolean>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    adminApi.listClasses().then(setClasses).catch(() => {});
  }, []);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const selectedEntry = entries.find(e => e.id === selectedId) || null;

  const [activeViewMode, setActiveViewMode] = useState<"exam" | "key">("exam");

  const handlePrint = (mode: "exam" | "key") => {
    setActiveViewMode(mode);
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const startRename = (entry: ExamHistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(entry.id);
    setEditTitle(entry.title);
  };

  const saveRename = (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this exam?")) {
      onRemove(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleConfirmPublish = async (options: {
    targetClassId?: string;
    scheduleStartAt?: string;
    scheduleEndAt?: string;
  }) => {
    if (!selectedEntry) return;
    const examId = selectedEntry.exam.exam_id || selectedEntry.id;
    setPublishingId(selectedEntry.id);
    try {
      await generationApi.publish(examId, true, options);
      setPublishedMap(prev => ({ ...prev, [selectedEntry.id]: true }));
      const targetName = options.targetClassId
        ? classes.find((c) => c.id === options.targetClassId)?.name || "Selected Cohort"
        : "All Cohorts (Global)";
      
      let msg = `🎉 Quiz published to ${targetName}!`;
      if (options.scheduleStartAt) {
        const dt = new Date(options.scheduleStartAt);
        msg = `🗓️ Quiz scheduled for ${targetName} (Starts: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      }
      setToast({
        message: msg,
        variant: "success",
      });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to publish quiz.", variant: "error" });
      throw err;
    } finally {
      setPublishingId(null);
    }
  };

  const toRoman = (num: number): string => {
    const romanMap: [number, string][] = [
      [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
    ];
    let res = "";
    for (const [val, sym] of romanMap) {
      while (num >= val) {
        res += sym;
        num -= val;
      }
    }
    return res;
  };

  const formatSubQuestionLabel = (subNo?: string | number, idx: number = 0): string => {
    if (subNo) {
      const s = String(subNo).trim();
      if (/^[ivxIVX]+$/i.test(s)) {
        return s.toUpperCase() + ".";
      }
      const parsed = parseInt(s, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
        return toRoman(parsed) + ".";
      }
      return s.endsWith(".") ? s : s + ".";
    }
    return toRoman(idx + 1) + ".";
  };

  const renderQuestions = (questions: any[], sections?: any[] | null) => {
    const uniqueSecIds = Array.from(new Set(questions.map((q) => q.section_id)));
    return questions.map((q, idx) => {
      const isFirstInSec = idx === 0 || q.section_id !== questions[idx - 1].section_id;
      const isFirstInSubSec =
        isFirstInSec ||
        (q.sub_section_title && q.sub_section_title !== questions[idx - 1]?.sub_section_title);
      const secIndex = uniqueSecIds.indexOf(q.section_id);
      const secLetter = String.fromCharCode(65 + (secIndex >= 0 ? secIndex : 0));
      const sectionMeta = sections?.find((s) => s.id === q.section_id);

      let secTitle = "";
      if (sectionMeta?.title) {
        secTitle = sectionMeta.title.trim().toUpperCase().startsWith("SECTION")
          ? sectionMeta.title.trim().toUpperCase()
          : `SECTION ${secLetter} — ${sectionMeta.title.trim().toUpperCase()}`;
      } else {
        const typeLabel =
          q.type === "mcq" ? "MULTIPLE CHOICE QUESTIONS" : q.type.replace("_", " ").toUpperCase();
        secTitle = `SECTION ${secLetter} — ${typeLabel}`;
      }
      const secInstructions = sectionMeta?.instructions;

      return (
        <div key={`${idx}-${q.question_no}`}>
          {/* Main Section Header */}
          {isFirstInSec && (
            <div className="exam-section-header">
              <div className="exam-section-header__title">
                <span>{secTitle}</span>
                <span style={{ fontSize: "12px", opacity: 0.8, fontWeight: 500 }} className="no-print">
                  {q.marks} Mark{q.marks > 1 ? "s" : ""} each
                </span>
              </div>
              {secInstructions && (
                <div className="exam-section-header__instructions">{secInstructions}</div>
              )}
            </div>
          )}

          {/* Sub-Section / Part Divider Badge */}
          {isFirstInSubSec && !isFirstInSec && q.sub_section_title && (
            <div
              className="exam-subsection-divider"
              style={{
                marginTop: 16,
                marginBottom: 12,
                padding: "6px 14px",
                borderRadius: "6px",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--primary, #6366f1)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                📑 {q.sub_section_title}
              </span>
            </div>
          )}

          <div className="question-card" style={{ marginBottom: 16 }}>
            {/* Question Header */}
            <div className="question-card__header">
              <span className="question-card__num">Q.{q.question_no}</span>
              {q.type === "match_the_following" ? (
                <div style={{ flex: 1 }}>
                  <MatchQuestionView
                    questionText={q.text}
                    options={q.options}
                    correctAnswer={q.answer}
                    isAnswerKeyMode={activeViewMode === "key"}
                    isInteractive={true}
                  />
                </div>
              ) : (
                <div className="question-card__text" style={{ fontSize: "14px", lineHeight: 1.6 }}>
                  {q.or_choice && !q.text?.trim().startsWith("A.") && !q.text?.trim().startsWith("(A)") && !q.passage && (
                    <strong style={{ marginRight: 6, color: "var(--primary, #6366f1)" }}>A. </strong>
                  )}
                  <MathText content={q.text} />
                </div>
              )}
              <span className="question-card__marks">
                {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
              </span>
              <span className="question-card__type no-print">{q.type.replace("_", " ")}</span>
            </div>

            {/* Reading Comprehension / Case Study Passage Box */}
            {q.passage && (
              <div
                className="exam-passage-box"
                style={{
                  marginTop: 12,
                  marginBottom: 14,
                  padding: "14px 18px",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                  borderLeft: "4px solid var(--accent)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  className="exam-passage-title"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                    color: "var(--accent)",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  <BookOpen size={14} />
                  <span>Comprehension Passage / Case Study Context</span>
                </div>
                <div className="exam-passage-text" style={{ fontSize: "13.5px", lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-line" }}>
                  <MathText content={q.passage} />
                </div>
              </div>
            )}

            {/* Visual Chart / Figure Rendering */}
            {q.chart_image_url && (
              <div
                className="exam-chart-box"
                style={{
                  marginTop: 12,
                  marginBottom: 14,
                  textAlign: "center",
                  background: "#ffffff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                <img
                  src={q.chart_image_url}
                  alt="Figure / Data Chart"
                  style={{ maxWidth: "100%", maxHeight: "380px", height: "auto", objectFit: "contain", borderRadius: "4px" }}
                />
              </div>
            )}

            {/* Sub-Questions Rendering (for Case Study / Reading Passages) */}
            {q.sub_questions && q.sub_questions.length > 0 && (
              <div className="exam-sub-questions-list" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {q.sub_questions.map((sub: any, sIdx: number) => {
                  const subLabel = formatSubQuestionLabel(sub.sub_no, sIdx);
                  return (
                    <div
                      key={sIdx}
                      className="exam-sub-question"
                      style={{
                        padding: "12px 14px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                          <span
                            className="exam-sub-num"
                            style={{
                              fontWeight: 800,
                              fontFamily: "var(--font-mono)",
                              color: "var(--accent)",
                              minWidth: 24,
                              fontSize: "13px",
                            }}
                          >
                            {subLabel}
                          </span>
                          <div className="exam-sub-text" style={{ fontSize: "13.5px", lineHeight: 1.5, flex: 1 }}>
                            <MathText content={sub.text} />
                          </div>
                        </div>
                        <span className="exam-sub-marks chip-badge chip-badge--gold" style={{ fontSize: "10.5px", flexShrink: 0 }}>
                          {sub.marks} Mark{sub.marks > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Sub-question MCQ Options */}
                      {sub.options && sub.options.length > 0 && (
                        <div
                          className="exam-sub-options-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 6,
                            marginTop: 8,
                            paddingLeft: 32,
                          }}
                        >
                          {sub.options.map((sOpt: any) => (
                            <div
                              key={sOpt.key}
                              className="exam-sub-option"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "12.5px",
                                background:
                                  activeViewMode === "key" && sOpt.key === sub.answer
                                    ? "var(--forest-light)"
                                    : "var(--surface-sunken)",
                                border:
                                  activeViewMode === "key" && sOpt.key === sub.answer
                                    ? "1px solid var(--forest)"
                                    : "1px solid var(--border)",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: "var(--font-mono)",
                                  color:
                                    activeViewMode === "key" && sOpt.key === sub.answer
                                      ? "var(--forest)"
                                      : "var(--text-3)",
                                  fontSize: "11.5px",
                                }}
                              >
                                ({sOpt.key})
                              </span>
                              <span style={{ fontSize: "12.5px" }}>
                                <MathText content={sOpt.text} />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sub-question Answer Key */}
                      {activeViewMode === "key" && sub.answer && (
                        <div
                          className="exam-sub-answer"
                          style={{
                            marginTop: 8,
                            marginLeft: 32,
                            padding: "5px 10px",
                            background: "var(--forest-light)",
                            border: "1px solid var(--forest)",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: "var(--forest)",
                          }}
                        >
                          <CheckCircle size={13} />
                          <span>
                            <strong>Model Answer:</strong> <MathText content={sub.answer} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standard Top-Level MCQ Options */}
            {!q.sub_questions && q.type !== "match_the_following" && q.options && q.options.length > 0 && (
              <div className="mcq-options" style={{ marginTop: 12 }}>
                {q.options.map((opt: any) => (
                  <div
                    key={opt.key}
                    className={`mcq-option ${activeViewMode === "key" && opt.key === q.answer ? "mcq-option--correct" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      marginBottom: "6px",
                      background:
                        activeViewMode === "key" && opt.key === q.answer ? "var(--forest-light)" : "var(--surface)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background:
                          activeViewMode === "key" && opt.key === q.answer ? "var(--forest)" : "var(--surface-sunken)",
                        color: activeViewMode === "key" && opt.key === q.answer ? "#fff" : "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                      }}
                    >
                      {opt.key}
                    </span>
                    <span style={{ fontSize: "13.5px" }}>
                      <MathText content={opt.text} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Top-Level Answer Key */}
            {activeViewMode === "key" && q.answer && !q.sub_questions && (
              <div
                className="question-card__answer"
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "var(--forest-light)",
                  border: "1px solid var(--forest)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--forest)",
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle size={15} />
                  <span>Model Solution & Marking Scheme:</span>
                </div>
                <div style={{ color: "var(--text)" }}>
                  <MathText content={q.answer} />
                </div>
              </div>
            )}

            {/* Internal Choice ("OR" Question) Academic Display */}
            {q.or_choice && (
              <div
                className="exam-or-choice-wrap"
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1.5px dashed var(--border)",
                }}
              >
                <div
                  className="exam-or-divider"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      padding: "3px 14px",
                      borderRadius: "12px",
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      color: "var(--primary, #6366f1)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    — OR — (अथवा)
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                </div>

                {/* OR Choice Passage (if any) */}
                {q.or_choice.passage && (
                  <div
                    className="exam-or-box exam-passage-box"
                    style={{
                      marginBottom: 12,
                      padding: "12px 16px",
                      background: "var(--surface-sunken)",
                      border: "1px solid var(--border)",
                      borderLeft: "4px solid var(--primary, #6366f1)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div
                      className="exam-passage-title"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                        color: "var(--primary, #6366f1)",
                        fontWeight: 700,
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      <BookOpen size={13} />
                      <span>Alternative Passage / Case Context</span>
                    </div>
                    <div className="exam-passage-text" style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-line" }}>
                      <MathText content={q.or_choice.passage} />
                    </div>
                  </div>
                )}

                {/* OR Choice Visual Chart */}
                {q.or_choice.chart_image_url && (
                  <div
                    className="exam-chart-box"
                    style={{
                      marginTop: 10,
                      marginBottom: 12,
                      textAlign: "center",
                      background: "#ffffff",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <img
                      src={q.or_choice.chart_image_url}
                      alt="Alternative Figure / Data Chart"
                      style={{ maxWidth: "100%", maxHeight: "380px", height: "auto", objectFit: "contain", borderRadius: "4px" }}
                    />
                  </div>
                )}

                {/* OR Choice Question Text */}
                <div style={{ fontSize: "14px", lineHeight: 1.6, marginBottom: 10, paddingLeft: 4 }}>
                  <span
                    className="exam-or-label"
                    style={{
                      fontWeight: 800,
                      color: "var(--primary, #6366f1)",
                      marginRight: 8,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    B.
                  </span>
                  <MathText content={q.or_choice.text} />
                </div>

                {/* OR Choice Sub-Questions (if any) */}
                {q.or_choice.sub_questions && q.or_choice.sub_questions.length > 0 && (
                  <div className="exam-sub-questions-list" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, marginBottom: 10 }}>
                    {q.or_choice.sub_questions.map((sub: any, sIdx: number) => {
                      const subLabel = formatSubQuestionLabel(sub.sub_no, sIdx);
                      return (
                        <div
                          key={sIdx}
                          className="exam-sub-question"
                          style={{
                            padding: "10px 12px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                              <span
                                className="exam-sub-num"
                                style={{
                                  fontWeight: 800,
                                  fontFamily: "var(--font-mono)",
                                  color: "var(--primary, #6366f1)",
                                  minWidth: 24,
                                  fontSize: "12.5px",
                                }}
                              >
                                {subLabel}
                              </span>
                              <div className="exam-sub-text" style={{ fontSize: "13px", lineHeight: 1.5, flex: 1 }}>
                                <MathText content={sub.text} />
                              </div>
                            </div>
                            <span className="exam-sub-marks chip-badge chip-badge--gold" style={{ fontSize: "10px", flexShrink: 0 }}>
                              {sub.marks} Mark{sub.marks > 1 ? "s" : ""}
                            </span>
                          </div>

                          {sub.options && sub.options.length > 0 && (
                            <div
                              className="exam-sub-options-grid"
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: 6,
                                marginTop: 8,
                                paddingLeft: 32,
                              }}
                            >
                              {sub.options.map((sOpt: any) => (
                                <div
                                  key={sOpt.key}
                                  className="exam-sub-option"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    background:
                                      activeViewMode === "key" && sOpt.key === sub.answer
                                        ? "var(--forest-light)"
                                        : "var(--surface-sunken)",
                                    border:
                                      activeViewMode === "key" && sOpt.key === sub.answer
                                        ? "1px solid var(--forest)"
                                        : "1px solid var(--border)",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontFamily: "var(--font-mono)",
                                      color:
                                        activeViewMode === "key" && sOpt.key === sub.answer
                                          ? "var(--forest)"
                                          : "var(--text-3)",
                                      fontSize: "11px",
                                    }}
                                  >
                                    ({sOpt.key})
                                  </span>
                                  <span style={{ fontSize: "12px" }}>
                                    <MathText content={sOpt.text} />
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeViewMode === "key" && sub.answer && (
                            <div
                              className="exam-sub-answer"
                              style={{
                                marginTop: 8,
                                marginLeft: 32,
                                padding: "5px 10px",
                                background: "var(--forest-light)",
                                border: "1px solid var(--forest)",
                                borderRadius: "4px",
                                fontSize: "11.5px",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                color: "var(--forest)",
                              }}
                            >
                              <CheckCircle size={12} />
                              <span>
                                <strong>Model Answer:</strong> <MathText content={sub.answer} />
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* OR Choice MCQ Options */}
                {!q.or_choice.sub_questions && q.or_choice.options && q.or_choice.options.length > 0 && (
                  <div className="mcq-options" style={{ marginTop: 10 }}>
                    {q.or_choice.options.map((opt: any) => (
                      <div
                        key={opt.key}
                        className={`mcq-option ${activeViewMode === "key" && opt.key === q.or_choice?.answer ? "mcq-option--correct" : ""}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          marginBottom: "4px",
                          background:
                            activeViewMode === "key" && opt.key === q.or_choice?.answer
                              ? "var(--forest-light)"
                              : "var(--surface)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background:
                              activeViewMode === "key" && opt.key === q.or_choice?.answer
                                ? "var(--forest)"
                                : "var(--surface-sunken)",
                            color: activeViewMode === "key" && opt.key === q.or_choice?.answer ? "#fff" : "var(--text)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                          }}
                        >
                          {opt.key}
                        </span>
                        <span style={{ fontSize: "13px" }}>
                          <MathText content={opt.text} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* OR Choice Answer Key in key view */}
                {activeViewMode === "key" && q.or_choice.answer && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: "var(--forest-light)",
                      border: "1px solid var(--forest)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12.5px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--forest)",
                        marginBottom: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={14} />
                      <span>Option B (OR) Model Solution & Marking Scheme:</span>
                    </div>
                    <div style={{ color: "var(--text)" }}>
                      <MathText content={q.or_choice.answer} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="gurukul-page">
      <div className="page-header no-print">
        <div className="page-header__breadcrumb">Itihas / History</div>
        <h1 className="page-header__title">Exam History</h1>
        <div className="page-header__ornament">
          <div className="page-header__ornament-line" />
          <div className="page-header__ornament-diamond" />
          <div className="page-header__ornament-line--right" />
        </div>
        <p className="page-header__subtitle">Review, print, and export your previously generated exams</p>
      </div>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", marginTop: "1rem" }}>
        {/* Left column: List */}
        <div className="vidya-card no-print" style={{ flex: "0 0 320px", padding: "1rem" }}>
          <div className="ornament-heading" style={{ marginBottom: "1rem" }}>
            <History size={14} />
            Saved Exams
            <span style={{
              background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-mid)",
              borderRadius: 100, padding: "1px 10px", fontSize: 12, marginLeft: 8
            }}>
              {entries.length}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem 1rem" }}>
              <FileText size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: "0.9rem", color: "var(--text-3)" }}>No exams generated yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {entries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: `1px solid ${selectedId === entry.id ? 'var(--accent)' : 'var(--border-light)'}`,
                    background: selectedId === entry.id ? 'var(--bg-2)' : 'var(--bg)',
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {editingId === entry.id ? (
                    <form onSubmit={saveRename} style={{ display: 'flex', gap: '0.25rem' }}>
                      <input
                        type="text"
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="gk-input"
                        style={{ padding: '4px', fontSize: '13px', flex: 1, minWidth: 0 }}
                      />
                      <button type="submit" className="gk-btn gk-btn--icon" style={{ padding: 4 }}><Check size={14} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="gk-btn gk-btn--icon" style={{ padding: 4 }}><X size={14} /></button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-1)', lineHeight: 1.2 }}>{entry.title}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={(e) => startRename(entry, e)} style={{ color: 'var(--text-3)' }} aria-label="Rename"><Edit2 size={13} /></button>
                        <button onClick={(e) => handleDelete(entry.id, e)} style={{ color: 'var(--danger, #ef4444)' }} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 8 }}>
                    {new Date(entry.created_at).toLocaleDateString()} • {entry.exam.total_marks || 0} Marks • {entry.exam.questions?.length || 0} Qs
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Viewer */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedEntry ? (
            <div className="vidya-card no-print" style={{ padding: "4rem", textAlign: "center", color: "var(--text-3)" }}>
              <FileText size={48} style={{ margin: "0 auto 1rem", opacity: 0.2 }} />
              <p>Select an exam from the left to view it.</p>
            </div>
          ) : (
            <>
              <div className="exam-toolbar no-print">
                <div className="exam-toolbar__modes">
                  <button
                    type="button"
                    className={`exam-toolbar__mode-btn ${activeViewMode === "exam" ? "exam-toolbar__mode-btn--active" : ""}`}
                    onClick={() => setActiveViewMode("exam")}
                  >
                    <FileText size={14} />
                    Question Paper
                  </button>
                  <button
                    type="button"
                    className={`exam-toolbar__mode-btn ${activeViewMode === "key" ? "exam-toolbar__mode-btn--active" : ""}`}
                    onClick={() => setActiveViewMode("key")}
                  >
                    <CheckCircle size={14} />
                    Answer Key & Solutions
                  </button>
                </div>

                <div className="exam-toolbar__actions">
                  {role === "admin" && (
                    <button
                      type="button"
                      className="gk-btn"
                      onClick={() => setShowPublishModal(true)}
                      disabled={publishingId === selectedEntry.id || publishedMap[selectedEntry.id]}
                      style={{
                        background: publishedMap[selectedEntry.id] ? "#15803d" : "#ea580c",
                        color: "#ffffff",
                        borderColor: publishedMap[selectedEntry.id] ? "#166534" : "#c2410c",
                        boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                        fontWeight: 600,
                      }}
                    >
                      {publishedMap[selectedEntry.id] ? (
                        <>
                          <CheckCircle size={14} />
                          Published to Students
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          {publishingId === selectedEntry.id ? "Publishing..." : "Publish to Students..."}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="gk-btn gk-btn--secondary"
                    onClick={() => downloadExamAsJson(selectedEntry.exam)}
                    style={{ gap: 5, color: "var(--accent)" }}
                    title="Export complete exam in a .json file"
                  >
                    <Download size={14} />
                    Export JSON (.json)
                  </button>
                  <button
                    type="button"
                    className="gk-btn gk-btn--secondary"
                    onClick={() => downloadExamAsDocx(selectedEntry.exam, activeViewMode === "key")}
                    style={{ gap: 5 }}
                    title="Export formatted Word document (.docx)"
                  >
                    <FileText size={14} />
                    Word (.docx)
                  </button>
                  <button
                    type="button"
                    className="gk-btn gk-btn--secondary"
                    onClick={() => downloadExamAsMarkdown(selectedEntry.exam, activeViewMode === "key")}
                    style={{ gap: 5 }}
                    title="Export Markdown document (.md)"
                  >
                    <FileCode2 size={14} />
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    className="gk-btn gk-btn--primary"
                    onClick={() => handlePrint("exam")}
                  >
                    <Printer size={14} />
                    Print Exam Paper
                  </button>
                  <button
                    type="button"
                    className="gk-btn gk-btn--secondary"
                    onClick={() => handlePrint("key")}
                  >
                    <Printer size={14} />
                    Print Answer Key
                  </button>
                </div>
              </div>

              <PublishQuizModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onConfirm={handleConfirmPublish}
                classes={classes}
                examTitle={getCleanExamTitle(selectedEntry.exam.heading_details, selectedEntry.title)}
                subject={selectedEntry.exam.subject}
              />

              {toast && (
                <div style={{ margin: "0.5rem 0 1rem 0" }}>
                  <Toast
                    message={toast.message}
                    variant={toast.variant}
                    onClose={() => setToast(null)}
                  />
                </div>
              )}

              <div
                className={`exam-result ${activeViewMode === "key" ? "print-key-only exam-result--key" : "print-exam-only exam-result--exam"}`}
                id="exam-result"
                style={{ marginTop: 0 }}
              >
                <div className="exam-result__header">
                  {selectedEntry.exam.heading_details && (
                    <div
                      className="exam-result__institution"
                      dangerouslySetInnerHTML={{ __html: selectedEntry.exam.heading_details }}
                    />
                  )}
                  {activeViewMode === "key" && (
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: "13pt", margin: "4px 0", color: "var(--accent, #b45309)" }}>
                      ANSWER KEY & MARKING SCHEME
                    </div>
                  )}
                  <div className="exam-result__meta">
                    <span>Total Time: {selectedEntry.exam.duration_minutes} Minutes</span>
                    <span>Maximum Marks: {selectedEntry.exam.total_marks}</span>
                  </div>
                </div>

                <hr className="exam-result__divider" />

                <div className="exam-result__body">
                  {selectedEntry.exam.instructions && (
                    <div className="exam-result__instructions-box">
                      <div className="exam-result__instructions-title">General Instructions</div>
                      <div
                        className="exam-result__instructions-content"
                        style={{ fontFamily: "inherit", margin: 0 }}
                        dangerouslySetInnerHTML={{ __html: selectedEntry.exam.instructions }}
                      />
                    </div>
                  )}

                  {renderQuestions(selectedEntry.exam.questions || [], selectedEntry.exam.sections)}
                </div>

                <div className="exam-print-actions">
                  <button
                    className="gk-btn gk-btn--primary"
                    onClick={() => handlePrint("exam")}
                  >
                    <Printer size={15} style={{ marginRight: "6px" }} />
                    Print Exam Paper
                  </button>
                  <button
                    className="gk-btn gk-btn--secondary"
                    onClick={() => handlePrint("key")}
                  >
                    <Printer size={15} style={{ marginRight: "6px" }} />
                    Print Answer Key
                  </button>
                  <button
                    className="gk-btn gk-btn--secondary"
                    onClick={() => downloadExamAsJson(selectedEntry.exam)}
                  >
                    <Download size={15} style={{ marginRight: "6px" }} />
                    Export JSON (.json)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
