"use client";

import { useCallback, useEffect, useState } from "react";
import { documentsApi, generationApi, templatesApi, adminApi } from "@/lib/api";
import type { DocumentSummary } from "@/types/document";
import type { TemplateSummary, GeneratedExam, ExamTemplate } from "@/types/template";
import type { ClassSummary } from "@/types/auth";
import {
  Bot,
  FileText,
  Globe,
  CheckCircle,
  FolderOpen,
  ClipboardList,
  AlertTriangle,
  Sparkles,
  Printer,
  Send,
  Download,
  ScrollText,
  Clock,
  Award,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  BookOpen,
  Library,
  Sliders,
  Check,
  Edit3,
  Trash2,
  X,
  FileCode2,
} from "lucide-react";
import MathText from "./MathText";
import { useAuth } from "./AuthProvider";
import Toast, { ToastVariant } from "./Toast";
import PublishQuizModal from "./PublishQuizModal";
import MatchQuestionView from "./MatchQuestionView";
import {
  downloadExamAsJson,
  downloadExamAsDocx,
  downloadExamAsMarkdown,
  getCleanExamTitle,
} from "@/lib/exportUtils";
import type { View } from "./Sidebar";

interface GeneratePanelProps {
  docs?: DocumentSummary[];
  selectedDocId?: string | null;
  onSelectDoc?: (docId: string | null) => void;
  selectedDoc?: DocumentSummary | null;
  onExamSaved: (exam: GeneratedExam) => void;
  role?: "admin" | "teacher";
  onNavigate?: (view: View) => void;
}

