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
import AdminShishyaManager from "@/components/AdminShishyaManager";
import AdminPublishedManager from "@/components/AdminPublishedManager";
import JsonExamImporter from "@/components/JsonExamImporter";
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
                <div className="page-header__breadcrumb">
                  Granth <span className="shloka">(ग्रन्थ)</span> / Syllabus Library
                </div>
                <h1 className="page-header__title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>Granth — Document Library</span>
                  <span className="shloka" style={{ fontSize: "20px", color: "var(--forest)", fontWeight: 600 }}>
                    (ग्रन्थ)
                  </span>
                </h1>
                <p className="page-header__subtitle">
                  Upload textbooks, syllabus chapters, or study guides for examination question synthesis.
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
                  <p className="empty-state__title">No documents in your library yet</p>
                  <p className="empty-state__sub">
                    Upload a textbook PDF or paste web notes to start creating questions.
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
            <GeneratePanel
              docs={docs}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
              selectedDoc={selectedDoc}
              onExamSaved={saveToHistory}
              role="teacher"
              onNavigate={handleViewChange}
            />
          )}

          {/* JSON Paper Importer & Generator View */}
          {activeView === "import_json" && (
            <div className="gurukul-page" key="import_json">
              <JsonExamImporter onExamSaved={saveToHistory} role="teacher" />
            </div>
          )}

          {/* Shishya (Students & Cohorts) Manager View */}
          {activeView === "shishyas" && (
            <div className="gurukul-page" key="shishyas">
              <AdminShishyaManager />
            </div>
          )}

          {/* Published Quizzes Management View */}
          {activeView === "publishes" && (
            <div className="gurukul-page" key="publishes">
              <AdminPublishedManager />
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
