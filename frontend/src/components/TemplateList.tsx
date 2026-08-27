"use client";

import { useEffect, useState } from "react";
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

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await templatesApi.list(role);
      setTemplates(data);
    } catch {
      // Silently fail — backend might not be running
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, [refreshTrigger, role]);

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
            Saved Templates
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
        <h2 className="template-list__title" style={{ fontFamily: "var(--font-heading)" }}>
          Saved Templates
          {templates.length > 0 && (
            <span className="template-list__count">{templates.length}</span>
          )}
        </h2>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <FolderOpen size={40} />
          </span>
          <p className="empty-state__title">No templates yet</p>
          <p className="empty-state__sub">
            Build your first template and click Save to store it here.
          </p>
        </div>
      ) : (
        <div className="template-list__scroll">
          {templates.map((t) => (
            <div
              key={t.id}
              className="template-card"
              onClick={() => handleLoad(t.id)}
              title={`Load: ${t.name}`}
            >
              <div className="template-card__name">{t.name}</div>
              <div className="template-card__tags">
                {t.subject && <span className="gk-tag">{t.subject}</span>}
                {t.grade && <span className="gk-tag">{t.grade}</span>}
                <span className="gk-tag gk-tag--gold">{t.total_marks} marks</span>
                <span className="gk-tag">{t.num_sections} section{t.num_sections !== 1 ? "s" : ""}</span>
              </div>
              <div className="template-card__date">
                {new Date(t.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="template-card__actions">
                <button
                  className="gk-btn gk-btn--secondary gk-btn--sm"
                  onClick={(e) => { e.stopPropagation(); handleLoad(t.id); }}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Upload size={12} /> Load
                </button>
                <button
                  className="gk-btn gk-btn--danger gk-btn--sm gk-btn--icon"
                  onClick={(e) => handleDelete(t.id, e)}
                  disabled={deletingId === t.id}
                  aria-label="Delete template"
                >
                  {deletingId === t.id ? (
                    <span style={{ fontSize: 12 }}>…</span>
                  ) : (
                    <Trash2 size={13} />
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