export default function GeneratePanel({
  docs: propDocs,
  selectedDocId: propSelectedDocId,
  onSelectDoc: propOnSelectDoc,
  selectedDoc: propSelectedDoc,
  onExamSaved,
  role: propRole,
  onNavigate,
}: GeneratePanelProps) {
  const { user } = useAuth();
  const activeRole = propRole || user?.role || "teacher";

  // Documents & Blueprints state
  const [internalDocs, setInternalDocs] = useState<DocumentSummary[]>([]);
  const [internalSelectedDocId, setInternalSelectedDocId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<ExamTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Classes state (for admin publishing)
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("Initializing...");
  const [result, setResult] = useState<GeneratedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [activeViewMode, setActiveViewMode] = useState<"exam" | "key">("exam");
  const [published, setPublished] = useState(false);
  const [publishedInfo, setPublishedInfo] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // Resolve active docs list and selection
  const docs = propDocs !== undefined ? propDocs : internalDocs;
  const currentDocId = propSelectedDocId !== undefined ? propSelectedDocId : internalSelectedDocId;
  const selectedDoc =
    propSelectedDoc !== undefined
      ? propSelectedDoc
      : docs.find((d) => d.id === currentDocId) || null;

  const handleSelectDoc = (id: string | null) => {
    if (propOnSelectDoc) {
      propOnSelectDoc(id);
    } else {
      setInternalSelectedDocId(id);
    }
  };

  // Initial data loading
  useEffect(() => {
    if (propDocs === undefined) {
      documentsApi.list().then(setInternalDocs).catch(() => {});
    }

    setLoadingTemplates(true);
    templatesApi
      .list(activeRole)
      .then((data) => {
        setTemplates(data);
        if (data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));

    if (activeRole === "admin") {
      adminApi.listClasses().then(setClasses).catch(() => {});
    }
  }, [activeRole, propDocs]);

  // Load full template detail when selected to show live section breakdown
  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplateDetail(null);
      return;
    }
    templatesApi
      .get(selectedTemplateId)
      .then((detail) => setSelectedTemplateDetail(detail.config))
      .catch(() => setSelectedTemplateDetail(null));
  }, [selectedTemplateId]);

  // ── Inline Question Editing State & Handlers ──────────────────────────────
  const [editingQNum, setEditingQNum] = useState<number | null>(null);
  const [editQText, setEditQText] = useState("");
  const [editQMarks, setEditQMarks] = useState(1);
  const [editQAnswer, setEditQAnswer] = useState("");
  const [editQOptions, setEditQOptions] = useState<{ key: string; text: string }[]>([]);

  function handleStartEdit(q: any) {
    setEditingQNum(q.question_no);
    setEditQText(q.text || "");
    setEditQMarks(q.marks || 1);
    setEditQAnswer(q.answer || "");
    setEditQOptions(q.options ? JSON.parse(JSON.stringify(q.options)) : []);
  }

  function handleCancelEdit() {
    setEditingQNum(null);
  }

  function handleSaveEdit(qNum: number) {
    if (!result) return;
    const updatedQs = (result.questions || []).map((q: any) => {
      if (q.question_no === qNum) {
        return {
          ...q,
          text: editQText.trim(),
          marks: editQMarks,
          answer: editQAnswer.trim(),
          options: editQOptions.length > 0 ? editQOptions : q.options,
        };
      }
      return q;
    });

    const newTotal = updatedQs.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
    const updatedExam: GeneratedExam = {
      ...result,
      questions: updatedQs,
      total_marks: newTotal,
    };
    setResult(updatedExam);
    onExamSaved(updatedExam);
    setEditingQNum(null);
    setToast({ message: `Question Q${qNum} updated successfully!`, variant: "success" });
  }

  function handleDeleteQuestion(qNum: number) {
    if (!result) return;
    if (!window.confirm(`Are you sure you want to delete Question Q${qNum}?`)) return;
    const filtered = (result.questions || []).filter((q: any) => q.question_no !== qNum);
    const renumbered = filtered.map((q: any, i: number) => ({ ...q, question_no: i + 1 }));
    const newTotal = renumbered.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
    const updatedExam: GeneratedExam = {
      ...result,
      questions: renumbered,
      total_marks: newTotal,
    };
    setResult(updatedExam);
    onExamSaved(updatedExam);
    if (editingQNum === qNum) {
      setEditingQNum(null);
    }
    setToast({ message: `Question Q${qNum} deleted. Examination paper renumbered.`, variant: "info" });
  }

  async function handleGenerate() {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      setError("Please select an exam blueprint first.");
      return;
    }
    setError(null);
    setResult(null);
    setProgressMsg("Connecting to AI model...");
    setGenerating(true);
    try {
      const full = await templatesApi.get(tpl.id);
      const exam = await generationApi.generate(
        {
          template: full.config,
          document_id: selectedDoc ? selectedDoc.id : undefined,
          source_type: selectedDoc ? "document" : "hardcoded",
          custom_topic: customTopic.trim() || null,
        },
        (msg) => setProgressMsg(msg)
      );
      setResult(exam);
      setPublished(false);
      onExamSaved(exam);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleConfirmPublish(options: {
    targetClassId?: string;
    scheduleStartAt?: string;
    scheduleEndAt?: string;
  }) {
    if (!result) return;
    const examId = result.exam_id;
    if (!examId) {
      setToast({ message: "Exam ID missing. Please regenerate or save.", variant: "error" });
      return;
    }
    await generationApi.publish(examId, true, options);
    setPublished(true);
    const targetName = options.targetClassId
      ? classes.find((c) => c.id === options.targetClassId)?.name || "Selected Cohort"
      : "All Cohorts (Global)";

    let msg = `🎉 Quiz published to ${targetName}!`;
    if (options.scheduleStartAt) {
      const dt = new Date(options.scheduleStartAt);
      msg = `🗓️ Quiz scheduled for ${targetName} (Starts: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
    }
    setPublishedInfo(targetName);
    setToast({ message: msg, variant: "success" });
  }

  const handlePrint = (mode: "exam" | "key") => {
    setActiveViewMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const renderQuestions = (questions: any[], sections?: any[] | null) => {
    const uniqueSecIds = Array.from(new Set(questions.map((q) => q.section_id)));
    return questions.map((q, idx) => {
      const isFirstInSec = idx === 0 || q.section_id !== questions[idx - 1].section_id;
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
          q.type === "mcq"
            ? "MULTIPLE CHOICE QUESTIONS"
            : q.type.replace("_", " ").toUpperCase();
        secTitle = `SECTION ${secLetter} — ${typeLabel}`;
      }
      const secInstructions = sectionMeta?.instructions;

      return (
        <div key={`${idx}-${q.question_no}`} style={{ marginBottom: 16 }}>
          {isFirstInSec && (
            <div className="exam-section-header">
              <div className="exam-section-header__title">
                <span>{secTitle}</span>
                <span className="chip-badge no-print" style={{ fontSize: "11px" }}>
                  {q.marks} Mark{q.marks > 1 ? "s" : ""} each
                </span>
              </div>
              {secInstructions && (
                <div className="exam-section-header__instructions">{secInstructions}</div>
              )}
            </div>
          )}

          {editingQNum === q.question_no ? (
            <div
              className="question-card no-print"
              style={{
                border: "2px solid var(--accent)",
                background: "var(--surface)",
                padding: "20px",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.15)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontWeight: 800, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, fontSize: "14px" }}>
                  <Edit3 size={16} /> Editing Question [ Q{q.question_no} ] — {q.type.replace("_", " ").toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="gk-btn gk-btn--ghost gk-btn--sm"
                  style={{ padding: "3px 8px" }}
                >
                  <X size={15} /> Cancel
                </button>
              </div>

              {/* Question Textarea */}
              <div className="gk-field" style={{ marginBottom: 12 }}>
                <label className="gk-label" style={{ fontSize: "12px", fontWeight: 700 }}>
                  Question Text:
                </label>
                <textarea
                  className="gk-input"
                  rows={3}
                  value={editQText}
                  onChange={(e) => setEditQText(e.target.value)}
                  style={{ width: "100%", fontSize: "13.5px", resize: "vertical" }}
                />
              </div>

              {/* Marks & Answer Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, marginBottom: 12 }}>
                <div className="gk-field">
                  <label className="gk-label" style={{ fontSize: "12px", fontWeight: 700 }}>
                    Marks:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="gk-input"
                    value={editQMarks}
                    onChange={(e) => setEditQMarks(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ fontSize: "13px" }}
                  />
                </div>
                <div className="gk-field">
                  <label className="gk-label" style={{ fontSize: "12px", fontWeight: 700 }}>
                    Correct Answer / Key:
                  </label>
                  <input
                    type="text"
                    className="gk-input"
                    value={editQAnswer}
                    onChange={(e) => setEditQAnswer(e.target.value)}
                    placeholder="e.g. A, True, or model solution"
                    style={{ fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Options Editor (for MCQ or options-based questions) */}
              {editQOptions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label className="gk-label" style={{ fontSize: "12px", fontWeight: 700, marginBottom: 6 }}>
                    Answer Options:
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {editQOptions.map((opt, optIdx) => (
                      <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="text"
                          className="gk-input"
                          value={opt.key}
                          onChange={(e) => {
                            const next = [...editQOptions];
                            next[optIdx].key = e.target.value;
                            setEditQOptions(next);
                          }}
                          style={{ width: 44, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-mono)" }}
                        />
                        <input
                          type="text"
                          className="gk-input"
                          value={opt.text}
                          onChange={(e) => {
                            const next = [...editQOptions];
                            next[optIdx].text = e.target.value;
                            setEditQOptions(next);
                          }}
                          style={{ flex: 1, fontSize: "13px" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditQOptions(editQOptions.filter((_, i) => i !== optIdx));
                          }}
                          className="gk-btn gk-btn--ghost gk-btn--sm"
                          style={{ padding: "4px 8px", color: "var(--terracotta)" }}
                          title="Remove option"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const nextLetter = String.fromCharCode(65 + editQOptions.length);
                        setEditQOptions([...editQOptions, { key: nextLetter, text: `Option ${nextLetter}` }]);
                      }}
                      className="gk-btn gk-btn--secondary gk-btn--sm"
                      style={{ alignSelf: "flex-start", fontSize: "11px", marginTop: 4 }}
                    >
                      <Plus size={12} /> Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Save / Cancel / Delete Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(q.question_no)}
                  className="gk-btn gk-btn--ghost"
                  style={{ color: "var(--terracotta)", fontSize: "12px", gap: 5 }}
                >
                  <Trash2 size={14} /> Delete Question
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="gk-btn gk-btn--secondary"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(q.question_no)}
                    className="gk-btn gk-btn--primary"
                    style={{ fontSize: "12px", padding: "6px 14px", gap: 6 }}
                  >
                    <Check size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="question-card">
              <div className="question-card__header">
                <span className="question-card__num" style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  [ Q{q.question_no} ]
                </span>
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
                    <MathText content={q.text} />
                  </div>
                )}
                <span className="chip-badge chip-badge--gold question-card__marks">
                  {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                </span>
                <span className="chip-badge question-card__type no-print">
                  {q.type.replace("_", " ")}
                </span>
                {/* Inline Question Controls */}
                <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(q)}
                    className="gk-btn gk-btn--secondary"
                    style={{ fontSize: "11px", padding: "3px 8px", gap: 4, height: 26 }}
                    title="Edit question text, answer, or marks"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.question_no)}
                    className="gk-btn gk-btn--ghost"
                    style={{ fontSize: "11px", padding: "3px 6px", height: 26, color: "var(--terracotta)" }}
                    title="Delete question"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

            {q.type !== "match_the_following" && q.options && q.options.length > 0 && (
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
                      background: activeViewMode === "key" && opt.key === q.answer ? "var(--forest-light)" : "var(--surface)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: activeViewMode === "key" && opt.key === q.answer ? "var(--forest)" : "var(--surface-sunken)",
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

            {activeViewMode === "key" && q.answer && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "var(--forest-light)",
                  border: "1px solid var(--forest)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={15} />
                  <span>Model Solution & Marking Scheme:</span>
                </div>
                <div style={{ color: "var(--text)" }}>
                  <MathText content={q.answer} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  });
};

  return (
    <div className="gurukul-page">
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* ── Top Header ── */}
      <div className="page-header no-print" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="chip-badge chip-badge--accent">
            <Sparkles size={12} /> RACHNA STUDIO
          </span>
          <span className="shloka" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
            रचना परीक्षा निर्माण
          </span>
        </div>
        <h1 className="page-header__title" style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
          <span>Exam Paper Generator</span>
        </h1>
        <p className="page-header__subtitle" style={{ marginTop: 4 }}>
          Select your syllabus source document and an exam blueprint to synthesize balanced examination papers with verified model answer keys.
        </p>
      </div>

      {/* ── Studio Configuration (When No Exam Generated) ── */}
      {!result && (
        <div
          className="no-print"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ── Left Column: Steps 1, 2 & 3 ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Step 1: Granth Document Source */}
            <div className="lens-card" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "var(--forest-light)",
                      color: "var(--forest)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Library size={17} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "15.5px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
                      1. Syllabus Source (Granth)
                    </h3>
                    <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: 0 }}>
                      Select the textbook or notes to extract questions from
                    </p>
                  </div>
                </div>
                <span className="chip-badge chip-badge--forest" style={{ fontSize: "10px" }}>
                  STEP 1
                </span>
              </div>

              {docs.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    background: "var(--surface-sunken)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <FolderOpen size={28} style={{ color: "var(--text-3)", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "10px" }}>
                    No documents uploaded in your library yet.
                  </p>
                  {onNavigate && (
                    <button
                      className="gk-btn gk-btn--secondary gk-btn--sm"
                      onClick={() => onNavigate("library")}
                    >
                      <Plus size={13} /> Upload to Granth Library
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
                  {/* No document option */}
                  <div
                    onClick={() => handleSelectDoc(null)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: currentDocId === null ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      background: currentDocId === null ? "var(--accent-light)" : "var(--surface)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Globe size={16} color={currentDocId === null ? "var(--accent)" : "var(--text-2)"} />
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>
                          Direct AI Synthesis (Standard Course Syllabus)
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-2)", marginTop: 2 }}>
                          Synthesizes questions from standard academic textbook curriculum (No PDF required)
                        </div>
                      </div>
                    </div>
                    {currentDocId === null && <Check size={16} color="var(--accent)" />}
                  </div>

                  {/* Document cards */}
                  {docs.map((doc) => {
                    const isSelected = doc.id === currentDocId;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc.id)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: isSelected ? "1.5px solid var(--forest)" : "1px solid var(--border)",
                          background: isSelected ? "var(--forest-light)" : "var(--surface)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1, marginRight: 8 }}>
                          <FileText size={16} color={isSelected ? "var(--forest)" : "var(--text-2)"} style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {doc.filename}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                              <span style={{ fontWeight: 600 }}>{doc.subject || "General"}</span>
                              <span>•</span>
                              <span>{doc.chunk_count} Chunks Indexed</span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={16} color="var(--forest)" style={{ flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Vidya Exam Blueprint */}
            <div className="lens-card" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "var(--gold-light)",
                      color: "var(--gold-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={17} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "15.5px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
                      2. Exam Blueprint (Vidya)
                    </h3>
                    <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: 0 }}>
                      Choose your layout, marks, and question formats
                    </p>
                  </div>
                </div>
                <span className="chip-badge chip-badge--gold" style={{ fontSize: "10px" }}>
                  STEP 2
                </span>
              </div>

              {templates.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <ScrollText size={28} style={{ color: "var(--text-3)", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "10px" }}>
                    No blueprints available. Create one to define sections and marks.
                  </p>
                  {onNavigate && (
                    <button
                      className="gk-btn gk-btn--secondary gk-btn--sm"
                      onClick={() => onNavigate("builder")}
                    >
                      <Plus size={13} /> Create Blueprint in Vidya
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  {templates.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        style={{
                          padding: "14px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                          background: isSelected ? "var(--accent-light)" : "var(--surface)",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease",
                          boxShadow: "var(--shadow-sm)",
                          minHeight: 88,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
                            {tpl.name}
                          </span>
                          {isSelected && <Check size={16} color="var(--accent)" style={{ flexShrink: 0 }} />}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: isSelected ? "var(--accent)" : "var(--text-2)",
                              background: isSelected ? "rgba(234, 88, 12, 0.12)" : "var(--surface-2)",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: isSelected ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                            }}
                          >
                            {tpl.subject}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: isSelected ? "var(--accent)" : "var(--text-2)",
                              background: isSelected ? "rgba(234, 88, 12, 0.12)" : "var(--surface-2)",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: isSelected ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                            }}
                          >
                            {tpl.grade}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Custom Focus & Instructions (Optional) */}
            <div className="lens-card" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Sliders size={16} color="var(--accent)" />
                <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
                  Custom Focus & Instructions (Optional)
                </h4>
              </div>
              <input
                type="text"
                className="gk-input"
                placeholder="e.g. Focus on Chapter 3 numericals, include conceptual reasoning questions..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                style={{ fontSize: "13px" }}
              />
            </div>
          </div>

          {/* ── Right Column: Live Blueprint Summary & Synthesis Hub ── */}
          <div style={{ position: "sticky", top: "20px" }}>
            <div
              className="lens-card"
              style={{
                padding: "26px",
                border: "1.5px solid var(--border)",
                background: "var(--surface)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span className="chip-badge chip-badge--accent">
                  <Sparkles size={11} /> SYNTHESIS HUB
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                  Ready to compile
                </span>
              </div>

              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>
                Exam Overview
              </h3>

              {/* Specs Summary Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Subject & Class
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
                    {selectedTemplateDetail?.subject || "Subject"} • {selectedTemplateDetail?.grade || "Grade"}
                  </div>
                </div>

                <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Total Marks & Time
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--gold-border)", marginTop: 4 }}>
                    {selectedTemplateDetail?.total_marks ? `${selectedTemplateDetail.total_marks} Marks` : "Marks"} • {selectedTemplateDetail?.duration_minutes ? `${selectedTemplateDetail.duration_minutes}m` : "Time"}
                  </div>
                </div>
              </div>

              {/* Source Document Tag */}
              <div style={{ marginBottom: 18, padding: "12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>
                  Syllabus Document Source
                </div>
                <div style={{ fontSize: "13px", color: "var(--text)", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  <FileText size={15} color="var(--forest)" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedDoc ? selectedDoc.filename : "Curriculum Standard Knowledge (No PDF)"}
                  </span>
                </div>
              </div>

              {/* Section breakdown */}
              {selectedTemplateDetail?.sections && selectedTemplateDetail.sections.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 8, letterSpacing: "0.04em" }}>
                    Sections Planned ({selectedTemplateDetail.sections.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedTemplateDetail.sections.map((sec, i) => (
                      <div
                        key={sec.id || i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12.5px",
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>
                          {sec.title || `Section ${String.fromCharCode(65 + i)}`}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--text-2)",
                            background: "var(--surface)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {sec.num_questions} Qs • {sec.marks_per_question * sec.num_questions}M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: "var(--terracotta-light)",
                    border: "1px solid var(--terracotta)",
                    color: "var(--terracotta)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Synthesis Button & Integrated Progress */}
              {generating ? (
                <div
                  style={{
                    padding: "18px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-sunken)",
                    border: "1.5px solid var(--accent-mid)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
                    <span className="spin" style={{ width: 18, height: 18, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} />
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                      Synthesizing Questions...
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0 }}>
                    {progressMsg}
                  </p>
                </div>
              ) : (
                <button
                  className="gk-btn gk-btn--primary"
                  onClick={handleGenerate}
                  disabled={!selectedTemplateId}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "14px 20px",
                    fontSize: "15px",
                    fontWeight: 800,
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 4px 18px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  <Sparkles size={18} />
                  Generate Exam Paper (रचना करें)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Generated Exam Result View ── */}
      {result && (
        <div>
          {/* Success Banner & Action Toolbar */}
          <div
            className="no-print"
            style={{
              padding: "16px 20px",
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "24px",
              boxShadow: "var(--shadow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--forest-light)",
                  color: "var(--forest)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  Exam Paper Generated & Saved to Itihas
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0 }}>
                  {getCleanExamTitle(result.heading_details, result.subject, result.grade)} • {result.total_marks} Marks • {result.questions?.length || 0} Questions
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Mode Toggle */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-sunken)",
                  padding: "3px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={() => setActiveViewMode("exam")}
                  className="gk-btn"
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    background: activeViewMode === "exam" ? "var(--surface)" : "transparent",
                    color: activeViewMode === "exam" ? "var(--accent)" : "var(--text-2)",
                    fontWeight: activeViewMode === "exam" ? 700 : 500,
                    boxShadow: activeViewMode === "exam" ? "var(--shadow-sm)" : "none",
                  }}
                >
                  Question Paper (प्रश्नपत्र)
                </button>
                <button
                  onClick={() => setActiveViewMode("key")}
                  className="gk-btn"
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    background: activeViewMode === "key" ? "var(--surface)" : "transparent",
                    color: activeViewMode === "key" ? "var(--accent)" : "var(--text-2)",
                    fontWeight: activeViewMode === "key" ? 700 : 500,
                    boxShadow: activeViewMode === "key" ? "var(--shadow-sm)" : "none",
                  }}
                >
                  Answer Key (उत्तर कुंजी)
                </button>
              </div>

              {/* Print Button */}
              <button
                className="gk-btn gk-btn--secondary"
                onClick={() => handlePrint(activeViewMode)}
                style={{ fontSize: "12px", padding: "6px 12px", gap: 6 }}
              >
                <Printer size={14} /> Print {activeViewMode === "exam" ? "Paper" : "Key"}
              </button>

              {/* JSON Export */}
              <button
                className="gk-btn gk-btn--secondary"
                onClick={() => downloadExamAsJson(result)}
                style={{ fontSize: "12px", padding: "6px 12px", gap: 6 }}
                title="Download JSON export"
              >
                <Download size={14} /> JSON
              </button>

              {/* Word Export */}
              <button
                className="gk-btn gk-btn--secondary"
                onClick={() => downloadExamAsDocx(result, activeViewMode === "key")}
                style={{ fontSize: "12px", padding: "6px 12px", gap: 6 }}
                title="Download formatted Word document (.docx)"
              >
                <FileText size={14} /> Word (.docx)
              </button>

              {/* Markdown Export */}
              <button
                className="gk-btn gk-btn--secondary"
                onClick={() => downloadExamAsMarkdown(result, activeViewMode === "key")}
                style={{ fontSize: "12px", padding: "6px 12px", gap: 6 }}
                title="Download Markdown document (.md)"
              >
                <FileCode2 size={14} /> Markdown (.md)
              </button>

              {/* Publish to Students */}
              <button
                className="gk-btn gk-btn--primary"
                onClick={() => setShowPublishModal(true)}
                style={{ fontSize: "12px", padding: "6px 14px", gap: 6 }}
              >
                <Send size={14} /> Publish Quiz
              </button>

              {/* Reset to create another */}
              <button
                className="gk-btn gk-btn--ghost"
                onClick={() => setResult(null)}
                style={{ fontSize: "12px", padding: "6px 10px" }}
              >
                <RefreshCw size={13} /> Create Another
              </button>
            </div>
          </div>

          {/* ── Printable Academic Exam Paper Sheet ── */}
          <div
            className={`exam-result ${activeViewMode === "key" ? "print-key-only exam-result--key" : "print-exam-only exam-result--exam"}`}
            id="exam-result"
          >
            {/* School / Institution Header */}
            <div className="exam-result__header">
              {result.heading_details ? (
                <div
                  className="exam-result__institution"
                  dangerouslySetInnerHTML={{ __html: result.heading_details }}
                />
              ) : (
                <div className="exam-result__institution" style={{ fontSize: "16pt", fontWeight: 800 }}>
                  {result.subject} EXAMINATION
                </div>
              )}
              {activeViewMode === "key" && (
                <div style={{ textAlign: "center", fontWeight: 700, fontSize: "13pt", margin: "6px 0", color: "var(--accent, #b45309)" }}>
                  ANSWER KEY & MARKING SCHEME
                </div>
              )}
              <div className="exam-result__meta">
                <span>Time: {result.duration_minutes || 60} Minutes</span>
                <span>Maximum Marks: {result.total_marks || 50}</span>
              </div>
            </div>

            <hr className="exam-result__divider" />

            <div className="exam-result__body">
              {/* Instructions */}
              {result.instructions && (
                <div className="exam-result__instructions-box">
                  <div className="exam-result__instructions-title">General Instructions</div>
                  <div
                    className="exam-result__instructions-content"
                    style={{ fontFamily: "inherit", margin: 0 }}
                    dangerouslySetInnerHTML={{
                      __html: result.instructions.startsWith("<")
                        ? result.instructions
                        : `<p>${result.instructions}</p>`,
                    }}
                  />
                </div>
              )}

              {/* Questions Container */}
              <div className="exam-questions">
                {renderQuestions(result.questions || [], result.sections)}
              </div>
            </div>
          </div>

          {/* Publish Modal */}
          <PublishQuizModal
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            onConfirm={handleConfirmPublish}
            examTitle={getCleanExamTitle(result.heading_details, result.subject, result.grade)}
            classes={classes}
          />
        </div>
      )}
    </div>
  );
}
