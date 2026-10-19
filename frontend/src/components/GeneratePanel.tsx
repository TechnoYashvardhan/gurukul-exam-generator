"use client";

import { useCallback, useEffect, useState } from "react";
import { documentsApi, generationApi, templatesApi, adminApi } from "@/lib/api";
import type { DocumentSummary } from "@/types/document";
import type { TemplateSummary, GeneratedExam, ExamTemplate, QuestionChoice } from "@/types/template";
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
  ArrowLeft,
  Search,
  Flame,
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
  Shuffle,
} from "lucide-react";
import DiyaAnimation from "./DiyaAnimation";
import MathText from "./MathText";
import { useAuth } from "./AuthProvider";
import Toast, { ToastVariant } from "./Toast";
import PublishQuizModal from "./PublishQuizModal";
import MatchQuestionView from "./MatchQuestionView";
import { calculateSectionTotalMarks } from "./SectionCard";
import { ProgressBar, ProgressTracker } from "./ProgressBar";
import { useProgressSimulation, type ProgressStage } from "@/hooks/useProgressSimulation";
import {
  downloadExamAsJson,
  downloadExamAsDocx,
  downloadExamAsMarkdown,
  getCleanExamTitle,
} from "@/lib/exportUtils";
import type { View } from "./Sidebar";

const EXAM_GEN_STAGES: ProgressStage[] = [
  { name: "Architecting Blueprint & Prompt...", targetProgress: 20 },
  { name: "Synthesizing Questions & Passages...", targetProgress: 50 },
  { name: "Validating Marking Schemes & LaTeX...", targetProgress: 80 },
  { name: "Finalizing Examination Paper...", targetProgress: 95 },
];

const EXAM_GEN_TIPS = [
  "Gurukul AI balances Bloom's Taxonomy across factual, analytical, and higher-order thinking.",
  "Reading passages include factual MCQs, inference questions, vocabulary context, and inverse exceptions.",
  "Creative writing tasks include word limits, boxed stimulus layouts, and format rubrics.",
  "Prescribed NCERT literature questions include internal choices and cross-chapter analytical prompts.",
];

interface GeneratePanelProps {
  docs?: DocumentSummary[];
  selectedDocId?: string | null;
  selectedDocIds?: string[];
  onSelectDoc?: (docId: string | null) => void;
  onSelectDocs?: (docIds: string[]) => void;
  selectedDoc?: DocumentSummary | null;
  onExamSaved: (exam: GeneratedExam) => void;
  role?: "admin" | "teacher";
  onNavigate?: (view: View) => void;
}

