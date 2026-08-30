"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Trash2, Upload } from "lucide-react";
import { templatesApi } from "@/lib/api";
import type { TemplateSummary, ExamTemplate } from "@/types/template";

interface TemplateListProps {
  onLoad: (name: string, config: ExamTemplate) => void;
  refreshTrigger: number;
  role?: "admin" | "teacher";
}

export default function TemplateList({ onLoad, refreshTrigger, role = "teacher" }: TemplateListProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await templatesApi.list(role);
      setTemplates(data);
    } catch {
      // Silently fail — backend might not be running
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates, refreshTrigger]);

  async function handleLoad(id: string) {
    try {
      const detail = await templatesApi.get(id);
      onLoad(detail.name, detail.config);
    } catch (err: unknown) {
      console.error("Failed to load template:", err);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      await templatesApi.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      console.error("Failed to delete template:", err);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="template-list">
        <div className="template-list__header">
          <h2 className="template-list__title" style={{ fontFamily: "var(--font-heading)" }}>
            Saved Blueprints
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 80, borderRadius: "var(--radius)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="template-list">
      <div className="template-list__header">
        <h2 className="template-list__title" style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Vidya Blueprints</span>
          <span className="shloka" style={{ fontSize: 12.5, color: "var(--gold-border)", fontWeight: 600 }}>(विद्या)</span>
          {templates.length > 0 && (
            <span className="chip-badge chip-badge--accent" style={{ marginLeft: "auto" }}>
              {templates.length}
            </span>
          )}
        </h2>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <FolderOpen size={36} />
          </span>
          <p className="empty-state__title">No blueprints yet</p>
          <p className="empty-state__sub">
            Build your first blueprint and click Save to store it here.
          </p>
        </div>
      ) : (
        <div className="template-list__scroll" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {templates.map((t) => (
            <div
              key={t.id}
              className="lens-card"
              onClick={() => handleLoad(t.id)}
              style={{ padding: 14, cursor: "pointer" }}
              title={`Load: ${t.name}`}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)", marginBottom: 6 }}>
                {t.name}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                {t.subject && <span className="chip-badge">{t.subject}</span>}
                {t.grade && <span className="chip-badge">{t.grade}</span>}
                <span className="chip-badge chip-badge--gold">{t.total_marks} marks</span>
                <span className="chip-badge">{t.num_sections} sec</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <button
                  className="gk-btn gk-btn--secondary gk-btn--sm"
                  onClick={(e) => { e.stopPropagation(); handleLoad(t.id); }}
                  style={{ flex: 1, justifyContent: "center", fontSize: "11px", height: "28px" }}
                >
                  <Upload size={12} /> Load
                </button>
                <button
                  className="gk-btn gk-btn--danger gk-btn--sm gk-btn--icon"
                  onClick={(e) => handleDelete(t.id, e)}
                  disabled={deletingId === t.id}
                  style={{ width: "28px", height: "28px", padding: 0 }}
                  aria-label="Delete template"
                >
                  {deletingId === t.id ? (
                    <span style={{ fontSize: 11 }}>…</span>
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
