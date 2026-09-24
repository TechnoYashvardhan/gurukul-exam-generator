"use client";

import { useCallback, useRef, useState } from "react";
import type { DocumentSummary } from "@/types/document";
import { documentsApi } from "@/lib/api";
import {
  Upload,
  Globe,
  Book,
  GraduationCap,
  Search,
  ScrollText,
  FileCode,
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  HelpCircle,
  Tag,
  FileText,
  Check,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface LibraryUploadProps {
  onUploaded: (doc: DocumentSummary) => void;
}

export default function LibraryUpload({ onUploaded }: LibraryUploadProps) {
  const [tab, setTab] = useState<"upload" | "web" | "custom">("upload");
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Upload PDF (supports 1 or multiple PDFs merged into 1 card)
  const [dragging, setDragging] = useState(false);
  const [subject, setSubject] = useLocalStorage("lib-up-subject", "");
  const [grade, setGrade] = useLocalStorage("lib-up-grade", "");
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [mergedTitle, setMergedTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Tab 2: Web & Direct URL
  const [webSubject, setWebSubject] = useLocalStorage("lib-web-subject", "");
  const [webGrade, setWebGrade] = useLocalStorage("lib-web-grade", "");
  const [webContext, setWebContext] = useLocalStorage("lib-web-context", "");
  const [webUrl, setWebUrl] = useLocalStorage("lib-web-url", "");
  const [fetching, setFetching] = useState(false);
  const [webDragging, setWebDragging] = useState(false);
  const [extractingWeb, setExtractingWeb] = useState(false);
  const webPdfRef = useRef<HTMLInputElement>(null);

  // Tab 3: Custom Topics / Unit Test
  const [customTitle, setCustomTitle] = useLocalStorage("lib-custom-title", "");
  const [customSubject, setCustomSubject] = useLocalStorage("lib-custom-subject", "");
  const [customGrade, setCustomGrade] = useLocalStorage("lib-custom-grade", "");
  const [customTopics, setCustomTopics] = useLocalStorage("lib-custom-topics", "");
  const [savingCustom, setSavingCustom] = useState(false);
  const [customDragging, setCustomDragging] = useState(false);
  const [extractingCustom, setExtractingCustom] = useState(false);
  const customPdfRef = useRef<HTMLInputElement>(null);

  const [extractedInfo, setExtractedInfo] = useState<{
    source: "web" | "custom";
    filename: string;
    wordCount: number;
  } | null>(null);

  async function handleExtractTopicPdfs(incoming: FileList | File[], targetTab: "web" | "custom") {
    const list = Array.from(incoming).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (list.length === 0) {
      setError("Please drop or upload valid PDF file(s).");
      return;
    }
    setError(null);
    if (targetTab === "web") setExtractingWeb(true);
    else setExtractingCustom(true);

    try {
      const res =
        list.length === 1
          ? await documentsApi.extractTopicsPdf(list[0])
          : await documentsApi.extractTopicsMultiple(list);

      if (targetTab === "web") {
        setWebContext((prev) => (prev.trim() ? `${prev}\n\n${res.extracted_text}` : res.extracted_text));
        if (!webSubject.trim() && res.suggested_subject) {
          setWebSubject(res.suggested_subject);
        }
        setExtractedInfo({ source: "web", filename: res.filename, wordCount: res.word_count });
      } else {
        setCustomTopics((prev) => (prev.trim() ? `${prev}\n\n${res.extracted_text}` : res.extracted_text));
        if (!customTitle.trim() && res.suggested_title) {
          setCustomTitle(res.suggested_title);
        }
        if (!customSubject.trim() && res.suggested_subject) {
          setCustomSubject(res.suggested_subject);
        }
        setExtractedInfo({ source: "custom", filename: res.filename, wordCount: res.word_count });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to extract topics from PDF(s).");
    } finally {
      if (targetTab === "web") setExtractingWeb(false);
      else setExtractingCustom(false);
    }
  }

  // Handlers for Tab 1
  function handleAddFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const validPdfs = list.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (validPdfs.length === 0) {
      setError("Please select valid PDF file(s).");
      return;
    }
    setError(null);
    setQueuedFiles((prev) => {
      const existingKeys = new Set(prev.map((p) => `${p.name}_${p.size}`));
      const newItems = validPdfs.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...newItems];
    });
  }

  function handleRemoveQueuedFile(index: number) {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUploadQueued() {
    if (queuedFiles.length === 0) {
      setError("Please select at least one PDF file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      let doc: DocumentSummary;
      if (queuedFiles.length === 1 && !mergedTitle.trim()) {
        doc = await documentsApi.upload(queuedFiles[0], subject.trim(), grade.trim());
      } else {
        doc = await documentsApi.uploadMultiple(
          queuedFiles,
          mergedTitle.trim(),
          subject.trim(),
          grade.trim()
        );
      }
      onUploaded(doc);
      setQueuedFiles([]);
      setMergedTitle("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleAddFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function handleWebFetch() {
    if (!webSubject.trim()) {
      setError("Please specify the Subject.");
      return;
    }
    setError(null);
    setFetching(true);
    try {
      const doc = await documentsApi.webFetch({
        subject: webSubject.trim(),
        grade: webGrade.trim() || "All Grades",
        extra_keywords: webContext.trim(),
        url: webUrl.trim() || undefined,
      });
      onUploaded(doc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Web fetch failed.");
    } finally {
      setFetching(false);
    }
  }

  async function handleCustomTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customTitle.trim() || !customSubject.trim() || !customTopics.trim()) {
      setError("Please provide a Title, Subject, and specific topic contents.");
      return;
    }
    setError(null);
    setSavingCustom(true);
    try {
      const doc = await documentsApi.createCustomTopic({
        title: customTitle.trim(),
        subject: customSubject.trim(),
        grade: customGrade.trim() || "All Levels",
        topics_text: customTopics.trim(),
      });
      onUploaded(doc);
      setCustomTitle("");
      setCustomTopics("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to process custom topics.");
    } finally {
      setSavingCustom(false);
    }
  }

  const handlePresetClick = (presetTitle: string, presetSubject: string, presetGrade: string, presetText: string) => {
    setCustomTitle(presetTitle);
    setCustomSubject(presetSubject);
    setCustomGrade(presetGrade);
    setCustomTopics(presetText);
  };

  return (
    <div className="lens-card" style={{ padding: "24px", marginBottom: 16 }}>
      {/* Sub-tabs */}
      <div className="lib-tabs" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={`gk-btn ${tab === "upload" ? "gk-btn--primary" : "gk-btn--secondary"}`}
          onClick={() => { setTab("upload"); setError(null); }}
          style={{ justifyContent: "center", fontSize: "12.5px" }}
        >
          <Upload size={14} /> Upload PDF
        </button>
        <button
          type="button"
          className={`gk-btn ${tab === "web" ? "gk-btn--primary" : "gk-btn--secondary"}`}
          onClick={() => { setTab("web"); setError(null); }}
          style={{ justifyContent: "center", fontSize: "12.5px" }}
        >
          <Globe size={14} /> Web & Online URL
        </button>
        <button
          type="button"
          className={`gk-btn ${tab === "custom" ? "gk-btn--primary" : "gk-btn--secondary"}`}
          onClick={() => { setTab("custom"); setError(null); }}
          style={{ justifyContent: "center", fontSize: "12.5px" }}
        >
          <FileCode size={14} /> Custom Topics & Quiz
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--terracotta-light)",
            border: "1px solid var(--terracotta)",
            borderRadius: "var(--radius-sm)",
            color: "var(--terracotta)",
            fontSize: 13,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── TAB 1: Upload Local PDF ─────────────────────────────────────────── */}
      {tab === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tag fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="gk-field">
              <label className="gk-label" htmlFor="up-subject">
                <Book size={12} style={{ display: "inline", marginRight: 4 }} />
                Subject
              </label>
              <input
                id="up-subject"
                className="gk-input"
                placeholder="e.g. Biology"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="gk-field">
              <label className="gk-label" htmlFor="up-grade">
                <GraduationCap size={12} style={{ display: "inline", marginRight: 4 }} />
                Grade
              </label>
              <input
                id="up-grade"
                className="gk-input"
                placeholder="e.g. Grade 10"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAddFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />

          {/* Staged Queue or Dropzone */}
          {queuedFiles.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "16px",
                background: "var(--surface)",
                border: "1.5px solid var(--accent)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={18} color="var(--accent)" />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                    {queuedFiles.length} PDF{queuedFiles.length > 1 ? "s" : ""} Staged for Document Card
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="gk-btn gk-btn--secondary gk-btn--sm"
                    style={{ fontSize: 12 }}
                  >
                    <Plus size={13} /> Add More PDFs
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueuedFiles([])}
                    className="gk-btn gk-btn--ghost gk-btn--sm"
                    style={{ fontSize: 12, color: "var(--terracotta)" }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* List of staged files */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: "180px",
                  overflowY: "auto",
                  padding: "4px 0",
                }}
              >
                {queuedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}_${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--bg)",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, marginRight: 8 }}>
                      <FileText size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedFile(idx)}
                      className="gk-btn gk-btn--icon"
                      style={{ width: 24, height: 24, flexShrink: 0, color: "var(--text-3)" }}
                      title="Remove file"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Optional Unified Title for multi-PDF upload */}
              {queuedFiles.length > 1 && (
                <div className="gk-field" style={{ marginTop: 4 }}>
                  <label className="gk-label" htmlFor="merged-title">
                    Unified Document / Card Title (Optional)
                  </label>
                  <input
                    id="merged-title"
                    className="gk-input"
                    placeholder="e.g. Physics Class 10 — All Chapters (or leave blank to auto-name)"
                    value={mergedTitle}
                    onChange={(e) => setMergedTitle(e.target.value)}
                  />
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--accent)",
                      background: "rgba(217, 119, 6, 0.08)",
                      padding: "6px 10px",
                      borderRadius: 6,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Sparkles size={13} />
                    <span>
                      All <strong>{queuedFiles.length} files</strong> will be extracted and merged into <strong>1 unified Granth card</strong> with distinct semantic chapter sections.
                    </span>
                  </div>
                </div>
              )}

              {/* Action button */}
              <button
                type="button"
                className="gk-btn gk-btn--primary gk-btn--full"
                onClick={handleUploadQueued}
                disabled={uploading}
                style={{ height: 42, justifyContent: "center", marginTop: 4 }}
              >
                {uploading ? (
                  <>
                    <span
                      className="spin"
                      style={{ display: "inline-block", width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", marginRight: 8 }}
                    />
                    Extracting text & vector indexing {queuedFiles.length} file{queuedFiles.length > 1 ? "s" : ""}…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {queuedFiles.length > 1
                      ? `✨ Merge & Ingest ${queuedFiles.length} PDFs into Granth Library`
                      : "Upload & Ingest PDF into Granth Library"}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div
              className={`upload-zone ${dragging ? "upload-zone--dragover" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload PDF files"
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              {uploading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div className="lotus-loader__petals" style={{ width: 44, height: 44 }}>
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="lotus-loader__petal"
                        style={{ "--r": `${i * 45}deg` } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--text-2)", fontStyle: "italic", fontFamily: "var(--font-heading)" }}>
                    Extracting text & computing vector embeddings…
                  </p>
                </div>
              ) : (
                <>
                  <div className="upload-zone__icon">
                    <ScrollText size={44} />
                  </div>
                  <p className="upload-zone__title">
                    {dragging ? "Release to offer these scrolls" : "Offer PDF scrolls (Single or Multiple)"}
                  </p>
                  <p className="upload-zone__sub">
                    Drag & drop 1 or multiple PDF notes / chapters here, or click to browse
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        background: "var(--bg-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 100,
                        padding: "2px 12px",
                      }}
                    >
                      Max 50 MB each · PDF only
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--accent)",
                        background: "rgba(217, 119, 6, 0.08)",
                        border: "1px solid var(--accent-mid)",
                        borderRadius: 100,
                        padding: "2px 12px",
                        fontWeight: 600,
                      }}
                    >
                      ✨ Multi-PDF Merge Supported
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Fetch from Web & Online URLs ────────────────────────────── */}
      {tab === "web" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="gk-field">
              <label className="gk-label" htmlFor="web-subject">
                Subject <span>*</span>
              </label>
              <input
                id="web-subject"
                className="gk-input"
                placeholder="e.g. Physics / Mathematics"
                value={webSubject}
                onChange={(e) => setWebSubject(e.target.value)}
                required
              />
            </div>
            <div className="gk-field">
              <label className="gk-label" htmlFor="web-grade">
                Grade / Level
              </label>
              <input
                id="web-grade"
                className="gk-input"
                placeholder="e.g. Class 11 / B.Sc 1st Year"
                value={webGrade}
                onChange={(e) => setWebGrade(e.target.value)}
              />
            </div>
          </div>

          <div className="gk-field">
            <label className="gk-label" htmlFor="web-url">
              <LinkIcon size={12} style={{ display: "inline", marginRight: 4 }} />
              Direct Online Syllabus / PDF URL (Optional)
            </label>
            <input
              id="web-url"
              className="gk-input"
              placeholder="e.g. https://university.edu/curriculum/bca-physics.pdf"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
            />
            <span style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>
              Paste direct links to public PDF syllabus files or official web curriculum pages.
            </span>
          </div>

          <div className="gk-field">
            <label className="gk-label" htmlFor="web-context">
              <Search size={12} style={{ display: "inline", marginRight: 4 }} />
              Specific Chapter / Topic Focus (Optional)
            </label>
            <textarea
              id="web-context"
              className="gk-textarea"
              rows={3}
              placeholder="e.g. Ray Optics, Snell's Law, Total Internal Reflection, Optical Instruments (or drop syllabus PDF(s) below)"
              value={webContext}
              onChange={(e) => setWebContext(e.target.value)}
            />

            {/* Drag & Drop PDF topic inserter */}
            <div
              className={`upload-zone upload-zone--compact ${webDragging ? "upload-zone--dragover" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setWebDragging(true); }}
              onDragLeave={() => setWebDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setWebDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleExtractTopicPdfs(e.dataTransfer.files, "web");
                }
              }}
              onClick={() => !extractingWeb && webPdfRef.current?.click()}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px dashed var(--border)",
                background: webDragging ? "rgba(217, 119, 6, 0.08)" : "var(--bg-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 12.5,
                color: "var(--text-2)",
                marginTop: 6,
                transition: "all 0.15s ease",
              }}
            >
              <input
                ref={webPdfRef}
                type="file"
                accept=".pdf"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleExtractTopicPdfs(e.target.files, "web");
                  }
                  e.target.value = "";
                }}
              />
              {extractingWeb ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
                  <span className="spin" style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }} />
                  <span>Extracting topics & syllabus from PDF(s)...</span>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={16} style={{ color: "var(--accent)" }} />
                    <span><strong>Insert Topics from PDF(s):</strong> Drag & drop PDF file(s) here (or click to browse)</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--bg)", padding: "2px 8px", borderRadius: 4 }}>
                    Auto-fills text
                  </span>
                </>
              )}
            </div>

            {extractedInfo && extractedInfo.source === "web" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "#16a34a", background: "rgba(22, 163, 74, 0.08)", padding: "4px 10px", borderRadius: 6, marginTop: 4 }}>
                <span>✅ Inserted {extractedInfo.wordCount} words from <strong>{extractedInfo.filename}</strong></span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExtractedInfo(null); setWebContext(""); }}
                  style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 11 }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <button
            className="gk-btn gk-btn--gold gk-btn--full"
            onClick={handleWebFetch}
            disabled={fetching}
            style={{ height: 40, justifyContent: "center" }}
          >
            {fetching ? (
              <>
                <span
                  className="spin"
                  style={{ display: "inline-block", width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }}
                />
                Fetching & indexing syllabus…
              </>
            ) : (
              <>
                <Globe size={16} /> Fetch & Index from Web
              </>
            )}
          </button>
        </div>
      )}

      {/* ── TAB 3: Custom Topics & Class Test Syllabus ──────────────────────── */}
      {tab === "custom" && (
        <form onSubmit={handleCustomTopicSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Quick presets */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Quick Templates for Class Tests:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="type-pill"
                onClick={() => handlePresetClick(
                  "Physics - Newton's Laws & Mechanics",
                  "Physics",
                  "Class 11",
                  "1. First Law of Motion: Inertia, momentum, reference frames.\n2. Second Law: F = ma, impulse, conservation of momentum.\n3. Third Law: Action-reaction pairs, normal force, tension.\n4. Friction: Static, kinetic, coefficient of friction, banking of roads.\n5. Circular motion: Centripetal force, applications."
                )}
                style={{ fontSize: 11.5, padding: "4px 10px" }}
              >
                ⚛️ Physics Mechanics
              </button>
              <button
                type="button"
                className="type-pill"
                onClick={() => handlePresetClick(
                  "Computer Science - Data Structures Unit Test",
                  "Computer Science",
                  "BCA / B.Tech",
                  "1. Arrays & Multi-dimensional matrices.\n2. Singly and Doubly Linked Lists: Insertion, deletion, traversal.\n3. Stacks & Queues: LIFO/FIFO principles, infix to postfix conversion.\n4. Binary Trees: Preorder, Inorder, Postorder traversals, BST.\n5. Time and Space Complexity: Big-O notation."
                )}
                style={{ fontSize: 11.5, padding: "4px 10px" }}
              >
                💻 CS Data Structures
              </button>
              <button
                type="button"
                className="type-pill"
                onClick={() => handlePresetClick(
                  "Chemistry - Chemical Reactions & Equations",
                  "Chemistry",
                  "Class 10",
                  "1. Chemical equations: Writing and balancing chemical reactions.\n2. Types of reactions: Combination, Decomposition, Displacement, Double displacement.\n3. Oxidation and Reduction (Redox reactions).\n4. Corrosion and Rancidity: Prevention and mechanisms."
                )}
                style={{ fontSize: 11.5, padding: "4px 10px" }}
              >
                🧪 Chemistry Reactions
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div className="gk-field">
              <label className="gk-label" htmlFor="custom-title">
                Document / Test Title *
              </label>
              <input
                id="custom-title"
                className="gk-input"
                placeholder="e.g. Unit Test 2: Thermodynamics"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
              />
            </div>
            <div className="gk-field">
              <label className="gk-label" htmlFor="custom-subject">
                Subject *
              </label>
              <input
                id="custom-subject"
                className="gk-input"
                placeholder="e.g. Physics"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                required
              />
            </div>
            <div className="gk-field">
              <label className="gk-label" htmlFor="custom-grade">
                Grade / Level
              </label>
              <input
                id="custom-grade"
                className="gk-input"
                placeholder="e.g. BCA 1st Year"
                value={customGrade}
                onChange={(e) => setCustomGrade(e.target.value)}
              />
            </div>
          </div>

          <div className="gk-field">
            <label className="gk-label" htmlFor="custom-topics">
              Enter Topics, Chapters, or Syllabus Outlines *
            </label>
            <textarea
              id="custom-topics"
              className="gk-textarea"
              rows={5}
              placeholder="Paste or enter chapters, formulas, theorems, and key concepts (or drop syllabus PDF(s) below)..."
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              required
            />

            {/* Drag & Drop PDF topic inserter for Tab 3 */}
            <div
              className={`upload-zone upload-zone--compact ${customDragging ? "upload-zone--dragover" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setCustomDragging(true); }}
              onDragLeave={() => setCustomDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCustomDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleExtractTopicPdfs(e.dataTransfer.files, "custom");
                }
              }}
              onClick={() => !extractingCustom && customPdfRef.current?.click()}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px dashed var(--border)",
                background: customDragging ? "rgba(217, 119, 6, 0.08)" : "var(--bg-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 12.5,
                color: "var(--text-2)",
                marginTop: 6,
                transition: "all 0.15s ease",
              }}
            >
              <input
                ref={customPdfRef}
                type="file"
                accept=".pdf"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleExtractTopicPdfs(e.target.files, "custom");
                  }
                  e.target.value = "";
                }}
              />
              {extractingCustom ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
                  <span className="spin" style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }} />
                  <span>Extracting topics & title from PDF(s)...</span>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={16} style={{ color: "var(--accent)" }} />
                    <span><strong>Import Topics from PDF(s):</strong> Drag & drop PDF file(s) here (or click to browse)</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--bg)", padding: "2px 8px", borderRadius: 4 }}>
                    Auto-fills form
                  </span>
                </>
              )}
            </div>

            {extractedInfo && extractedInfo.source === "custom" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "#16a34a", background: "rgba(22, 163, 74, 0.08)", padding: "4px 10px", borderRadius: 6, marginTop: 4 }}>
                <span>✅ Populated {extractedInfo.wordCount} words from <strong>{extractedInfo.filename}</strong></span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExtractedInfo(null); setCustomTopics(""); }}
                  style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 11 }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="gk-btn gk-btn--primary gk-btn--full"
            disabled={savingCustom}
            style={{ height: 40, justifyContent: "center" }}
          >
            {savingCustom ? (
              "Ingesting & Indexing Topics..."
            ) : (
              <>
                <Sparkles size={16} /> Save & Index Topics to Library
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
