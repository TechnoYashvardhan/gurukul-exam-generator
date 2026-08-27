"use client";

import { 
  BookOpen, 
  Library, 
  Sparkles, 
  ScrollText, 
  Flame, 
  Shield, 
  BrainCircuit, 
  Printer, 
  Database, 
  ChevronRight, 
  Layers, 
  History, 
  Clock, 
  ArrowUpRight, 
  FileText 
} from "lucide-react";
import type { ExamTemplate } from "@/types/template";
import type { ExamHistoryEntry } from "@/hooks/useExamHistory";
import { useEffect, useState } from "react";

interface DashboardProps {
  onNavigate: (view: "dashboard" | "builder" | "library" | "generate" | "history") => void;
  historyEntries?: ExamHistoryEntry[];
}

export default function Dashboard({ onNavigate, historyEntries = [] }: DashboardProps) {
  const [stats, setStats] = useState({
    templates: 0,
    documents: 0,
  });

  const recentExams = historyEntries.slice(0, 5);

  useEffect(() => {
    // Load simple stats from local storage for a dynamic feel
    try {
      const savedTpls = localStorage.getItem("gurukul_templates");
      const tpls: ExamTemplate[] = savedTpls ? JSON.parse(savedTpls) : [];
      setStats((s) => ({ ...s, templates: tpls.length }));
    } catch (e) { }
  }, []);

  return (
    <div className="gurukul-page" style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Hero Section */}
      <div
        className="dashboard-hero"
        style={{
          position: "relative",
          padding: "48px 40px",
          borderRadius: "var(--radius-xl)",
          background: "linear-gradient(135deg, var(--bg-2) 0%, var(--surface-2) 100%)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          marginBottom: "40px",
          display: "flex",
          alignItems: "center",
          gap: "32px"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-50%",
            right: "-10%",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, var(--gold-light) 0%, transparent 60%)",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        />

        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 48px)",
              color: "var(--text)",
              lineHeight: 1.1,
              marginBottom: "16px",
            }}
          >
            Welcome to <span className="text-accent">Gurukul AI</span>
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-2)",
              maxWidth: "600px",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            Reviving the ancient tradition of personalized learning through modern artificial intelligence.
            Upload your syllabus, design the perfect template, and generate highly tailored examination papers in seconds.
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <button className="gk-btn gk-btn--primary" onClick={() => onNavigate("generate")}>
              <Sparkles size={16} style={{ marginRight: "8px" }} />
              Generate Exam
            </button>
            <button className="gk-btn gk-btn--secondary" onClick={() => onNavigate("builder")}>
              <BookOpen size={16} style={{ marginRight: "8px" }} />
              Create Template
            </button>
          </div>
        </div>

        <div className="dashboard-hero-icon" style={{ display: "none" }}>
          <Flame size={120} strokeWidth={1} color="var(--accent)" opacity={0.8} />
        </div>
      </div>

      {/* Quick Stats & Features Grid */}
      <div 
        className="dashboard-grid"
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: "24px",
          animation: "fadeUp 0.6s ease-out 0.2s both"
        }}
      >
        
        {/* Templates Card */}
        <div
          className="vidya-card dashboard-card"
          onClick={() => onNavigate("builder")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--gold)"
              }}
            >
              <ScrollText size={24} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", color: "var(--text)" }}>Vidya (Templates)</h3>
              <p style={{ fontSize: "14px", color: "var(--text-3)" }}>{stats.templates} Templates Saved</p>
            </div>
          </div>
          <p style={{ fontSize: "14.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Design reusable examination blueprints specifying sections, difficulty levels, and marking schemes.
          </p>
        </div>

        {/* Library Card */}
        <div
          className="vidya-card dashboard-card"
          onClick={() => onNavigate("library")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--forest)"
              }}
            >
              <Library size={24} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", color: "var(--text)" }}>Granth (Library)</h3>
              <p style={{ fontSize: "14px", color: "var(--text-3)" }}>Upload Syllabi & PDFs</p>
            </div>
          </div>
          <p style={{ fontSize: "14.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Build your knowledge base. Upload PDF textbooks or paste web URLs to feed the AI generator.
          </p>
        </div>

        {/* Generate Card */}
        <div
          className="vidya-card dashboard-card"
          onClick={() => onNavigate("generate")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent)"
              }}
            >
              <Sparkles size={24} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", color: "var(--text)" }}>Rachna (Generate)</h3>
              <p style={{ fontSize: "14px", color: "var(--text-3)" }}>AI Generation</p>
            </div>
          </div>
          <p style={{ fontSize: "14.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Combine a template and a document from your library to instantly synthesize a fresh exam paper.
          </p>
        </div>

        {/* History Card */}
        <div
          className="vidya-card dashboard-card"
          onClick={() => onNavigate("history" as any)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-1)"
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", color: "var(--text)" }}>Itihas (History)</h3>
              <p style={{ fontSize: "14px", color: "var(--text-3)" }}>Past Generated Exams</p>
            </div>
          </div>
          <p style={{ fontSize: "14.5px", color: "var(--text-2)", lineHeight: 1.5 }}>
            Access, view, export, and print all previously generated exam papers securely saved on your device.
          </p>
        </div>

      </div>

      {/* ── RECENT QUESTION PAPERS (LATEST 5) ── */}
      <div style={{ marginTop: "64px", animation: "fadeUp 0.6s ease-out 0.3s both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", color: "var(--text)", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
              <History size={24} className="text-accent" />
              Recent Question Papers
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-3)", marginTop: "4px" }}>
              Latest exams generated and saved on this device
            </p>
          </div>
          {recentExams.length > 0 && (
            <button 
              className="gk-btn gk-btn--secondary"
              style={{ padding: "8px 16px", fontSize: "13px" }}
              onClick={() => onNavigate("history")}
            >
              View All History ({historyEntries?.length}) <ChevronRight size={14} style={{ marginLeft: 4 }} />
            </button>
          )}
        </div>

        {recentExams.length === 0 ? (
          <div 
            className="vidya-card" 
            style={{ 
              padding: "36px", 
              textAlign: "center", 
              background: "var(--surface-2)", 
              borderRadius: "20px",
              border: "1px dashed var(--border-light)"
            }}
          >
            <FileText size={40} style={{ opacity: 0.3, margin: "0 auto 12px auto", display: "block", color: "var(--text-3)" }} />
            <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--text)", marginBottom: "6px" }}>
              No Question Papers Generated Yet
            </h4>
            <p style={{ fontSize: "14px", color: "var(--text-2)", maxWidth: "420px", margin: "0 auto 20px auto" }}>
              Upload your syllabus in Granth or pick a template in Vidya to generate your first examination paper.
            </p>
            <button className="gk-btn gk-btn--primary" onClick={() => onNavigate("generate")}>
              <Sparkles size={16} style={{ marginRight: "8px" }} />
              Generate First Exam
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {recentExams.map((entry) => (
              <div
                key={entry.id}
                className="vidya-card dashboard-history-card"
                onClick={() => onNavigate("history")}
                style={{
                  padding: "20px",
                  borderRadius: "16px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-light)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <span style={{
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      padding: "3px 10px",
                      borderRadius: "100px",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)"
                    }}>
                      {entry.subject || "General"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} />
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 style={{ fontFamily: "var(--font-heading)", fontSize: "17px", color: "var(--text)", marginBottom: "6px", lineHeight: 1.3 }}>
                    {entry.title}
                  </h4>

                  <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "16px" }}>
                    {entry.grade ? `${entry.grade} • ` : ""}
                    {entry.exam?.total_marks ? `${entry.exam.total_marks} Marks • ` : ""}
                    {entry.exam?.questions?.length ? `${entry.exam.questions.length} Questions` : "Exam Paper"}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: "12px", marginTop: "auto" }}>
                  <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    Open in History <ArrowUpRight size={14} />
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--bg)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                    {entry.exam?.duration_minutes ? `${entry.exam.duration_minutes}m` : "Ready"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── USER FRIENDLY INFO SECTION ── */}
      
      {/* 1. Workflow Pipeline */}
      <div style={{ marginTop: "64px", animation: "fadeUp 0.6s ease-out 0.4s both" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", color: "var(--text)", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Layers size={24} className="text-accent" />
          How to Create Your First Exam
        </h2>
        
        <div className="workflow-pipeline">
          <div className="workflow-step">
            <div className="workflow-icon"><BookOpen size={24} /></div>
            <h4>1. Make a Template</h4>
            <p>Set up marks, sections, and question types in the Vidya tab.</p>
          </div>
          <div className="workflow-arrow"><ChevronRight size={24} /></div>
          
          <div className="workflow-step">
            <div className="workflow-icon"><Database size={24} /></div>
            <h4>2. Upload Books</h4>
            <p>Give us your PDF textbooks or web links in the Granth tab.</p>
          </div>
          <div className="workflow-arrow"><ChevronRight size={24} /></div>
          
          <div className="workflow-step">
            <div className="workflow-icon"><Sparkles size={24} /></div>
            <h4>3. Generate AI Paper</h4>
            <p>Our AI reads your books and instantly writes the exam.</p>
          </div>
          <div className="workflow-arrow"><ChevronRight size={24} /></div>
          
          <div className="workflow-step">
            <div className="workflow-icon"><Printer size={24} /></div>
            <h4>4. Print & Save</h4>
            <p>Review the paper and answer key, then print it out.</p>
          </div>
        </div>
      </div>

      {/* 2. Why it helps Bento Grid */}
      <div style={{ marginTop: "64px", animation: "fadeUp 0.6s ease-out 0.5s both" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", color: "var(--text)", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <BrainCircuit size={24} style={{ color: "var(--gold)" }} />
          Why Teachers Love Gurukul
        </h2>
        
        <div className="bento-grid">
          <div className="bento-card bento-card--large">
            <Shield size={32} style={{ color: "var(--forest)", marginBottom: "16px" }} />
            <h3>Privacy-First Architecture</h3>
            <p>Your textbooks, syllabus, and exam records are processed with high privacy standards and local isolation. Designed to minimize external data footprint while enabling efficient, distraction-free assessment workflows.</p>
          </div>
          
          <div className="bento-card">
            <BrainCircuit size={32} style={{ color: "var(--accent)", marginBottom: "16px" }} />
            <h3>Smart Questioning</h3>
            <p>We ensure questions test true understanding, not just memorization, using proven educational frameworks.</p>
          </div>
          
          <div className="bento-card">
            <Printer size={32} style={{ color: "var(--text-2)", marginBottom: "16px" }} />
            <h3>Eco-Friendly Printing</h3>
            <p>When you hit print, we automatically strip away colors and compact the spacing to save you ink and paper.</p>
          </div>

          <div className="bento-card bento-card--large-alt">
            <Sparkles size={32} style={{ color: "var(--gold)", marginBottom: "16px" }} />
            <h3>Pro Tips for the Best Results</h3>
            <ul style={{ paddingLeft: "20px", marginTop: "8px", color: "var(--text-2)", lineHeight: "1.7", fontSize: "14.5px" }}>
              <li><strong>Be specific:</strong> Give your template sections clear names like "Long Answer Questions".</li>
              <li><strong>Upload clean PDFs:</strong> The AI reads text, so make sure your PDFs have selectable text rather than blurry images.</li>
              <li><strong>Check the Answer Key:</strong> We always generate a complete answer key for you alongside the question paper!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD FOOTER ── */}
      <footer 
        className="dashboard-footer"
        style={{ 
          marginTop: "80px", 
          paddingTop: "32px", 
          borderTop: "1px solid var(--border-light)",
          color: "var(--text-3)",
          fontSize: "13.5px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ 
              width: "34px", 
              height: "34px", 
              borderRadius: "10px", 
              background: "linear-gradient(135deg, var(--gold) 0%, var(--accent) 100%)", 
              color: "#fff", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontWeight: 800, 
              fontSize: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              G
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "16px", fontFamily: "var(--font-heading)" }}>
                Gurukul AI Exam Generator
              </span>
              <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-3)" }}>
                Curriculum-Aligned Assessment Synthesis Engine
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <button onClick={() => onNavigate("generate")} className="dashboard-footer-btn">Rachna (Generate)</button>
            <button onClick={() => onNavigate("builder")} className="dashboard-footer-btn">Vidya (Templates)</button>
            <button onClick={() => onNavigate("library")} className="dashboard-footer-btn">Granth (Library)</button>
            <button onClick={() => onNavigate("history")} className="dashboard-footer-btn">Itihas (History)</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "18px", fontSize: "12.5px" }}>
          <div>
            © 2026 Gurukul AI • Powered by Hybrid Cloud LPU & Local Ollama Intelligence
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981" }}></span>
              FastAPI :8001 Online
            </span>
            <span>•</span>
            <span>Gemini 3.5 Ready</span>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .dashboard-hero {
          animation: fadeUp 0.6s ease-out both;
        }
        .dashboard-hero-icon {
          animation: float 4s ease-in-out infinite;
        }
        .dashboard-card {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          border: 1px solid var(--border-light);
        }
        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.08);
          border-color: var(--gold-light);
        }

        /* Workflow Pipeline */
        .workflow-pipeline {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--surface-2);
          padding: 32px;
          border-radius: 24px;
          border: 1px solid var(--border-light);
          overflow-x: auto;
        }
        .workflow-step {
          flex: 1;
          min-width: 200px;
          background: var(--bg);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          transition: all 0.3s ease;
          position: relative;
        }
        .workflow-step:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.06);
          border-color: var(--accent-light);
        }
        .workflow-icon {
          width: 48px;
          height: 48px;
          background: var(--accent-light);
          color: var(--accent);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .workflow-step h4 {
          font-family: var(--font-heading);
          font-size: 18px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .workflow-step p {
          font-size: 13.5px;
          color: var(--text-2);
          line-height: 1.5;
        }
        .workflow-arrow {
          color: var(--text-3);
          flex-shrink: 0;
        }

        /* Bento Grid */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .bento-card {
          background: var(--surface-2);
          border: 1px solid var(--border-light);
          border-radius: 24px;
          padding: 32px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .bento-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--accent-light), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .bento-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08);
        }
        .bento-card:hover::before {
          opacity: 1;
        }
        .bento-card h3 {
          font-family: var(--font-heading);
          font-size: 20px;
          color: var(--text);
          margin-bottom: 12px;
        }
        .bento-card p {
          font-size: 14.5px;
          color: var(--text-2);
          line-height: 1.6;
        }
        .bento-card--large {
          grid-column: span 2;
          background: linear-gradient(135deg, var(--surface-2) 0%, var(--bg-2) 100%);
        }
        .bento-card--large-alt {
          grid-column: span 2;
          background: linear-gradient(135deg, var(--bg-2) 0%, var(--surface-2) 100%);
        }
        .tech-badge {
          display: inline-block;
          margin-top: 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-1);
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .dashboard-history-card {
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .dashboard-history-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.08);
          border-color: var(--accent) !important;
        }
        .dashboard-footer-btn {
          background: none;
          border: none;
          color: var(--text-2);
          font-size: 13.5px;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease;
        }
        .dashboard-footer-btn:hover {
          color: var(--accent);
          text-decoration: underline;
        }

        @media (max-width: 1024px) {
          .workflow-pipeline { flex-direction: column; align-items: stretch; }
          .workflow-arrow { transform: rotate(90deg); align-self: center; margin: -8px 0; }
          .bento-grid { grid-template-columns: 1fr; }
          .bento-card--large, .bento-card--large-alt { grid-column: span 1; }
        }
        @media (min-width: 768px) {
          .dashboard-hero-icon { display: block !important; }
        }
      `}} />
    </div>
  );
}
