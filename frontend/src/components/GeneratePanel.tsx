"use client";

import { useCallback, useEffect, useState } from "react";
import { documentsApi, generationApi, templatesApi } from "@/lib/api";
import type { DocumentSummary } from "@/types/document";
import type { TemplateSummary, GeneratedExam } from "@/types/template";
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
} from "lucide-react";

interface GeneratePanelProps {
  selectedDoc: DocumentSummary | null;
}

export default function GeneratePanel({ selectedDoc }: GeneratePanelProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [printMode, setPrintMode] = useState<"exam" | "key" | null>(null);

  useEffect(() => {
    templatesApi.list().then(setTemplates).catch(() => {});
  }, []);

  async function handleGenerate() {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      setError("Please select a template first.");
      return;
    }
    if (!selectedDoc) {
      setError("Please select a document from the library.");
      return;
    }
    setError(null);
    setResult(null);
    setGenerating(true);
    try {
      // Fetch full template config
      const full = await templatesApi.get(tpl.id);
      const exam = await generationApi.generate({
        template: full.config,
        document_id: selectedDoc.id,
        source_type: "document",
        custom_topic: customTopic.trim() || null,
      });
      setResult(exam);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  const handlePrint = (mode: "exam" | "key") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
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
          <div className="page-header__ornament-line" />
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
          disabled={generating || !selectedDoc || !selectedTemplateId}
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
          <p className="lotus-loader__text">The Guru is composing your examination…</p>
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div
          className={`exam-result ${printMode === "exam" ? "print-exam-only" : "print-key-only"}`}
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
            <div className="exam-result__meta">
              Marks: {result.total_marks} | Duration: {result.duration_minutes} min |{" "}
              {result.questions.length} Questions
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

            {/* Questions */}
            {result.questions?.map((q) => (
              <div key={q.question_no} className="question-card">
                <div className="question-card__header">
                  <span className="question-card__num">Q{q.question_no}</span>
                  <p className="question-card__text">{q.text}</p>
                  <span className="question-card__marks">{q.marks}M</span>
                  <span className="question-card__type">{q.type.replace("_", " ")}</span>
                </div>

                {q.options && q.options.length > 0 && (
                  <div className="mcq-options">
                    {q.options.map((opt) => (
                      <div
                        key={opt.key}
                        className={`mcq-option ${
                          opt.key === q.answer ? "mcq-option--correct" : ""
                        }`}
                      >
                        <strong>{opt.key}.</strong> {opt.text}
                      </div>
                    ))}
                  </div>
                )}

                {q.answer && (
                  <div className="question-card__answer">Answer: {q.answer}</div>
                )}
              </div>
            ))}
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
      )}
    </div>
  );
}
