"use client";

import { useState, useEffect } from "react";
import { History, Printer, X, Edit2, Check, Trash2, FileText, CheckCircle, CheckCircle2, Send, Download } from "lucide-react";
import { type ExamHistoryEntry } from "@/hooks/useExamHistory";
import MathText from "./MathText";
import { generationApi, adminApi } from "@/lib/api";
import Toast, { ToastVariant } from "./Toast";
import PublishQuizModal from "./PublishQuizModal";
import { ClassSummary } from "@/types/auth";
import { downloadExamAsJson, getCleanExamTitle } from "@/lib/exportUtils";

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
    if (role === "admin") {
      adminApi.listClasses().then(setClasses).catch(() => {});
    }
  }, [role]);

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

  const renderQuestions = (questions: any[], sections?: any[] | null) => {
    const uniqueSecIds = Array.from(new Set(questions.map(q => q.section_id)));
    return questions.map((q, idx) => {
      const isFirstInSec = idx === 0 || q.section_id !== questions[idx - 1].section_id;
      const secIndex = uniqueSecIds.indexOf(q.section_id);
      const secLetter = String.fromCharCode(65 + (secIndex >= 0 ? secIndex : 0));
      const sectionMeta = sections?.find(s => s.id === q.section_id);
      
      let secTitle = "";
      if (sectionMeta?.title) {
        secTitle = sectionMeta.title.trim().toUpperCase().startsWith("SECTION") 
          ? sectionMeta.title.trim().toUpperCase() 
          : `SECTION ${secLetter} — ${sectionMeta.title.trim().toUpperCase()}`;
      } else {
        const typeLabel = q.type === "mcq" 
          ? "MULTIPLE CHOICE QUESTIONS" 
          : q.type.replace('_', ' ').toUpperCase();
        secTitle = `SECTION ${secLetter} — ${typeLabel}`;
      }
      const secInstructions = sectionMeta?.instructions;

      return (
        <div key={`${idx}-${q.question_no}`}>
          {isFirstInSec && (
            <div className="exam-section-header">
              <div className="exam-section-header__title">
                <span>{secTitle}</span>
                <span style={{ fontSize: "12px", opacity: 0.8, fontWeight: 500 }} className="no-print">
                  {q.marks} Mark{q.marks > 1 ? 's' : ''} each
                </span>
              </div>
              {secInstructions && (
                <div className="exam-section-header__instructions">{secInstructions}</div>
              )}
            </div>
          )}

          <div className="question-card">
            <div className="question-card__header">
              <span className="question-card__num">Q.{q.question_no}</span>
              <div className="question-card__text">
                <MathText content={q.text} />
              </div>
              <span className="question-card__marks">{q.marks}</span>
              <span className="question-card__type">{q.type.replace("_", " ")}</span>
            </div>

            {q.options && q.options.length > 0 && (
              <div className="mcq-options">
                {q.options.map((opt: any) => (
                  <div
                    key={opt.key}
                    className={`mcq-option ${activeViewMode === "key" && opt.key === q.answer ? "mcq-option--correct" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <strong>({opt.key.toLowerCase()})</strong> 
                      <MathText content={opt.text} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeViewMode === "key" && q.answer && (
              <div className="question-card__answer flex items-start gap-2">
                <span className="font-semibold">Answer:</span>
                <MathText content={q.answer} />
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
