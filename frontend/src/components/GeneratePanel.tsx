import { useCallback, useEffect, useState } from "react";
import { documentsApi, generationApi, templatesApi, adminApi } from "@/lib/api";
import type { DocumentSummary } from "@/types/document";
import type { TemplateSummary, GeneratedExam } from "@/types/template";
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
  Share2,
  School,
} from "lucide-react";
import { LoadingMessages } from "./LoadingMessages";
import MathText from "./MathText";
import { useAuth } from "./AuthProvider";
import Toast, { ToastVariant } from "./Toast";

interface GeneratePanelProps {
  selectedDoc: DocumentSummary | null;
  onExamSaved: (exam: GeneratedExam) => void;
  role?: "admin" | "teacher";
}

export default function GeneratePanel({ selectedDoc, onExamSaved, role: propRole }: GeneratePanelProps) {
  const { user } = useAuth();
  const activeRole = propRole || user?.role || "teacher";
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("Initializing...");
  const [result, setResult] = useState<GeneratedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [activeViewMode, setActiveViewMode] = useState<"exam" | "key">("exam");
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  useEffect(() => {
    templatesApi.list(activeRole).then(setTemplates).catch(() => { });
    if (activeRole === "admin") {
      adminApi.listClasses().then(setClasses).catch(() => { });
    }
  }, [activeRole]);

  async function handleGenerate() {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      setError("Please select a template first.");
      return;
    }
    setError(null);
    setResult(null);
    setProgressMsg("Connecting to AI models...");
    setGenerating(true);
    try {
      // Fetch full template config
      const full = await templatesApi.get(tpl.id);
      const exam = await generationApi.generate({
        template: full.config,
        document_id: selectedDoc ? selectedDoc.id : undefined,
        source_type: selectedDoc ? "document" : "hardcoded",
        custom_topic: customTopic.trim() || null,
      }, (msg) => setProgressMsg(msg));
      setResult(exam);
      setPublished(false);
      onExamSaved(exam);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (!result) return;
    const examId = result.exam_id;
    if (!examId) {
      setToast({ message: "Exam ID missing. Please regenerate or save.", variant: "error" });
      return;
    }
    setPublishing(true);
    try {
      await generationApi.publish(examId, true, targetClassId === "all" ? undefined : targetClassId);
      setPublished(true);
      const targetName = targetClassId === "all" ? "All Students" : classes.find(c => c.id === targetClassId)?.name || "Target Class";
      setToast({
        message: `🎉 Quiz published to ${targetName}! Students can now practice it online.`,
        variant: "success",
      });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to publish quiz.", variant: "error" });
    } finally {
      setPublishing(false);
    }
  }

  const handlePrint = (mode: "exam" | "key") => {
    setActiveViewMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
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
      {/* ── Page Header ── */}
      <div className="page-header no-print">
        <div className="page-header__breadcrumb">Rachna / Generate</div>
        <h1 className="page-header__title">Generate Exam</h1>
        <div className="page-header__ornament">
          <div className="page-header__ornament-line" />
          <div className="page-header__ornament-diamond" />
          <div className="page-header__ornament-line--right" />
        </div>
        <p className="page-header__subtitle">
          Select a document and template — the Guru will write the exam
        </p>
      </div>

      {/* ── Control card ── */}
      <div className="vidya-card no-print" style={{ maxWidth: "640px", margin: "0 auto 2rem" }}>
        <div className="vidya-card__header">
          <Bot size={20} className="text-amber-600" />
          <h2 className="vidya-card__title">Exam Configuration</h2>
        </div>

        {/* ── Source info ── */}
        <div className="vidya-card" style={{ marginBottom: "1.25rem", padding: "0.875rem 1rem" }}>
          {selectedDoc ? (
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--color-accent)" }}>
                {selectedDoc.source === "upload" ? (
                  <FileText size={18} />
                ) : (
                  <Globe size={18} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: "var(--color-ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedDoc.filename}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    color: "var(--color-ink-muted)",
                    marginTop: "2px",
                  }}
                >
                  {selectedDoc.chunk_count} chunks indexed · RAG ready
                </p>
              </div>
              <span style={{ color: "var(--color-success, #22c55e)" }}>
                <CheckCircle size={16} />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--color-ink-muted)" }}>
                <FolderOpen size={18} />
              </span>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  margin: 0,
                }}
              >
                Select a <strong>Ready</strong> document from the library above
              </p>
            </div>
          )}
        </div>

        {/* ── Template selector ── */}
        <div className="gk-field">
          <label className="gk-label flex items-center gap-2" htmlFor="gen-template">
            <ClipboardList size={15} />
            Exam Template <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
          </label>
          <select
            id="gen-template"
            className="gk-select"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            <option value="">— Choose a template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.subject} · {t.grade}
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.78rem",
                color: "var(--color-ink-muted)",
                marginTop: "0.4rem",
              }}
            >
              No templates yet. Go to the <strong>Builder</strong> tab to create one first.
            </p>
          )}
        </div>

        {/* ── Error message ── */}
        {error && (
          <div
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.85rem",
              color: "var(--color-danger, #ef4444)",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "var(--radius-md, 8px)",
              padding: "0.6rem 0.9rem",
              marginTop: "0.75rem",
            }}
          >
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {/* ── Generate button ── */}
        <button
          className="generate-cta"
          onClick={handleGenerate}
          disabled={generating || !selectedTemplateId}
          style={{ marginTop: "1.25rem" }}
        >
          <Sparkles size={18} />
          {generating ? "Generating…" : "Generate Exam Paper"}
        </button>
      </div>

      {/* ── Lotus loader ── */}
      {generating && (
        <div className="lotus-loader no-print">
          <div className="lotus-loader__petals">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="lotus-loader__petal"
                style={{ "--r": `${i * 45}deg` } as React.CSSProperties}
              />
            ))}
          </div>
          <LoadingMessages message={progressMsg} />
        </div>
      )}

      {/* ✨ Result ✨ */}
      {result && (
        <>
          <div className="no-print" style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "12px 16px", background: "var(--success-light, #dcfce7)",
            color: "var(--success-dark, #166534)", borderRadius: "8px",
            marginBottom: "16px", border: "1px solid var(--success-mid, #bbf7d0)"
          }}>
            <CheckCircle size={18} />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Successfully generated and saved to your Itihas (History).</span>
          </div>
          
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
            
            <div className="exam-toolbar__actions" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {activeRole === "admin" && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {classes.length > 0 && (
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      disabled={publishing || published}
                      className="gk-input"
                      style={{ fontSize: 12, height: 32, padding: "0 8px", width: "auto" }}
                      title="Select Cohort / Class for this test"
                    >
                      <option value="all">🌍 All Classes (Global)</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          👥 {cls.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className="gk-btn"
                    onClick={handlePublish}
                    disabled={publishing || published}
                    style={{
                      background: published ? "#15803d" : "#ea580c",
                      color: "#ffffff",
                      borderColor: published ? "#166534" : "#c2410c",
                      boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                      fontWeight: 600,
                      height: 32,
                      fontSize: 12.5,
                    }}
                  >
                    {published ? (
                      <>
                        <CheckCircle size={14} />
                        Published
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        {publishing ? "Publishing..." : "Publish Quiz"}
                      </>
                    )}
                  </button>
                </div>
              )}
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

          {toast && (
            <div className="no-print" style={{ maxWidth: "800px", margin: "0 auto 1rem" }}>
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
          >
            {/* Header */}
            <div className="exam-result__header">
              {result.heading_details && (
                <div
                  className="exam-result__institution"
                  dangerouslySetInnerHTML={{ __html: result.heading_details }}
                />
              )}
              {activeViewMode === "key" && (
                <div style={{ textAlign: "center", fontWeight: 700, fontSize: "13pt", margin: "4px 0", color: "var(--accent, #b45309)" }}>
                  ANSWER KEY & MARKING SCHEME
                </div>
              )}
              <div className="exam-result__meta">
                <span>Total Time: {result.duration_minutes} Minutes</span>
                <span>Maximum Marks: {result.total_marks}</span>
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
                    dangerouslySetInnerHTML={{ __html: result.instructions }}
                  />
                </div>
              )}

              {/* Questions with Section Headings */}
              {renderQuestions(result.questions || [], result.sections)}
            </div>

            {/* Print actions */}
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
