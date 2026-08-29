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
  Tag
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface LibraryUploadProps {
  onUploaded: (doc: DocumentSummary) => void;
}

export default function LibraryUpload({ onUploaded }: LibraryUploadProps) {
  const [tab, setTab] = useState<"upload" | "web" | "custom">("upload");
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Upload PDF
  const [dragging, setDragging] = useState(false);
  const [subject, setSubject] = useLocalStorage("lib-up-subject", "");
  const [grade, setGrade] = useLocalStorage("lib-up-grade", "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Tab 2: Web & Direct URL
  const [webSubject, setWebSubject] = useLocalStorage("lib-web-subject", "");
  const [webGrade, setWebGrade] = useLocalStorage("lib-web-grade", "");
  const [webContext, setWebContext] = useLocalStorage("lib-web-context", "");
  const [webUrl, setWebUrl] = useLocalStorage("lib-web-url", "");
  const [fetching, setFetching] = useState(false);

  // Tab 3: Custom Topics / Unit Test
  const [customTitle, setCustomTitle] = useLocalStorage("lib-custom-title", "");
  const [customSubject, setCustomSubject] = useLocalStorage("lib-custom-subject", "");
  const [customGrade, setCustomGrade] = useLocalStorage("lib-custom-grade", "");
  const [customTopics, setCustomTopics] = useLocalStorage("lib-custom-topics", "");
  const [savingCustom, setSavingCustom] = useState(false);

  // Handlers
  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const doc = await documentsApi.upload(file, subject, grade);
      onUploaded(doc);
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
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subject, grade]
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
    <div className="vidya-card" style={{ marginBottom: 8 }}>
      {/* Sub-tabs */}
      <div className="lib-tabs" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <button
          type="button"
          className={`lib-tab ${tab === "upload" ? "lib-tab--active" : ""}`}
          onClick={() => { setTab("upload"); setError(null); }}
          style={{ justifyContent: "center" }}
        >
          <Upload size={14} /> Upload PDF
        </button>
        <button
          type="button"
          className={`lib-tab ${tab === "web" ? "lib-tab--active" : ""}`}
          onClick={() => { setTab("web"); setError(null); }}
          style={{ justifyContent: "center" }}
        >
          <Globe size={14} /> Web & Online URL
        </button>
        <button
          type="button"
          className={`lib-tab ${tab === "custom" ? "lib-tab--active" : ""}`}
          onClick={() => { setTab("custom"); setError(null); }}
          style={{ justifyContent: "center" }}
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

          {/* Drop zone */}
          <div
            className={`upload-zone ${dragging ? "upload-zone--dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload PDF file"
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
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
                  {dragging ? "Release to offer this scroll" : "Offer a PDF scroll"}
                </p>
                <p className="upload-zone__sub">
                  Drag & drop your PDF here, or click to browse
                </p>
                <span
                  style={{
                    marginTop: 12,
                    display: "inline-block",
                    fontSize: 11,
                    color: "var(--text-3)",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 100,
                    padding: "2px 12px",
                  }}
                >
                  Max 50 MB · PDF only
                </span>
              </>
            )}
          </div>
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
              rows={2}
              placeholder="e.g. Ray Optics, Snell's Law, Total Internal Reflection, Optical Instruments"
              value={webContext}
              onChange={(e) => setWebContext(e.target.value)}
            />
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
              placeholder="Paste or enter chapters, formulas, theorems, and key concepts..."
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              required
            />
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
