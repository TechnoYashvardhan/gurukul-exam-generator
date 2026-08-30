"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentSummary } from "@/types/document";
import { documentsApi } from "@/lib/api";
import { Clock, Settings, CheckCircle, XCircle, FileText, Globe, X, Check } from "lucide-react";

interface DocumentCardProps {
  doc: DocumentSummary;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onReady: (updated: DocumentSummary) => void;
}

export default function DocumentCard({
  doc,
  selected,
  onSelect,
  onDelete,
  onReady,
}: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false);

  // Poll for status updates if still processing
  useEffect(() => {
    if (doc.status !== "processing" && doc.status !== "pending") return;
    const id = setInterval(async () => {
      try {
        const updated = await documentsApi.get(doc.id);
        if (updated.status === "ready" || updated.status === "error") {
          onReady(updated);
          clearInterval(id);
        }
      } catch {
        clearInterval(id);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [doc.id, doc.status, onReady]);

  const isReady = doc.status === "ready";

  const STATUS_CONFIG = {
    pending:    { label: "Pending",    icon: <Clock size={13} />,       cls: "doc-card__status--pending" },
    processing: { label: "Processing", icon: <Settings size={13} className="spin" />, cls: "doc-card__status--processing" },
    ready:      { label: "Ready",      icon: <CheckCircle size={13} />, cls: "doc-card__status--ready" },
    error:      { label: "Error",      icon: <XCircle size={13} />,     cls: "doc-card__status--error" },
  };

  const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.error;
  const isWebFetch = doc.source === "web_fetch";

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    setDeleting(true);
    try {
      await documentsApi.delete(doc.id);
      onDelete();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`doc-card doc-card--${doc.status} ${selected ? "doc-card--selected" : ""} ${!isReady ? "doc-card--disabled" : ""}`}
      onClick={() => isReady && onSelect()}
      role={isReady ? "button" : undefined}
      tabIndex={isReady ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && isReady && onSelect()}
      aria-pressed={selected}
    >
      {/* Source icon */}
      <div className="doc-card__source-icon">
        {isWebFetch ? <Globe size={18} /> : <FileText size={18} />}
      </div>

      {/* Filename + delete */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <p className="doc-card__filename" style={{ flex: 1 }}>{doc.filename}</p>
        <button
          className="gk-btn gk-btn--icon"
          style={{ width: 28, height: 28, flexShrink: 0 }}
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete document"
        >
          {deleting ? <span style={{ fontSize: 12 }}>…</span> : <X size={13} />}
        </button>
      </div>

      {/* Tags */}
      <div className="doc-card__meta" style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "8px 0" }}>
        {doc.subject && <span className="chip-badge">{doc.subject}</span>}
        {doc.grade && <span className="chip-badge">{doc.grade}</span>}
        {doc.page_count && <span className="chip-badge">{doc.page_count} pages</span>}
        {doc.chunk_count > 0 && (
          <span className="chip-badge chip-badge--accent">{doc.chunk_count} chunks</span>
        )}
        <span className="chip-badge">
          {isWebFetch ? "Web" : "PDF"}
        </span>
      </div>

      {/* Status + date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span className={`doc-card__status ${status.cls}`}>
          {status.icon}
          {status.label}
        </span>
        <time style={{ fontSize: 10.5, color: "var(--text-3)" }}>
          {new Date(doc.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </time>
      </div>

      {/* Selected badge */}
      {selected && isReady && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: "5px 12px",
            background: "var(--forest-light)",
            color: "var(--forest)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            fontWeight: 700,
            border: "1px solid hsl(140, 38%, 65%)",
          }}
        >
          <Check size={13} /> Selected for exam
        </div>
      )}
    </div>
  );
}
