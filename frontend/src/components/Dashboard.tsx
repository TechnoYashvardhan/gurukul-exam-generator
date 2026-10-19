"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  BookOpen,
  Library,
  History,
  FileText,
  Clock,
  ChevronRight,
  Shield,
  Layers,
  Printer,
  BrainCircuit,
  ArrowUpRight,
  Database,
  ScrollText,
  FileCode2,
  Users,
  Send,
  ArrowRight,
  Bot,
  MessageSquare,
} from "lucide-react";
import { documentsApi, templatesApi, adminApi } from "@/lib/api";
import { View } from "./Sidebar";
import type { ExamHistoryEntry } from "@/hooks/useExamHistory";

interface DashboardProps {
  onNavigate: (view: View) => void;
  historyEntries?: ExamHistoryEntry[];
  role?: "admin" | "teacher";
}

export default function Dashboard({ onNavigate, historyEntries = [], role = "teacher" }: DashboardProps) {
  const [stats, setStats] = useState({
    templates: 0,
    documents: 0,
    generated: 0,
    classes: 0,
    published: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const promises: Promise<any>[] = [
          templatesApi.list().catch(() => []),
          documentsApi.list().catch(() => []),
        ];
        if (role === "admin") {
          promises.push(adminApi.listClasses().catch(() => []));
          promises.push(adminApi.listPublishedQuizzes().catch(() => []));
        }

        const results = await Promise.all(promises);
        const temps = results[0] || [];
        const docs = results[1] || [];
        const cls = results[2] || [];
        const pubs = results[3] || [];

        setStats({
          templates: temps.length,
          documents: docs.length,
          generated: historyEntries.length,
          classes: cls.length,
          published: pubs.length,
        });
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [historyEntries.length, role]);

  const recentExams = historyEntries.slice(0, 5);

  return (
    <div className="gurukul-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 36px" }}>
      {/* ── 1. Hero Zone (Flush & Editorial, No Boxy Card) ── */}
      <div
        style={{
          position: "relative",
          padding: "36px 0 28px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 100,
              background: "var(--accent-light)",
              border: "1px solid var(--accent-mid)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--accent)",
              fontWeight: 700,
            }}
          >
            <Sparkles size={12} /> Gurukul Assessment Synthesis Desk
          </span>
          <span className="shloka" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
            गुरुकुल परीक्षा निर्माण
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
          <div style={{ maxWidth: 720 }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3.8vw, 40px)",
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginBottom: "12px",
              }}
            >
              Synthesize Balanced Examination Papers <br />
              <span
                style={{
                  background: "linear-gradient(135deg, var(--accent) 0%, var(--gold) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Directly from Your Syllabus Texts.
              </span>
            </h1>

            <p style={{ fontSize: "15px", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
              Upload your Granth textbooks or syllabus notes, configure your Vidya blueprint, and generate authenticated question papers with model answers and Bloom&apos;s taxonomy metrics.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="gk-btn gk-btn--primary"
              onClick={() => onNavigate("generate")}
              style={{ height: 44, padding: "0 20px", fontSize: 14 }}
            >
              <Sparkles size={16} />
              <span>Synthesize Exam (रचना)</span>
            </button>
            <button
              className="gk-btn gk-btn--secondary"
              onClick={() => onNavigate("library")}
              style={{ height: 44, padding: "0 18px", fontSize: 13.5 }}
            >
              <Library size={16} />
              <span>Upload Syllabus (ग्रन्थ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. The Curriculum Conduit (2 Rows x 3 Tabs Architecture) ── */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={17} color="var(--accent)" />
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "16.5px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Curriculum Synthesis Conduit
            </h2>
            <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              {role === "admin" ? "Six Core Modules • Pipeline Architecture" : "Core Academic Pipeline • Six Modules"}
            </span>
          </div>
        </div>

        {/* Conduit Grid: Exactly 2 Rows with 3 Tabs */}
        <div className="conduit-grid">
          {/* Phase 1: Granth */}
          <div
            onClick={() => onNavigate("library")}
            style={{
              padding: "20px 22px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              transition: "all 0.22s var(--ease-spring)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 146,
            }}
            className="conduit-cell"
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--forest)", letterSpacing: "0.04em" }}>
                  PHASE 01
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "var(--forest-light)",
                    color: "var(--forest)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Library size={17} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Granth</h3>
                <span className="shloka" style={{ fontSize: 13, color: "var(--forest)", fontWeight: 600 }}>ग्रन्थ</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>
                Syllabus Library & Course Documents
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                {stats.documents} Indexed
              </span>
              <ArrowRight size={14} color="var(--text-3)" />
            </div>
          </div>

          {/* Phase 2: Vidya */}
          <div
            onClick={() => onNavigate("builder")}
            style={{
              padding: "20px 22px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              transition: "all 0.22s var(--ease-spring)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 146,
            }}
            className="conduit-cell"
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.04em" }}>
                  PHASE 02
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "var(--gold-light)",
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ScrollText size={17} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Vidya</h3>
                <span className="shloka" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600 }}>विद्या</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>
                Blueprints & Section Structures
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                {stats.templates} Blueprints
              </span>
              <ArrowRight size={14} color="var(--text-3)" />
            </div>
          </div>

          {/* Phase 3: Rachna */}
          <div
            onClick={() => onNavigate("generate")}
            style={{
              padding: "20px 22px",
              background: "var(--surface)",
              border: "1.5px solid var(--accent)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              transition: "all 0.22s var(--ease-spring)",
              position: "relative",
              boxShadow: "0 4px 18px rgba(234, 88, 12, 0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 146,
            }}
            className="conduit-cell"
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>
                  PHASE 03 (CORE)
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={17} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Rachna</h3>
                <span className="shloka" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>रचना</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>
                AI Exam Synthesis Studio
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>
                Active Studio
              </span>
              <ArrowRight size={14} color="var(--accent)" />
            </div>
          </div>

          {/* Admin Specific Segments: Shishyas & Prakashan */}
          {role === "admin" ? (
            <>
              {/* Card 4: Shishyas */}
              <div
                onClick={() => onNavigate("shishyas")}
                style={{
                  padding: "20px 22px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  transition: "all 0.22s var(--ease-spring)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 146,
                }}
                className="conduit-cell"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>
                      COHORTS
                    </span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface-sunken)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={17} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Shishyas</h3>
                    <span className="shloka" style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>शिष्य</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>Students & Class Rosters</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{stats.classes} Classes</span>
                  <ArrowRight size={14} color="var(--text-3)" />
                </div>
              </div>

              {/* Card 5: Prakashan */}
              <div
                onClick={() => onNavigate("publishes")}
                style={{
                  padding: "20px 22px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  transition: "all 0.22s var(--ease-spring)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 146,
                }}
                className="conduit-cell"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>
                      LIVE HUB
                    </span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface-sunken)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Send size={17} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Prakashan</h3>
                    <span className="shloka" style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>प्रकाशन</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>Published Assessments & Quizzes</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{stats.published} Online</span>
                  <ArrowRight size={14} color="var(--text-3)" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Teacher Card 4: Aayat (JSON Importer) */}
              <div
                onClick={() => onNavigate("import_json")}
                style={{
                  padding: "20px 22px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  transition: "all 0.22s var(--ease-spring)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 146,
                }}
                className="conduit-cell"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>
                      IMPORTER
                    </span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface-sunken)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileCode2 size={17} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Aayat</h3>
                    <span className="shloka" style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>आयात</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>JSON Exam & Question Importer</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>Instant Import</span>
                  <ArrowRight size={14} color="var(--text-3)" />
                </div>
              </div>

              {/* Teacher Card 5: Saathi Companion */}
              <div
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-saathi-chatbot"));
                }}
                style={{
                  padding: "20px 22px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  transition: "all 0.22s var(--ease-spring)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 146,
                }}
                className="conduit-cell"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>
                      COMPANION
                    </span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Bot size={17} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Saathi</h3>
                    <span className="shloka" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>साथी</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>Interactive FAQ & AI Assistant</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>Ask Assistant</span>
                  <ArrowRight size={14} color="var(--accent)" />
                </div>
              </div>
            </>
          )}

          {/* Phase 4 / Final Card: Itihas */}
          <div
            onClick={() => onNavigate("history")}
            style={{
              padding: "20px 22px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              transition: "all 0.22s var(--ease-spring)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 146,
            }}
            className="conduit-cell"
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>
                  PHASE 04
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "var(--surface-sunken)",
                    color: "var(--text-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <History size={17} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>Itihas</h3>
                <span className="shloka" style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>इतिहास</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 12px", lineHeight: 1.45 }}>
                Exam Paper Archives & Prints
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: "auto" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                {historyEntries.length} Saved
              </span>
              <ArrowRight size={14} color="var(--text-3)" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Recent Question Papers (Scannable Horizontal Rows, No Card Clutter) ── */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "17px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                Recent Examination Archives
              </h2>
              <span className="shloka" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
                (नवीन प्रश्नपत्र)
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "2px", margin: 0 }}>
              Question papers synthesized and saved to your persistent archives
            </p>
          </div>
          {recentExams.length > 0 && (
            <button
              className="gk-btn gk-btn--secondary gk-btn--sm"
              onClick={() => onNavigate("history")}
            >
              All Archives ({historyEntries.length}) <ChevronRight size={13} />
            </button>
          )}
        </div>

        {recentExams.length === 0 ? (
          <div
            style={{
              padding: "36px 24px",
              textAlign: "center",
              border: "1.5px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
            }}
          >
            <FileText size={28} style={{ opacity: 0.35, margin: "0 auto 8px auto", display: "block" }} />
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              No examination papers synthesized yet
            </h4>
            <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 420, margin: "0 auto 16px auto" }}>
              Upload your syllabus in Granth or pick a blueprint in Vidya to synthesize your first examination paper.
            </p>
            <button className="gk-btn gk-btn--primary gk-btn--sm" onClick={() => onNavigate("generate")}>
              <Sparkles size={14} /> Create First Paper
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            {recentExams.map((entry, index) => (
              <div
                key={entry.id}
                onClick={() => onNavigate("history")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: index < recentExams.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  gap: 16,
                }}
                className="recent-exam-row"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.title}
                      </span>
                      <span
                        style={{
                          padding: "1px 8px",
                          borderRadius: 100,
                          background: "var(--surface-sunken)",
                          border: "1px solid var(--border)",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-3)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {entry.subject || "General"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {entry.grade ? `${entry.grade} • ` : ""}
                      {entry.exam?.total_marks ? `${entry.exam.total_marks} Marks • ` : ""}
                      {entry.exam?.questions?.length ? `${entry.exam.questions.length} Questions` : "Exam Paper"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <Clock size={12} />
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Open Archive <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Four Pillars Architectural Legend ── */}
      <div
        style={{
          padding: "24px 28px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BrainCircuit size={17} color="var(--accent)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Pedagogical Standards & Academic Integrity
            </h3>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Bloom&apos;s Taxonomy Aligned
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              1. Bloom&apos;s Cognitive Mapping
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
              Questions assess analytical reasoning and application, not superficial memorization.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              2. Semantic Syllabus Citation
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
              Questions strictly cite textbook chapters indexed in Granth without AI hallucination.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              3. Model Solutions & Rubrics
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
              Complete marking schemes and step-by-step scoring breakdown generated alongside.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              4. Eco-Print Layout Engine
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
              Compact typography and color stripping optimize toner and paper for physical exams.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
