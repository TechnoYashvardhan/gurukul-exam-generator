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
  CheckCircle,
  Database,
  ScrollText,
  FileCode2,
} from "lucide-react";
import { documentsApi, templatesApi } from "@/lib/api";
import { View } from "./Sidebar";
import type { ExamHistoryEntry } from "@/hooks/useExamHistory";

interface DashboardProps {
  onNavigate: (view: View) => void;
  historyEntries?: ExamHistoryEntry[];
}

export default function Dashboard({ onNavigate, historyEntries = [] }: DashboardProps) {
  const [stats, setStats] = useState({
    templates: 0,
    documents: 0,
    generated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [temps, docs] = await Promise.all([
          templatesApi.list().catch(() => []),
          documentsApi.list().catch(() => []),
        ]);

        setStats({
          templates: temps.length,
          documents: docs.length,
          generated: historyEntries.length,
        });
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [historyEntries.length]);

  const recentExams = historyEntries.slice(0, 4);

  return (
    <div className="gurukul-page">
      {/* ── Warm Welcome Hero ── */}
      <div
        className="lens-card"
        style={{
          position: "relative",
          padding: "36px 32px",
          borderRadius: "var(--radius-xl)",
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          gap: "32px",
        }}
      >
        <div style={{ flex: 1, position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span className="chip-badge chip-badge--accent">
              <Sparkles size={12} /> Gurukul Assessment Studio
            </span>
            <span className="shloka" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
              गुरुकुल परीक्षा निर्माण
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(26px, 3.5vw, 36px)",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              marginBottom: "12px",
            }}
          >
            Create Balanced Examination Papers <br className="hidden md:inline" />
            <span style={{ color: "var(--accent)" }}>From Your Curriculum Syllabus.</span>
          </h1>

          <p
            style={{
              fontSize: "14.5px",
              color: "var(--text-2)",
              maxWidth: "620px",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            Upload your Granth textbooks or syllabus notes, configure your Vidya blueprint, import pre-built JSON papers, and synthesize comprehensive examination papers with model solutions.
          </p>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="gk-btn gk-btn--primary" onClick={() => onNavigate("generate")}>
              <Sparkles size={16} />
              Rachna (Create Exam)
            </button>
            <button className="gk-btn gk-btn--secondary" onClick={() => onNavigate("import_json")}>
              <FileCode2 size={16} />
              Aayat (JSON Import)
            </button>
            <button className="gk-btn gk-btn--secondary" onClick={() => onNavigate("builder")}>
              <BookOpen size={16} />
              Vidya (Blueprints)
            </button>
            <button className="gk-btn gk-btn--secondary" onClick={() => onNavigate("library")}>
              <Library size={16} />
              Granth (Library)
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Gurukul Action Pillars ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Vidya / Blueprints */}
        <div
          className="lens-card"
          onClick={() => onNavigate("builder")}
          style={{ padding: "20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--gold-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gold-border)",
                border: "1px solid var(--gold)",
              }}
            >
              <ScrollText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  Vidya
                </h3>
                <span className="shloka" style={{ fontSize: "12px", color: "var(--gold-border)", fontWeight: 600 }}>
                  विद्या
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", margin: 0 }}>
                {stats.templates} Saved Blueprints
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Configure examination layout, section marks, question types (MCQ, short, long), and time limits.
          </p>
        </div>

        {/* Granth / Library */}
        <div
          className="lens-card"
          onClick={() => onNavigate("library")}
          style={{ padding: "20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--forest-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--forest)",
                border: "1px solid var(--forest)",
              }}
            >
              <Library size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  Granth
                </h3>
                <span className="shloka" style={{ fontSize: "12px", color: "var(--forest)", fontWeight: 600 }}>
                  ग्रन्थ
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", margin: 0 }}>
                {stats.documents} Documents Indexed
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Upload textbooks, syllabus guides, chapter PDFs, or web links for question extraction.
          </p>
        </div>

        {/* Rachna / Generate */}
        <div
          className="lens-card"
          onClick={() => onNavigate("generate")}
          style={{ padding: "20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--accent-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                border: "1px solid var(--accent-mid)",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  Rachna
                </h3>
                <span className="shloka" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
                  रचना
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", margin: 0 }}>
                Exam Synthesis Studio
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Synthesize question papers and marking schemes from your selected syllabus source.
          </p>
        </div>

        {/* Aayat / JSON Import */}
        <div
          className="lens-card"
          onClick={() => onNavigate("import_json")}
          style={{ padding: "20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(217, 119, 6, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                border: "1px solid rgba(217, 119, 6, 0.3)",
              }}
            >
              <FileCode2 size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  Aayat
                </h3>
                <span className="shloka" style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
                  आयात
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", margin: 0 }}>
                JSON Paper Generator
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Import question sets via JSON, validate schema live, download standard templates, and render papers.
          </p>
        </div>

        {/* Itihas / Saved Papers */}
        <div
          className="lens-card"
          onClick={() => onNavigate("history")}
          style={{ padding: "20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--surface-sunken)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-2)",
                border: "1px solid var(--border)",
              }}
            >
              <History size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  Itihas
                </h3>
                <span className="shloka" style={{ fontSize: "12px", color: "var(--text-2)", fontWeight: 600 }}>
                  इतिहास
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", margin: 0 }}>
                {historyEntries.length} Saved Papers
              </p>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Access previous examination papers, review solutions, export JSON, or print papers.
          </p>
        </div>
      </div>

      {/* ── Recent Exam Papers ── */}
      <div style={{ marginTop: "44px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "19px", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <History size={18} style={{ color: "var(--accent)" }} />
                Recent Question Papers
              </h2>
              <span className="shloka" style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
                (नवीन प्रश्नपत्र)
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "2px" }}>
              Latest question papers created and saved to your Itihas archive
            </p>
          </div>
          {recentExams.length > 0 && (
            <button
              className="gk-btn gk-btn--secondary gk-btn--sm"
              onClick={() => onNavigate("history")}
            >
              View Archives ({historyEntries.length}) <ChevronRight size={13} />
            </button>
          )}
        </div>

        {recentExams.length === 0 ? (
          <div
            className="lens-card"
            style={{
              padding: "32px 20px",
              textAlign: "center",
              borderRadius: "14px",
            }}
          >
            <FileText size={32} style={{ opacity: 0.35, margin: "0 auto 10px auto", display: "block", color: "var(--text-3)" }} />
            <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
              No question papers created yet
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-2)", maxWidth: "380px", margin: "0 auto 16px auto" }}>
              Upload your syllabus in Granth or pick a blueprint in Vidya to generate your first examination paper.
            </p>
            <button className="gk-btn gk-btn--primary gk-btn--sm" onClick={() => onNavigate("generate")}>
              <Sparkles size={14} />
              Rachna (Create First Exam)
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            {recentExams.map((entry) => (
              <div
                key={entry.id}
                className="lens-card"
                onClick={() => onNavigate("history")}
                style={{
                  padding: "16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span className="chip-badge chip-badge--accent">
                      {entry.subject || "General"}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)" }}>
                      <Clock size={11} />
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", fontWeight: 700, color: "var(--text)", marginBottom: "4px", lineHeight: 1.35 }}>
                    {entry.title}
                  </h4>

                  <p style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "12px" }}>
                    {entry.grade ? `${entry.grade} • ` : ""}
                    {entry.exam?.total_marks ? `${entry.exam.total_marks} Marks • ` : ""}
                    {entry.exam?.questions?.length ? `${entry.exam.questions.length} Questions` : "Exam Paper"}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "auto" }}>
                  <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    Open in Itihas <ArrowUpRight size={12} />
                  </span>
                  <span className="chip-badge" style={{ fontSize: "10px", padding: "1px 6px" }}>
                    {entry.exam?.duration_minutes ? `${entry.exam.duration_minutes}m` : "Ready"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4-Pillar Synthesis Flow ── */}
      <div style={{ marginTop: "48px" }}>
        <div style={{ marginBottom: "18px" }}>
          <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
            <Layers size={18} style={{ color: "var(--accent)" }} />
            <span>Four Pillars of Gurukul Assessment Synthesis</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "2px" }}>
            The streamlined pedagogical path from raw curriculum texts to ready-to-print question papers
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <div className="lens-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "8px", background: "var(--gold-light)", color: "var(--gold-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={16} />
              </div>
              <span className="chip-badge chip-badge--gold" style={{ fontSize: "10px" }}>1. VIDYA</span>
            </div>
            <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
              1. Blueprint Structure
            </h4>
            <p style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Define sections, question types (MCQ, Short, Long, Case Study), and marks allocation.
            </p>
          </div>

          <div className="lens-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "8px", background: "var(--forest-light)", color: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Database size={16} />
              </div>
              <span className="chip-badge chip-badge--forest" style={{ fontSize: "10px" }}>2. GRANTH</span>
            </div>
            <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
              2. Granth Indexing
            </h4>
            <p style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Upload syllabus PDFs or study guides. Content is indexed with semantic search.
            </p>
          </div>

          <div className="lens-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "8px", background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={16} />
              </div>
              <span className="chip-badge chip-badge--accent" style={{ fontSize: "10px" }}>3. RACHNA</span>
            </div>
            <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
              3. AI Question Synthesis
            </h4>
            <p style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Gurukul reads your books and drafts authentic questions aligned with your blueprint.
            </p>
          </div>

          <div className="lens-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "8px", background: "var(--surface-sunken)", color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Printer size={16} />
              </div>
              <span className="chip-badge" style={{ fontSize: "10px" }}>4. ITIHAS</span>
            </div>
            <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
              4. Review & Eco-Print
            </h4>
            <p style={{ fontSize: "12.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Review the question paper and answer key, export to JSON, or print clean copies.
            </p>
          </div>
        </div>
      </div>

      {/* ── Key Advantages ── */}
      <div style={{ marginTop: "48px" }}>
        <div style={{ marginBottom: "18px" }}>
          <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
            <BrainCircuit size={18} style={{ color: "var(--gold)" }} />
            <span>Why Teachers Trust Gurukul</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "2px" }}>
            Built for teacher productivity, academic rigor, and privacy
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <div className="lens-card" style={{ padding: "20px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "var(--forest-light)", color: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <Shield size={18} />
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "15.5px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
              Privacy-First & Secure
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Your teaching material, question papers, and student data stay private and safely isolated.
            </p>
          </div>

          <div className="lens-card" style={{ padding: "20px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <BrainCircuit size={18} />
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "15.5px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
              Bloom's Taxonomy Alignment
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Questions test critical thinking, analysis, and problem-solving, not just memorization.
            </p>
          </div>

          <div className="lens-card" style={{ padding: "20px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "var(--gold-light)", color: "var(--gold-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <Printer size={18} />
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "15.5px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
              Eco-Friendly Print Layouts
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5 }}>
              Automatically strips color backgrounds and compacts vertical margins to save toner and paper.
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          marginTop: "56px",
          paddingTop: "20px",
          borderTop: "1px solid var(--border)",
          color: "var(--text-3)",
          fontSize: "12.5px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, var(--accent) 0%, var(--gold) 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              G
            </div>
            <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "13.5px", fontFamily: "var(--font-heading)" }}>
              Gurukul AI Ecosystem
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => onNavigate("generate")} className="gk-btn gk-btn--ghost" style={{ padding: "3px 6px", fontSize: "12px" }}>Rachna (Generate)</button>
            <button onClick={() => onNavigate("builder")} className="gk-btn gk-btn--ghost" style={{ padding: "3px 6px", fontSize: "12px" }}>Vidya (Blueprints)</button>
            <button onClick={() => onNavigate("library")} className="gk-btn gk-btn--ghost" style={{ padding: "3px 6px", fontSize: "12px" }}>Granth (Library)</button>
            <button onClick={() => onNavigate("history")} className="gk-btn gk-btn--ghost" style={{ padding: "3px 6px", fontSize: "12px" }}>Itihas (History)</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "11.5px" }}>
          <div>
            © 2026 Gurukul AI • Assessment Generator
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--forest)", display: "inline-block" }}></span>
            <span>FastAPI Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