export default function GeneratePanel({
  docs: propDocs,
  selectedDocId: propSelectedDocId,
  selectedDocIds: propSelectedDocIds,
  onSelectDoc: propOnSelectDoc,
  onSelectDocs: propOnSelectDocs,
  selectedDoc: propSelectedDoc,
  onExamSaved,
  role: propRole,
  onNavigate,
}: GeneratePanelProps) {
  const { user } = useAuth();
  const activeRole = propRole || user?.role || "teacher";

  // Documents & Blueprints state
  const [internalDocs, setInternalDocs] = useState<DocumentSummary[]>([]);
  const [internalSelectedDocIds, setInternalSelectedDocIds] = useState<string[]>([]);
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

  // Step wizard state (1: Granth / Syllabus, 2: Vidya / Blueprint, 3: Rachna / Synthesis)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [docSearch, setDocSearch] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  // Live progressive simulation tracker for exam generation
  const examSim = useProgressSimulation({
    active: generating,
    stages: EXAM_GEN_STAGES,
    externalStatus: progressMsg,
    tips: EXAM_GEN_TIPS,
    autoAdvanceSeconds: 4,
  });

  // Resolve active docs list and selection
  const docs = propDocs !== undefined ? propDocs : internalDocs;

  // Resolve active document IDs array
  const activeDocIds: string[] =
    propSelectedDocIds !== undefined
      ? propSelectedDocIds
      : propSelectedDocId !== undefined
      ? propSelectedDocId
        ? [propSelectedDocId]
        : []
      : internalSelectedDocIds;

  const handleToggleDoc = (id: string) => {
    let nextIds: string[];
    if (activeDocIds.includes(id)) {
      nextIds = activeDocIds.filter((d) => d !== id);
    } else {
      nextIds = [...activeDocIds, id];
    }
    if (propOnSelectDocs) {
      propOnSelectDocs(nextIds);
    }
    if (propOnSelectDoc) {
      propOnSelectDoc(nextIds.length > 0 ? nextIds[0] : null);
    }
    setInternalSelectedDocIds(nextIds);
  };

  const handleSelectAllDocs = () => {
    const readyIds = docs.filter((d) => d.status === "ready").map((d) => d.id);
    if (propOnSelectDocs) {
      propOnSelectDocs(readyIds);
    }
    if (propOnSelectDoc) {
      propOnSelectDoc(readyIds[0] || null);
    }
    setInternalSelectedDocIds(readyIds);
  };

  const handleClearDocs = () => {
    if (propOnSelectDocs) {
      propOnSelectDocs([]);
    }
    if (propOnSelectDoc) {
      propOnSelectDoc(null);
    }
    setInternalSelectedDocIds([]);
  };

  const selectedDocuments = docs.filter((d) => activeDocIds.includes(d.id));

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
  const [editQPassage, setEditQPassage] = useState<string>("");
  const [editQMarks, setEditQMarks] = useState(1);
  const [editQAnswer, setEditQAnswer] = useState("");
  const [editQOptions, setEditQOptions] = useState<{ key: string; text: string }[]>([]);
  const [editQOrChoice, setEditQOrChoice] = useState<QuestionChoice | null>(null);

  function handleStartEdit(q: any) {
    setEditingQNum(q.question_no);
    setEditQText(q.text || "");
    setEditQPassage(q.passage || "");
    setEditQMarks(q.marks || 1);
    setEditQAnswer(q.answer || "");
    setEditQOptions(q.options ? JSON.parse(JSON.stringify(q.options)) : []);
    setEditQOrChoice(q.or_choice ? JSON.parse(JSON.stringify(q.or_choice)) : null);
  }

  function handleCancelEdit() {
    setEditingQNum(null);
    setEditQOrChoice(null);
  }

  function handleSaveEdit(qNum: number) {
    if (!result) return;
    const updatedQs = (result.questions || []).map((q: any) => {
      if (q.question_no === qNum) {
        return {
          ...q,
          text: editQText.trim(),
          passage: editQPassage.trim() ? editQPassage.trim() : null,
          marks: editQMarks,
          answer: editQAnswer.trim(),
          options: editQOptions.length > 0 ? editQOptions : q.options,
          or_choice: editQOrChoice,
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
    setEditQOrChoice(null);
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

  const handleResetToStep1 = () => {
    setResult(null);
    setCurrentStep(1);
    setError(null);
  };

  async function handleGenerate() {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      setError("Please select an exam blueprint first.");
      return;
    }
    setCurrentStep(3);
    setError(null);
    setResult(null);
    setProgressMsg("Connecting to AI model...");
    setGenerating(true);
    try {
      const full = await templatesApi.get(tpl.id);
      const exam = await generationApi.generate(
        {
          template: full.config,
          document_id: selectedDocuments.length > 0 ? selectedDocuments[0].id : undefined,
          document_ids: selectedDocuments.map((d) => d.id),
          source_type: selectedDocuments.length > 0 ? "document" : "hardcoded",
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

          {isFirstInSubSec && q.sub_section_title && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: isFirstInSec ? 10 : 18,
                marginBottom: 12,
                padding: "7px 12px",
                background: "rgba(99, 102, 241, 0.08)",
                borderLeft: "4px solid var(--primary, #6366f1)",
                borderRadius: "0 6px 6px 0",
              }}
            >
              <Layers size={14} style={{ color: "var(--primary, #6366f1)" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                {q.sub_section_title}
              </span>
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
                  Question Instruction / Text:
                </label>
                <textarea
                  className="gk-input"
                  rows={2}
                  value={editQText}
                  onChange={(e) => setEditQText(e.target.value)}
                  style={{ width: "100%", fontSize: "13.5px", resize: "vertical" }}
                />
              </div>

              {/* Passage Editor (for Case Study / Reading Comprehension) */}
              {(editQPassage !== "" || q.passage || q.type === "case_study") && (
                <div className="gk-field" style={{ marginBottom: 12 }}>
                  <label className="gk-label" style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
                    📖 Comprehension Passage / Case Study Context:
                  </label>
                  <textarea
                    className="gk-input"
                    rows={6}
                    value={editQPassage}
                    onChange={(e) => setEditQPassage(e.target.value)}
                    placeholder="Enter comprehension passage, case study narrative, or context extract..."
                    style={{ width: "100%", fontSize: "13px", lineHeight: 1.5, resize: "vertical" }}
                  />
                </div>
              )}

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

              {/* Internal Choice ("OR" Option) Editor */}
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  background: editQOrChoice ? "rgba(99, 102, 241, 0.05)" : "var(--surface-sunken)",
                  border: editQOrChoice ? "1px solid rgba(99, 102, 241, 0.3)" : "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editQOrChoice ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Shuffle size={14} style={{ color: editQOrChoice ? "var(--primary, #6366f1)" : "var(--text-3)" }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-1)" }}>
                      Internal Choice: Option B (OR Question)
                    </span>
                  </div>
                  {editQOrChoice ? (
                    <button
                      type="button"
                      onClick={() => setEditQOrChoice(null)}
                      className="gk-btn gk-btn--ghost gk-btn--sm"
                      style={{ fontSize: "11px", color: "var(--terracotta)", padding: "2px 8px" }}
                    >
                      <Trash2 size={11} style={{ marginRight: 4 }} /> Remove OR Choice
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditQOrChoice({ text: "Alternative Question Text", answer: "Model solution for alternative" })}
                      className="gk-btn gk-btn--secondary gk-btn--sm"
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      <Plus size={11} style={{ marginRight: 4 }} /> + Add OR Alternative
                    </button>
                  )}
                </div>

                {editQOrChoice && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="gk-field">
                      <label className="gk-label" style={{ fontSize: "11px" }}>
                        Option B Question Text:
                      </label>
                      <textarea
                        className="gk-textarea"
                        rows={2}
                        value={editQOrChoice.text || ""}
                        onChange={(e) => setEditQOrChoice({ ...editQOrChoice, text: e.target.value })}
                        placeholder="Alternative question text (e.g. Discuss the theme of...)"
                        style={{ fontSize: "12.5px" }}
                      />
                    </div>
                    <div className="gk-field">
                      <label className="gk-label" style={{ fontSize: "11px" }}>
                        Option B Correct Answer / Solution:
                      </label>
                      <input
                        type="text"
                        className="gk-input"
                        value={editQOrChoice.answer || ""}
                        onChange={(e) => setEditQOrChoice({ ...editQOrChoice, answer: e.target.value })}
                        placeholder="Model answer for Option B"
                        style={{ fontSize: "12.5px" }}
                      />
                    </div>
                  </div>
                )}
              </div>

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
                    {q.or_choice && !q.text?.trim().startsWith("A.") && !q.text?.trim().startsWith("(A)") && !q.passage && (
                      <strong style={{ marginRight: 6, color: "var(--primary, #6366f1)" }}>A. </strong>
                    )}
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
                <div className="exam-passage-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--accent)", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
                          <span className="exam-sub-num" style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)", minWidth: 24, fontSize: "13px" }}>
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
                        <div className="exam-sub-options-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6, marginTop: 8, paddingLeft: 32 }}>
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
                                background: activeViewMode === "key" && sOpt.key === sub.answer ? "var(--forest-light)" : "var(--surface-sunken)",
                                border: activeViewMode === "key" && sOpt.key === sub.answer ? "1px solid var(--forest)" : "1px solid var(--border)",
                              }}
                            >
                              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: activeViewMode === "key" && sOpt.key === sub.answer ? "var(--forest)" : "var(--text-3)", fontSize: "11.5px" }}>
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
                        <div className="exam-sub-answer" style={{ marginTop: 8, marginLeft: 32, padding: "5px 10px", background: "var(--forest-light)", border: "1px solid var(--forest)", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: 6, color: "var(--forest)" }}>
                          <CheckCircle size={13} />
                          <span><strong>Model Answer:</strong> <MathText content={sub.answer} /></span>
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
                      background: activeViewMode === "key" && opt.key === q.answer ? "var(--forest-light)" : "var(--surface)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        width: "26px",
                        height: "22px",
                        borderRadius: "4px",
                        background: activeViewMode === "key" && opt.key === q.answer ? "var(--forest)" : "transparent",
                        color: activeViewMode === "key" && opt.key === q.answer ? "#fff" : "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12.5px",
                      }}
                    >
                      ({opt.key})
                    </span>
                    <span style={{ fontSize: "13.5px" }}>
                      <MathText content={opt.text} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Top-Level Answer Key */}
            {activeViewMode === "key" && q.answer && (
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
                <div style={{ fontWeight: 700, color: "var(--forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
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
                    <div className="exam-passage-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--primary, #6366f1)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
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
                  <span className="exam-or-label" style={{ fontWeight: 800, color: "var(--primary, #6366f1)", marginRight: 8, fontFamily: "var(--font-mono)" }}>
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
                              <span className="exam-sub-num" style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--primary, #6366f1)", minWidth: 24, fontSize: "12.5px" }}>
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
                            <div className="exam-sub-options-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6, marginTop: 8, paddingLeft: 32 }}>
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
                                    background: activeViewMode === "key" && sOpt.key === sub.answer ? "var(--forest-light)" : "var(--surface-sunken)",
                                    border: activeViewMode === "key" && sOpt.key === sub.answer ? "1px solid var(--forest)" : "1px solid var(--border)",
                                  }}
                                >
                                  <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: activeViewMode === "key" && sOpt.key === sub.answer ? "var(--forest)" : "var(--text-3)", fontSize: "11px" }}>
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
                            <div className="exam-sub-answer" style={{ marginTop: 8, marginLeft: 32, padding: "5px 10px", background: "var(--forest-light)", border: "1px solid var(--forest)", borderRadius: "4px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: 6, color: "var(--forest)" }}>
                              <CheckCircle size={12} />
                              <span><strong>Model Answer:</strong> <MathText content={sub.answer} /></span>
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
                          background: activeViewMode === "key" && opt.key === q.or_choice?.answer ? "var(--forest-light)" : "var(--surface)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            width: "24px",
                            height: "20px",
                            borderRadius: "4px",
                            background: activeViewMode === "key" && opt.key === q.or_choice?.answer ? "var(--forest)" : "transparent",
                            color: activeViewMode === "key" && opt.key === q.or_choice?.answer ? "#fff" : "var(--text)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                          }}
                        >
                          ({opt.key})
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
                    <div style={{ fontWeight: 700, color: "var(--forest)", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
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
        )}
      </div>
    );
  });
};

  const filteredDocs = docs.filter((d) => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      d.filename.toLowerCase().includes(q) ||
      (d.subject && d.subject.toLowerCase().includes(q)) ||
      (d.grade && d.grade.toLowerCase().includes(q))
    );
  });

  const uniqueSubjects: string[] = Array.from(
    new Set(templates.map((t) => t.subject).filter((s): s is string => Boolean(s)))
  );
  const filteredTemplates = templates.filter((t) => {
    if (selectedSubjectFilter === "all") return true;
    return t.subject?.toLowerCase() === selectedSubjectFilter.toLowerCase();
  });

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

      {/* ── 3-Step Wizard Navigation Stepper ── */}
      <div className="rachna-stepper no-print">
        {/* Step 1: Granth */}
        <button
          type="button"
          onClick={() => {
            if (!generating) setCurrentStep(1);
          }}
          className={`rachna-step-btn ${
            currentStep === 1
              ? "rachna-step-btn--active"
              : currentStep > 1 || result || activeDocIds.length > 0
              ? "rachna-step-btn--completed"
              : ""
          }`}
        >
          <div className="rachna-step-num">
            {currentStep > 1 || result ? <Check size={14} /> : "1"}
          </div>
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, lineHeight: 1.2 }}>
              १. ग्रन्थ चयन (Granth)
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: 2 }}>
              {activeDocIds.length === 0
                ? "Standard Curriculum"
                : `${activeDocIds.length} doc${activeDocIds.length > 1 ? "s" : ""} selected`}
            </div>
          </div>
        </button>

        <div
          className={`rachna-step-divider ${
            currentStep >= 2 ? "rachna-step-divider--active" : ""
          }`}
        />

        {/* Step 2: Vidya */}
        <button
          type="button"
          onClick={() => {
            if (!generating) setCurrentStep(2);
          }}
          className={`rachna-step-btn ${
            currentStep === 2
              ? "rachna-step-btn--active"
              : result || (selectedTemplateId && currentStep > 2)
              ? "rachna-step-btn--completed"
              : ""
          }`}
        >
          <div className="rachna-step-num">
            {result ? <Check size={14} /> : "2"}
          </div>
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, lineHeight: 1.2 }}>
              २. विद्या प्रारूप (Vidya)
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: 2 }}>
              {templates.find((t) => t.id === selectedTemplateId)?.name || "Select Blueprint"}
            </div>
          </div>
        </button>

        <div
          className={`rachna-step-divider ${
            currentStep === 3 || result ? "rachna-step-divider--active" : ""
          }`}
        />

        {/* Step 3: Rachna */}
        <button
          type="button"
          onClick={() => {
            if (result || generating) setCurrentStep(3);
          }}
          disabled={!result && !generating && currentStep < 3}
          className={`rachna-step-btn ${
            currentStep === 3
              ? "rachna-step-btn--active"
              : result
              ? "rachna-step-btn--completed"
              : ""
          }`}
          style={{ opacity: !result && !generating && currentStep < 3 ? 0.6 : 1 }}
        >
          <div className="rachna-step-num">
            {result ? <Check size={14} /> : <Flame size={14} />}
          </div>
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, lineHeight: 1.2 }}>
              ३. रचना आरम्भ (Rachna)
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: 2 }}>
              {generating
                ? "Synthesizing..."
                : result
                ? "Paper Ready"
                : "Sacred Synthesis"}
            </div>
          </div>
        </button>
      </div>

      {/* ── STEP 1: Granth / Syllabus Selection ── */}
      {currentStep === 1 && !result && (
        <div className="rachna-step-pane no-print">
          <div className="lens-card" style={{ padding: "26px", marginBottom: "20px" }}>
            {/* Header */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="chip-badge chip-badge--forest" style={{ fontSize: "10.5px" }}>
                  चरण १ • ग्रन्थ चयन
                </span>
                <span style={{ fontSize: "12px", color: "var(--forest)", fontWeight: 700 }}>
                  SYLLABUS GROUNDING
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "19px", fontWeight: 800, color: "var(--text)", margin: "0 0 6px" }}>
                Select Syllabus Source Documents (ग्रन्थ चयन)
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0, maxWidth: "700px" }}>
                Select 1 or more textbooks/notes from your Granth Library for rigorous source-grounded question extraction, or choose Direct Curriculum mode for standard academic syllabus standards.
              </p>
            </div>

            {/* Direct Curriculum Mode Highlight Banner */}
            <div
              onClick={handleClearDocs}
              className="conduit-cell"
              style={{
                padding: "16px 20px",
                borderRadius: "var(--radius-md)",
                border: activeDocIds.length === 0 ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                background: activeDocIds.length === 0 ? "var(--accent-light)" : "var(--surface)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                boxShadow: activeDocIds.length === 0 ? "0 4px 18px rgba(234, 88, 12, 0.15)" : "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "10px",
                    background: activeDocIds.length === 0 ? "var(--accent)" : "var(--surface-sunken)",
                    color: activeDocIds.length === 0 ? "#FFFFFF" : "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Globe size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--text)" }}>
                      Direct Academic Curriculum Mode (प्रत्यक्ष पाठ्यक्रम)
                    </span>
                    {activeDocIds.length === 0 && (
                      <span className="chip-badge chip-badge--accent" style={{ fontSize: "10px", padding: "1px 7px" }}>
                        CURRENTLY ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: 2 }}>
                    Synthesizes examination questions from standard academic curriculum (CBSE / ICSE / State Board) without requiring uploaded PDF documents.
                  </div>
                </div>
              </div>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: activeDocIds.length === 0 ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                  background: activeDocIds.length === 0 ? "var(--accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFF",
                  flexShrink: 0,
                }}
              >
                {activeDocIds.length === 0 && <Check size={14} />}
              </div>
            </div>

            {/* Document Search & Bulk Actions Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 440 }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }} />
                <input
                  type="text"
                  className="gk-input"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search textbook name, subject, or grade..."
                  style={{ paddingLeft: 34, fontSize: "13px", height: 38 }}
                />
                {docSearch && (
                  <button
                    onClick={() => setDocSearch("")}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {docs.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAllDocs}
                    className="gk-btn gk-btn--secondary gk-btn--sm"
                    style={{ fontSize: "12px" }}
                  >
                    Select All ({docs.length})
                  </button>
                )}
                {activeDocIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDocs}
                    className="gk-btn gk-btn--ghost gk-btn--sm"
                    style={{ fontSize: "12px", color: "var(--terracotta)" }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {/* Selected Documents Badges */}
            {selectedDocuments.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--forest)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Library size={14} /> Selected ({selectedDocuments.length}):
                </span>
                {selectedDocuments.map((d) => (
                  <span
                    key={d.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "var(--forest-light)",
                      border: "1px solid var(--forest)",
                      color: "var(--forest)",
                      fontSize: "11.5px",
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={12} />
                    <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.filename}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleDoc(d.id); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Documents Matrix */}
            {docs.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--border)",
                }}
              >
                <FolderOpen size={36} style={{ color: "var(--text-3)", margin: "0 auto 10px" }} />
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
                  No Textbooks in Granth Library Yet
                </h4>
                <p style={{ fontSize: "12.5px", color: "var(--text-2)", marginBottom: "14px" }}>
                  You can proceed using the Direct Curriculum option above, or upload reference documents.
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
            ) : filteredDocs.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "var(--text-3)", fontSize: "13px" }}>
                No textbooks match "{docSearch}". Try another search term.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", maxHeight: "380px", overflowY: "auto", paddingRight: 4 }}>
                {filteredDocs.map((doc) => {
                  const isSelected = activeDocIds.includes(doc.id);
                  const isMerged = doc.source === "merged_upload";
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleToggleDoc(doc.id)}
                      className="conduit-cell"
                      style={{
                        padding: "13px 15px",
                        borderRadius: "var(--radius-sm)",
                        border: isSelected ? "2px solid var(--forest)" : "1px solid var(--border)",
                        background: isSelected ? "var(--forest-light)" : "var(--surface)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 8,
                        boxShadow: isSelected ? "0 4px 14px rgba(5, 150, 105, 0.12)" : "var(--shadow-sm)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: isSelected ? "1.5px solid var(--forest)" : "1.5px solid var(--border)",
                              background: isSelected ? "var(--forest)" : "var(--surface)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#FFF",
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <Check size={12} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "13.5px",
                                fontWeight: 700,
                                color: "var(--text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={doc.filename}
                            >
                              {doc.filename}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: 2 }}>
                              {doc.chunk_count} academic knowledge chunks
                            </div>
                          </div>
                        </div>
                        {isMerged && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 700,
                              color: "var(--accent)",
                              background: "rgba(217, 119, 6, 0.1)",
                              padding: "2px 6px",
                              borderRadius: 4,
                              border: "1px solid var(--accent-mid)",
                              flexShrink: 0,
                            }}
                          >
                            Merged
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            color: isSelected ? "var(--forest)" : "var(--text-2)",
                            background: isSelected ? "rgba(5, 150, 105, 0.12)" : "var(--surface-2)",
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {doc.subject || "General"}
                        </span>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            color: isSelected ? "var(--forest)" : "var(--text-2)",
                            background: isSelected ? "rgba(5, 150, 105, 0.12)" : "var(--surface-2)",
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {doc.grade || "All Grades"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 1 Bottom Action Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 22px",
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-2)" }}>
              {activeDocIds.length === 0 ? (
                <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                  ✨ Direct Curriculum Mode active (Standard Syllabus)
                </span>
              ) : (
                <span>
                  📚 <strong>{activeDocIds.length}</strong> Granth textbook document{activeDocIds.length > 1 ? "s" : ""} selected for question synthesis
                </span>
              )}
            </div>

            <button
              type="button"
              className="gk-btn gk-btn--primary"
              onClick={() => setCurrentStep(2)}
              style={{
                padding: "11px 24px",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: "0 4px 16px rgba(234, 88, 12, 0.3)",
              }}
            >
              <span>Continue to Blueprint Selection (विद्या प्रारूप)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Vidya / Blueprint Selection ── */}
      {currentStep === 2 && !result && (
        <div className="rachna-step-pane no-print">
          {/* Active Syllabus Context Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Library size={16} color="var(--forest)" />
              <span style={{ fontSize: "13px", color: "var(--text-2)" }}>
                Active Syllabus Source:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {selectedDocuments.length > 0
                    ? selectedDocuments.map((d) => d.filename).join(", ")
                    : "Direct Academic Curriculum (Standard Syllabus)"}
                </strong>
              </span>
            </div>
            <button
              type="button"
              className="gk-btn gk-btn--ghost gk-btn--sm"
              onClick={() => setCurrentStep(1)}
              style={{ fontSize: "12px", gap: 6, color: "var(--accent)" }}
            >
              <Edit3 size={13} /> Change Granth Source (Step 1)
            </button>
          </div>

          {/* 2-Column Blueprint Studio Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              alignItems: "start",
              marginBottom: "20px",
            }}
          >
            {/* Left Column: Blueprint Selector & Custom Directives */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="lens-card" style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      background: "var(--gold-light)",
                      color: "var(--gold-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--text)" }}>
                        Choose Exam Blueprint (विद्या प्रारूप)
                      </h3>
                      <span className="chip-badge chip-badge--gold" style={{ fontSize: "10px" }}>
                        STEP 2
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "2px 0 0" }}>
                      Select blueprint template governing question formats, marks, and duration
                    </p>
                  </div>
                </div>

                {/* Subject Filter Pills */}
                {uniqueSubjects.length > 1 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter("all")}
                      className="gk-btn gk-btn--sm"
                      style={{
                        fontSize: "11.5px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: selectedSubjectFilter === "all" ? "var(--accent)" : "var(--surface-2)",
                        color: selectedSubjectFilter === "all" ? "#FFF" : "var(--text-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      All Subjects ({templates.length})
                    </button>
                    {uniqueSubjects.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSelectedSubjectFilter(subj)}
                        className="gk-btn gk-btn--sm"
                        style={{
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: selectedSubjectFilter === subj ? "var(--accent)" : "var(--surface-2)",
                          color: selectedSubjectFilter === subj ? "#FFF" : "var(--text-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                )}

                {/* Blueprint Cards Grid */}
                {templates.length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      background: "var(--surface-sunken)",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border)",
                    }}
                  >
                    <ScrollText size={32} style={{ color: "var(--text-3)", margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "12px" }}>
                      No exam blueprints found. Create blueprints in Vidya to configure sections and marks.
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", maxHeight: "300px", overflowY: "auto", paddingRight: 4 }}>
                    {filteredTemplates.map((tpl) => {
                      const isSelected = tpl.id === selectedTemplateId;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className="conduit-cell"
                          style={{
                            padding: "14px 14px",
                            borderRadius: "var(--radius-sm)",
                            border: isSelected ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                            background: isSelected ? "var(--accent-light)" : "var(--surface)",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxShadow: isSelected ? "0 4px 16px rgba(234, 88, 12, 0.15)" : "var(--shadow-sm)",
                            minHeight: 90,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
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
                                padding: "2px 7px",
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
                                padding: "2px 7px",
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

              {/* Custom Directives Input */}
              <div className="lens-card" style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <Sliders size={16} color="var(--accent)" />
                  <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
                    Custom Focus & Pedagogical Directives (Optional)
                  </h4>
                </div>
                <input
                  type="text"
                  className="gk-input"
                  placeholder="e.g. Focus on Chapter 3 numericals, include conceptual reasoning questions, high Bloom's taxonomy..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            {/* Right Column: Blueprint Structure Live Inspector */}
            <div style={{ position: "sticky", top: "20px" }}>
              <div
                className="lens-card"
                style={{
                  padding: "24px",
                  border: "1.5px solid var(--border)",
                  background: "var(--surface)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span className="chip-badge chip-badge--accent">
                    <Sparkles size={11} /> LIVE BLUEPRINT INSPECTOR
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                    Structure Details
                  </span>
                </div>

                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "17px", fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>
                  {templates.find((t) => t.id === selectedTemplateId)?.name || "Exam Blueprint Overview"}
                </h3>

                {/* Specs Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: "11px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10.5px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                      Subject & Class
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
                      {selectedTemplateDetail?.subject || "Subject"} • {selectedTemplateDetail?.grade || "Grade"}
                    </div>
                  </div>

                  <div style={{ padding: "11px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10.5px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                      Total Marks & Time
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold-border)", marginTop: 4 }}>
                      {selectedTemplateDetail?.total_marks ? `${selectedTemplateDetail.total_marks} Marks` : "Marks"} • {selectedTemplateDetail?.duration_minutes ? `${selectedTemplateDetail.duration_minutes}m` : "Time"}
                    </div>
                  </div>
                </div>

                {/* Section Breakdown List */}
                {selectedTemplateDetail?.sections && selectedTemplateDetail.sections.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 8, letterSpacing: "0.04em" }}>
                      Sections Planned ({selectedTemplateDetail.sections.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "200px", overflowY: "auto" }}>
                      {selectedTemplateDetail.sections.map((sec, i) => {
                        const totalSecMarks = calculateSectionTotalMarks(sec);
                        return (
                          <div
                            key={sec.id || i}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              fontSize: "12px",
                              padding: "8px 10px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                                {sec.sub_sections && sec.sub_sections.length > 0
                                  ? `${sec.sub_sections.length} Parts • ${totalSecMarks}M`
                                  : `${sec.num_questions} Qs • ${totalSecMarks}M`}
                              </span>
                            </div>
                            {sec.sub_sections && sec.sub_sections.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4, paddingLeft: 8, borderLeft: "2px solid rgba(255,255,255,0.1)" }}>
                                {sec.sub_sections.map((sub, sIdx) => (
                                  <div key={sub.id || sIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--text-3)" }}>
                                    <span>{sub.title || `Part ${sIdx + 1}`}</span>
                                    <span>{sub.num_questions} Qs</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Notice */}
                <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: "11.5px", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={14} color="var(--accent)" />
                  <span>AI validates Bloom's taxonomy and marks balance automatically.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 Bottom Action Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 22px",
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <button
              type="button"
              className="gk-btn gk-btn--secondary"
              onClick={() => setCurrentStep(1)}
              style={{ padding: "10px 18px", fontSize: "13.5px" }}
            >
              <ArrowLeft size={16} />
              <span>Back to Granth Selection (चरण १)</span>
            </button>

            <button
              type="button"
              className="gk-btn gk-btn--primary"
              onClick={handleGenerate}
              disabled={!selectedTemplateId}
              style={{
                padding: "12px 26px",
                fontSize: "15px",
                fontWeight: 800,
                boxShadow: "0 4px 20px rgba(234, 88, 12, 0.35)",
              }}
            >
              <Sparkles size={17} />
              <span>Begin Sacred Synthesis (रचना आरम्भ)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Rachna Synthesis Chamber (While Generating or on Error) ── */}
      {(currentStep === 3 || generating) && !result && (
        <div className="rachna-step-pane no-print">
          {generating ? (
            <div className="synthesis-chamber">
              {/* Authentic Terracotta Diya with Living 3-tier Flame & Floating Canvas Embers */}
              <div style={{ width: "100%", maxWidth: 480, margin: "0 auto 10px" }}>
                <DiyaAnimation
                  title="रचना परीक्षा निर्माण"
                  subtitle="Synthesizing rigorous examination paper with verified model answer keys..."
                  shloka="विद्ययाऽमृतमश्नुते"
                  translation="Knowledge awakens the immortal intellect"
                />
              </div>

              {/* Live Progress Tracker */}
              <div style={{ width: "100%", maxWidth: 640, marginTop: "10px" }}>
                <ProgressTracker
                  title="Synthesizing Examination Paper"
                  subtitle="Architecting sections, passages, questions, and marking scheme..."
                  stages={EXAM_GEN_STAGES}
                  stageIndex={examSim.stageIndex}
                  progress={examSim.progress}
                  statusMessage={examSim.currentStatusMessage}
                  formattedTime={examSim.formattedTime}
                  tip={examSim.currentTip}
                  variant="card"
                />
              </div>
            </div>
          ) : error ? (
            <div
              className="lens-card"
              style={{
                padding: "36px 28px",
                textAlign: "center",
                maxWidth: 580,
                margin: "40px auto",
                border: "1.5px solid var(--terracotta)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--terracotta-light)",
                  color: "var(--terracotta)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <AlertTriangle size={26} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>
                Examination Synthesis Interrupted
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--terracotta)", marginBottom: "22px" }}>
                {error}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button
                  className="gk-btn gk-btn--secondary"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={15} /> Return to Blueprint (Step 2)
                </button>
                <button
                  className="gk-btn gk-btn--primary"
                  onClick={handleGenerate}
                >
                  <RefreshCw size={15} /> Retry Synthesis
                </button>
              </div>
            </div>
          ) : (
            <div
              className="lens-card"
              style={{
                padding: "36px 28px",
                textAlign: "center",
                maxWidth: 580,
                margin: "40px auto",
                background: "var(--surface)",
              }}
            >
              <Sparkles size={36} color="var(--accent)" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>
                Ready for Examination Synthesis
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "20px" }}>
                Click below to initiate AI question generation and marking scheme compilation.
              </p>
              <button
                className="gk-btn gk-btn--primary"
                onClick={handleGenerate}
                style={{ padding: "12px 26px", fontSize: "15px", fontWeight: 800 }}
              >
                <Sparkles size={16} /> Begin Sacred Synthesis
              </button>
            </div>
          )}
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
                onClick={handleResetToStep1}
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
