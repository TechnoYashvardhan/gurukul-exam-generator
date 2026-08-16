"use client";

import { useCallback, useRef, useState } from "react";
import type { DocumentSummary } from "@/types/document";
import { documentsApi } from "@/lib/api";
import { Upload, Globe, Book, GraduationCap, Search, ScrollText } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface LibraryUploadProps {
  onUploaded: (doc: DocumentSummary) => void;
}

export default function LibraryUpload({ onUploaded }: LibraryUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [subject, setSubject] = useLocalStorage("lib-up-subject", "");
  const [grade, setGrade] = useLocalStorage("lib-up-grade", "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [webSubject, setWebSubject] = useLocalStorage("lib-web-subject", "");
  const [webGrade, setWebGrade] = useLocalStorage("lib-web-grade", "");
  const [webContext, setWebContext] = useLocalStorage("lib-web-context", "");
  const [fetching, setFetching] = useState(false);
  const [tab, setTab] = useState<"upload" | "web">("upload");

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
    if (!webSubject.trim() || !webGrade.trim()) {
      setError("Please enter both subject and grade for web fetch.");
      return;
    }
    setError(null);
    setFetching(true);
    try {
      const doc = await documentsApi.webFetch({
        subject: webSubject,
        grade: webGrade,
        extra_keywords: webContext.trim(),
      });
      onUploaded(doc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Web fetch failed.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="vidya-card" style={{ marginBottom: 8 }}>
      {/* Sub-tabs */}
      <div className="lib-tabs">
        <button
          className={`lib-tab ${tab === "upload" ? "lib-tab--active" : ""}`}
          onClick={() => { setTab("upload"); setError(null); }}
        >
          <Upload size={15} /> Upload PDF
        </button>
        <button
          className={`lib-tab ${tab === "web" ? "lib-tab--active" : ""}`}
          onClick={() => { setTab("web"); setError(null); }}
        >
          <Globe size={15} /> Fetch from Web
        </button>
      </div>

      {/* Error */}
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

      {tab === "upload" ? (
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
                  Uploading & processing…
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="gk-field">
              <label className="gk-label" htmlFor="web-subject">
                Subject <span>*</span>
              </label>
              <input
                id="web-subject"
                className="gk-input"
                placeholder="e.g. Physics"
                value={webSubject}
                onChange={(e) => setWebSubject(e.target.value)}
              />
            </div>
            <div className="gk-field">
              <label className="gk-label" htmlFor="web-grade">
                Grade / Level <span>*</span>
              </label>
              <input
                id="web-grade"
                className="gk-input"
                placeholder="e.g. Class 10"
                value={webGrade}
                onChange={(e) => setWebGrade(e.target.value)}
              />
            </div>
          </div>

          <div className="gk-field">
            <label className="gk-label" htmlFor="web-context">
              <Search size={12} style={{ display: "inline", marginRight: 4 }} />
              Topic / Board / Country
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>
                — Guide the search
              </span>
            </label>
            <textarea
              id="web-context"
              className="gk-textarea"
              rows={2}
              placeholder="e.g. CBSE Board, India, Gravitation topic"
              value={webContext}
              onChange={(e) => setWebContext(e.target.value)}
            />
          </div>

          <p style={{ fontSize: 12.5, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.6 }}>
            <Globe size={13} style={{ display: "inline", marginRight: 4 }} />
            Gurukul will search the web and extract syllabus content automatically using DuckDuckGo.
          </p>

          <button
            className="gk-btn gk-btn--gold gk-btn--full"
            onClick={handleWebFetch}
            disabled={fetching}
          >
            {fetching ? (
              <>
                <span
                  className="spin"
                  style={{ display: "inline-block", width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }}
                />
                Fetching from web…
              </>
            ) : (
              <>
                <Globe size={16} /> Fetch Syllabus from Web
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
