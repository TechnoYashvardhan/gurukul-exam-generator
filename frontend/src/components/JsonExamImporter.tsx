"use client";

import React, { useState, useRef, useEffect } from "react";
import type { GeneratedExam, Question, Section } from "@/types/template";
import type { ClassSummary } from "@/types/auth";
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Printer,
  Send,
  Copy,
  Check,
  FileCode2,
  RefreshCw,
  FileText,
} from "lucide-react";
import MathText from "./MathText";
import Toast, { ToastVariant } from "./Toast";
import PublishQuizModal from "./PublishQuizModal";
import { generationApi, adminApi } from "@/lib/api";
import { SAMPLE_EXAM_JSON, downloadExamAsJson, downloadSampleTemplateJson, getCleanExamTitle } from "@/lib/exportUtils";

interface JsonExamImporterProps {
  onExamSaved: (exam: GeneratedExam) => void;
  role?: "admin" | "teacher";
}

export default function JsonExamImporter({ onExamSaved, role = "teacher" }: JsonExamImporterProps) {
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(SAMPLE_EXAM_JSON, null, 2));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedExam, setParsedExam] = useState<GeneratedExam | null>(SAMPLE_EXAM_JSON);
  const [renderedExam, setRenderedExam] = useState<GeneratedExam | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<"exam" | "key">("exam");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedInfo, setPublishedInfo] = useState<string>("");
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (role === "admin") {
      adminApi.listClasses().then(setClasses).catch(() => {});
    }
  }, [role]);

  // Live validator & normalizer
  const validateAndNormalizeJson = (text: string) => {
    if (!text.trim()) {
      setValidationError("JSON content cannot be empty.");
      setParsedExam(null);
      return;
    }

    try {
      const raw = JSON.parse(text);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        setValidationError("JSON root must be an object representing the Question Paper.");
        setParsedExam(null);
        return;
      }

      if (!raw.subject) {
        setValidationError("Missing required field: 'subject'.");
        setParsedExam(null);
        return;
      }

      const questionsList = raw.questions;
      if (!Array.isArray(questionsList) || questionsList.length === 0) {
        setValidationError("Exam must contain a non-empty 'questions' array.");
        setParsedExam(null);
        return;
      }

      // Normalize questions to match GeneratedExam schema
      const normalizedQuestions: Question[] = [];
      for (let i = 0; i < questionsList.length; i++) {
        const q = questionsList[i];
        const qText = q.text || q.question_text || q.prompt || "";
        if (!qText) {
          setValidationError(`Question #${i + 1} is missing text ('text' or 'question_text').`);
          setParsedExam(null);
          return;
        }

        const qType = q.type || "short_answer";
        if (qType === "mcq" && (!Array.isArray(q.options) || q.options.length < 2)) {
          setValidationError(`MCQ Question #${i + 1} must include at least 2 options in 'options' array.`);
          setParsedExam(null);
          return;
        }

        normalizedQuestions.push({
          section_id: q.section_id || q.section || "General",
          question_no: Number(q.question_no || q.question_number || i + 1),
          type: qType,
          text: qText,
          options: q.options || null,
          answer: String(q.answer || q.correct_answer || q.solution || ""),
          marks: Number(q.marks || 1),
          bloom_level: q.bloom_level || "understand",
          difficulty: q.difficulty || "medium",
        });
      }

      // Normalize sections if present
      const normalizedSections: Section[] = Array.isArray(raw.sections)
        ? raw.sections.map((s: any, idx: number) => ({
            id: s.id || `sec_${idx + 1}`,
            title: s.title || s.name || `Section ${String.fromCharCode(65 + idx)}`,
            type: s.type || "short_answer",
            num_questions: Number(s.num_questions || normalizedQuestions.filter((q) => q.section_id === (s.id || s.title || s.name)).length || 1),
            marks_per_question: Number(s.marks_per_question || 1),
            instructions: s.instructions || s.description || null,
            bloom_level: s.bloom_level || null,
          }))
        : [];

      const normalizedExam: GeneratedExam = {
        exam_id: raw.exam_id || crypto.randomUUID(),
        subject: raw.subject,
        grade: raw.grade || "Academic",
        total_marks: Number(raw.total_marks || normalizedQuestions.reduce((acc, q) => acc + q.marks, 0)),
        duration_minutes: Number(raw.duration_minutes || 60),
        heading_details: raw.heading_details || null,
        instructions: raw.instructions || null,
        sections: normalizedSections.length > 0 ? normalizedSections : null,
        questions: normalizedQuestions,
        retries_used: 0,
        llm_provider: raw.llm_provider || "imported_json",
        llm_model: raw.llm_model || "custom",
      };

      setValidationError(null);
      setParsedExam(normalizedExam);
    } catch (e: any) {
      setValidationError(`Syntax Error: ${e.message}`);
      setParsedExam(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    validateAndNormalizeJson(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setToast({ message: "Please upload a valid .json file.", variant: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      validateAndNormalizeJson(content);
      setToast({ message: `Successfully loaded '${file.name}'`, variant: "success" });
    };
    reader.onerror = () => {
      setToast({ message: "Failed to read file content.", variant: "error" });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_EXAM_JSON, null, 2));
    setCopied(true);
    setToast({ message: "Sample JSON template copied to clipboard!", variant: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToSample = () => {
    const sampleStr = JSON.stringify(SAMPLE_EXAM_JSON, null, 2);
    setJsonText(sampleStr);
    validateAndNormalizeJson(sampleStr);
    setToast({ message: "Reset to default sample JSON template.", variant: "info" });
  };

  const handleGenerateFromImport = async () => {
    if (!parsedExam || validationError) {
      setToast({ message: "Please fix JSON validation errors before generating.", variant: "error" });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await generationApi.importJson(parsedExam);
      const readyExam = res.exam || parsedExam;
      readyExam.exam_id = res.exam_id || readyExam.exam_id;
      setRenderedExam(readyExam);
      setPublished(false);
      onExamSaved(readyExam);
      setToast({ message: "🎉 Question paper imported and rendered successfully!", variant: "success" });
    } catch (e: any) {
      // Fallback: render locally and save to history
      const localExam = { ...parsedExam, exam_id: parsedExam.exam_id || crypto.randomUUID() };
      setRenderedExam(localExam);
      onExamSaved(localExam);
      setToast({ message: "Question paper rendered from JSON.", variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = (mode: "exam" | "key") => {
    setActiveViewMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleConfirmPublish = async (options: {
    targetClassId?: string;
    scheduleStartAt?: string;
    scheduleEndAt?: string;
  }) => {
    if (!renderedExam) return;
    const examId = renderedExam.exam_id;
    if (!examId) {
      setToast({ message: "Exam ID missing. Please re-import.", variant: "error" });
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
  };

  // Helper to render question list with section headings
  const renderQuestions = (questions: Question[], sections?: Section[] | null) => {
    const sectionNames = sections && sections.length > 0
      ? sections.map((s) => s.title || s.id)
      : Array.from(new Set(questions.map((q) => q.section_id || "General")));

    return (
      <div className="exam-questions">
        {sectionNames.map((secName, secIdx) => {
          const secQuestions = questions.filter((q) => (q.section_id || "General") === secName);
          if (secQuestions.length === 0) return null;
          const secMeta = sections?.find((s) => (s.title || s.id) === secName);

          return (
            <div key={secIdx} className="exam-section-block" style={{ marginBottom: "1.8rem" }}>
              <div className="exam-section-header">
                <div className="exam-section-title">{secName}</div>
                {secMeta?.instructions && (
                  <div className="exam-section-desc">{secMeta.instructions}</div>
                )}
              </div>

              {secQuestions.map((q, qIdx) => (
                <div key={qIdx} className="exam-question-item" id={`q-${q.question_no || qIdx + 1}`}>
                  <div className="exam-question-top">
                    <div className="exam-question-meta">
                      <span className="exam-q-num">Q{q.question_no || qIdx + 1}.</span>
                      <span className="exam-q-marks">[{q.marks} {q.marks === 1 ? "Mark" : "Marks"}]</span>
                    </div>
                  </div>

                  <div className="exam-question-text">
                    <MathText content={q.text} />
                  </div>

                  {/* MCQ Options */}
                  {q.type === "mcq" && q.options && (
                    <div className="exam-options-grid">
                      {q.options.map((opt) => (
                        <div key={opt.key} className="exam-option-card">
                          <span className="exam-option-key">{opt.key}</span>
                          <span className="exam-option-val">
                            <MathText content={opt.text} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer Key Details */}
                  {activeViewMode === "key" && (
                    <div className="exam-solution-box">
                      <div className="exam-solution-row">
                        <strong className="exam-sol-label">Correct Answer:</strong>
                        <span className="exam-sol-val">
                          <MathText content={String(q.answer)} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="json-importer-container" style={{ padding: "1.5rem 0", maxWidth: 1100, margin: "0 auto" }}>
      {toast && (
        <div className="no-print" style={{ marginBottom: "1.2rem" }}>
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Mode 1: JSON Editor & Import Controls */}
      {!renderedExam ? (
        <div className="gurukul-card" style={{ padding: "1.8rem", borderRadius: 14 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div
                  style={{
                    background: "rgba(217, 119, 6, 0.12)",
                    color: "var(--accent)",
                    padding: "6px 10px",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <FileCode2 size={16} />
                  <span>AAYAT (JSON IMPORT)</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Import Question Paper from JSON</h2>
              </div>
              <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
                Directly author or paste raw JSON question sets, import pre-built test files, or download standard question paper templates.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={downloadSampleTemplateJson}
                style={{ fontSize: 12.5, height: 34, gap: 6 }}
                title="Download standard JSON template (.json)"
              >
                <Download size={14} />
                Download JSON Template (.json)
              </button>

              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={handleCopyTemplate}
                style={{ fontSize: 12.5, height: 34, gap: 6 }}
                title="Copy template structure to clipboard"
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Template"}
              </button>

              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={handleResetToSample}
                style={{ fontSize: 12.5, height: 34, gap: 6 }}
                title="Reload default sample structure"
              >
                <RefreshCw size={14} />
                Load Sample
              </button>

              <label
                className="gk-btn gk-btn--primary"
                style={{ fontSize: 12.5, height: 34, gap: 6, cursor: "pointer", display: "inline-flex", alignItems: "center" }}
              >
                <Upload size={14} />
                Upload .json File
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Validation Status Pill */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              background: validationError ? "rgba(220, 38, 38, 0.08)" : "rgba(22, 163, 74, 0.08)",
              border: `1px solid ${validationError ? "rgba(220, 38, 38, 0.25)" : "rgba(22, 163, 74, 0.25)"}`,
              color: validationError ? "#dc2626" : "#16a34a",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {validationError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              <span style={{ fontWeight: 600 }}>
                {validationError || "Valid Gurukul Exam JSON Format"}
              </span>
            </div>

            {parsedExam && !validationError && (
              <div style={{ display: "flex", gap: 12, fontSize: 12.5, color: "var(--text-2)" }}>
                <span><strong>Subject:</strong> {parsedExam.subject}</span>
                <span><strong>Questions:</strong> {parsedExam.questions?.length || 0}</span>
                <span><strong>Marks:</strong> {parsedExam.total_marks || parsedExam.questions?.reduce((acc, q) => acc + (q.marks || 0), 0) || 0}</span>
                <span><strong>Time:</strong> {parsedExam.duration_minutes || 60}m</span>
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div style={{ position: "relative", marginBottom: "1.4rem" }}>
            <textarea
              value={jsonText}
              onChange={handleTextChange}
              placeholder="Paste your JSON question paper payload here..."
              spellCheck={false}
              style={{
                width: "100%",
                height: "440px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.55,
                padding: "1rem",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-1)",
                resize: "vertical",
                outline: "none",
                tabSize: 2,
              }}
            />
          </div>

          {/* Generate Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="gk-btn gk-btn--primary"
              disabled={isProcessing || !parsedExam || !!validationError}
              onClick={handleGenerateFromImport}
              style={{
                height: 42,
                padding: "0 22px",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(217, 119, 6, 0.25)",
              }}
            >
              {isProcessing ? (
                <>
                  <span className="spin" style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", marginRight: 8 }} />
                  Rendering Exam Paper...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate & Render Question Paper
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Mode 2: Full Rendered Question Paper & Action Toolbar */
        <>
          {/* Action Toolbar */}
          <div
            className="exam-toolbar no-print"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.85rem 1.2rem",
              background: "var(--card-bg, #fff)",
              borderRadius: 12,
              marginBottom: "1.2rem",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* View Mode Buttons */}
            <div className="exam-toolbar__modes" style={{ display: "flex", gap: 6 }}>
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

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={() => setRenderedExam(null)}
                style={{ fontSize: 12.5, height: 32, gap: 5 }}
              >
                <FileCode2 size={14} />
                Edit JSON
              </button>

              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={() => downloadExamAsJson(renderedExam)}
                style={{ fontSize: 12.5, height: 32, gap: 5, color: "var(--accent)" }}
                title="Export complete exam in a .json file"
              >
                <Download size={14} />
                Export JSON (.json)
              </button>

              {role === "admin" && (
                <button
                  type="button"
                  className="gk-btn"
                  onClick={() => setShowPublishModal(true)}
                  style={{
                    background: published ? "#15803d" : "#ea580c",
                    color: "#ffffff",
                    borderColor: published ? "#166534" : "#c2410c",
                    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                    fontWeight: 600,
                    height: 32,
                    fontSize: 12.5,
                    gap: 6,
                  }}
                >
                  {published ? (
                    <>
                      <CheckCircle size={14} />
                      Published {publishedInfo ? `(${publishedInfo})` : ""}
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Publish to Students...
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                className="gk-btn gk-btn--primary"
                onClick={() => handlePrint("exam")}
                style={{ fontSize: 12.5, height: 32, gap: 5 }}
              >
                <Printer size={14} />
                Print Paper
              </button>

              <button
                type="button"
                className="gk-btn gk-btn--secondary"
                onClick={() => handlePrint("key")}
                style={{ fontSize: 12.5, height: 32, gap: 5 }}
              >
                <Printer size={14} />
                Print Key
              </button>
            </div>
          </div>

          <PublishQuizModal
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            onConfirm={handleConfirmPublish}
            classes={classes}
            examTitle={getCleanExamTitle(renderedExam.heading_details, renderedExam.subject, renderedExam.grade)}
            subject={renderedExam.subject}
          />

          {/* Rendered Exam Document */}
          <div
            className={`exam-result ${activeViewMode === "key" ? "print-key-only exam-result--key" : "print-exam-only exam-result--exam"}`}
            id="exam-result"
          >
            {/* Header */}
            <div className="exam-result__header">
              {renderedExam.heading_details && (
                <div
                  className="exam-result__institution"
                  dangerouslySetInnerHTML={{ __html: renderedExam.heading_details }}
                />
              )}
              {activeViewMode === "key" && (
                <div style={{ textAlign: "center", fontWeight: 700, fontSize: "13pt", margin: "4px 0", color: "var(--accent, #b45309)" }}>
                  ANSWER KEY & MARKING SCHEME
                </div>
              )}
              <div className="exam-result__meta">
                <span>Total Time: {renderedExam.duration_minutes || 60} Minutes</span>
                <span>Maximum Marks: {renderedExam.total_marks || renderedExam.questions?.reduce((a, b) => a + (b.marks || 0), 0) || 50}</span>
              </div>
            </div>

            <hr className="exam-result__divider" />

            <div className="exam-result__body">
              {/* Instructions */}
              {renderedExam.instructions && (
                <div className="exam-result__instructions-box">
                  <div className="exam-result__instructions-title">General Instructions</div>
                  <div
                    className="exam-result__instructions-content"
                    style={{ fontFamily: "inherit", margin: 0 }}
                    dangerouslySetInnerHTML={{ __html: renderedExam.instructions }}
                  />
                </div>
              )}

              {/* Questions */}
              {renderQuestions(renderedExam.questions || [], renderedExam.sections)}
            </div>

            {/* Bottom print actions */}
            <div className="exam-print-actions no-print">
              <button
                className="gk-btn gk-btn--secondary"
                onClick={() => downloadExamAsJson(renderedExam)}
                style={{ marginRight: 10 }}
              >
                <Download size={15} style={{ marginRight: 6 }} />
                Export JSON File (.json)
              </button>
              <button
                className="gk-btn gk-btn--primary"
                onClick={() => handlePrint("exam")}
                style={{ marginRight: 10 }}
              >
                <Printer size={15} style={{ marginRight: 6 }} />
                Print Exam Paper
              </button>
              <button
                className="gk-btn gk-btn--secondary"
                onClick={() => handlePrint("key")}
              >
                <Printer size={15} style={{ marginRight: 6 }} />
                Print Answer Key
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
