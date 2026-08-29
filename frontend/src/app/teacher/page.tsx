"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar, { View } from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import TemplateBuilder from "@/components/TemplateBuilder";
import TemplateList from "@/components/TemplateList";
import LibraryUpload from "@/components/LibraryUpload";
import DocumentCard from "@/components/DocumentCard";
import GeneratePanel from "@/components/GeneratePanel";
import ExamHistory from "@/components/ExamHistory";
import { useExamHistory } from "@/hooks/useExamHistory";
import { documentsApi } from "@/lib/api";
import type { ExamTemplate } from "@/types/template";
import type { DocumentSummary } from "@/types/document";
import { FolderOpen, File } from "lucide-react";

import ProtectedRoute from "@/components/ProtectedRoute";

const ParticleBackground = dynamic(
  () => import("@/components/ParticleBackground"),
  { ssr: false }
);

export default function TeacherPage() {
  const [activeView, setActiveView] = useState<View>("dashboard");

  // History state — segregated for Teacher offline papers
  const { entries: historyEntries, saveExam: saveToHistory, removeExam: removeFromHistory, renameExam: renameInHistory } = useExamHistory("teacher");

  // Builder state
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadTrigger, setLoadTrigger] = useState<{
    name: string;
    config: ExamTemplate;
  } | null>(null);

  // Library state
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const selectedDoc = docs.find((d) => d.id === selectedDocId) ?? null;

  const handleSaved = useCallback(() => setRefreshKey((k) => k + 1), []);
  const handleLoad = useCallback((name: string, config: ExamTemplate) => {
    setLoadTrigger({ name, config });
  }, []);

  async function handleViewChange(view: View) {
    setActiveView(view);
    if ((view === "library" || view === "generate") && !docsLoaded) {
      try {
        const list = await documentsApi.list();
        setDocs(list);
        setDocsLoaded(true);
      } catch {
        setDocsLoaded(true);
      }
    }
  }

  function handleDocUploaded(doc: DocumentSummary) {
    setDocs((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
  }

  function handleDocReady(updated: DocumentSummary) {
    setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleDocDeleted(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocId === id) setSelectedDocId(null);
  }

  return (
    <ProtectedRoute allowedRoles={["teacher", "admin"]}>
      <ParticleBackground />
      <div className="gurukul-app">
        {/* ── Persistent Sidebar ──────────────────────────────────── */}
        <Sidebar activeView={activeView} onViewChange={handleViewChange} role="teacher" />

        {/* ── Main Content ────────────────────────────────────────── */}
        <div className="gurukul-content">
          {/* Dashboard View */}
          {activeView === "dashboard" && (
            <Dashboard 
              onNavigate={handleViewChange} 
              historyEntries={historyEntries}
            />
          )}

          {/* Builder View */}
          {activeView === "builder" && (
            <div className="gurukul-page gurukul-page--builder" key="builder">
              {/* Saved templates sidebar */}
              <aside aria-label="Saved templates">
                <TemplateList
                  onLoad={handleLoad}
                  refreshTrigger={refreshKey}
                  role="teacher"
                />
              </aside>

              {/* Builder main */}
              <main id="main-content">
                <TemplateBuilder
                  onSaved={handleSaved}
                  externalLoad={loadTrigger}
                  onExternalLoadConsumed={() => setLoadTrigger(null)}
                  role="teacher"
                />
              </main>
            </div>
          )}

          {/* ── Library View ──────────────────────────────────────── */}
          {activeView === "library" && (
            <div className="gurukul-page" key="library">
              {/* Page header */}
              <div className="page-header">
                <div className="page-header__breadcrumb">Granth / Document Library</div>
                <h1 className="page-header__title">Document Library</h1>
                <div className="page-header__ornament">
                  <div className="page-header__ornament-line" />
                  <div className="page-header__ornament-diamond" />
                  <div className="page-header__ornament-line--right" />
                </div>
                <p className="page-header__subtitle">
                  Upload a PDF syllabus or fetch one from the web — Gurukul will read and remember it
                </p>
              </div>

              {/* Upload widget */}
              <LibraryUpload onUploaded={handleDocUploaded} />

              {/* Documents grid */}
              {docs.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 32 }}>
                  <span className="empty-state__icon">
                    <FolderOpen size={48} />
                  </span>
                  <p className="empty-state__title">No scrolls in the Granth yet</p>
                  <p className="empty-state__sub">
                    Upload a PDF or fetch a syllabus from the web to begin your study.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 32 }}>
                  <div className="ornament-heading">
                    <File size={14} />
                    Your Documents
                    <span
                      style={{
                        background: "var(--accent-light)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-mid)",
                        borderRadius: 100,
                        padding: "1px 10px",
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {docs.length}
                    </span>
                  </div>
                  <div className="library-grid">
                    {docs.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        selected={doc.id === selectedDocId}
                        onSelect={() => setSelectedDocId(doc.id)}
                        onDelete={() => handleDocDeleted(doc.id)}
                        onReady={handleDocReady}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Generate View ─────────────────────────────────────── */}
          {activeView === "generate" && (
            <div className="gurukul-page" key="generate">
              {/* Document selector */}
              {docs.length > 0 && (
                <div className="no-print" style={{ marginBottom: 28 }}>
                  <div className="ornament-heading" style={{ marginBottom: 14 }}>
                    <File size={14} /> Select Source Document
                  </div>
                  <div className="library-grid">
                    {docs.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        selected={doc.id === selectedDocId}
                        onSelect={() =>
                          setSelectedDocId((prev) =>
                            prev === doc.id ? null : doc.id
                          )
                        }
                        onDelete={() => handleDocDeleted(doc.id)}
                        onReady={handleDocReady}
                      />
                    ))}
                  </div>
                </div>
              )}

              <GeneratePanel selectedDoc={selectedDoc} onExamSaved={saveToHistory} role="teacher" />
            </div>
          )}

          {/* History View */}
          {activeView === "history" && (
            <ExamHistory
              entries={historyEntries}
              onRemove={removeFromHistory}
              onRename={renameInHistory}
              role="teacher"
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
