"use client";

import { useEffect, useState } from "react";
import { studentApi } from "@/lib/api";
import type { StudentStats } from "@/types/auth";
import {
  History,
  Trophy,
  Target,
  Clock,
  Award,
  BookOpen,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface StudentHistoryProps {
  onNavigateToQuiz: (quizId?: string) => void;
  onNavigateToAttempt: (attemptId: string) => void;
}

export default function StudentHistory({
  onNavigateToQuiz,
  onNavigateToAttempt,
}: StudentHistoryProps) {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [masteryFilter, setMasteryFilter] = useState<"all" | "high" | "passing" | "low">("all");

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const data = await studentApi.getStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load student history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const attempts = stats?.recent_attempts || [];

  // Extract distinct subjects from attempts
  const subjects = Array.from(
    new Set(attempts.map((a) => a.subject).filter(Boolean))
  ) as string[];

  // Filter attempts based on search, subject, and mastery level
  const filteredAttempts = attempts.filter((att) => {
    const textToMatch = `${att.title || ""} ${att.subject || ""} ${att.grade || ""}`.toLowerCase();
    const matchesSearch = textToMatch.includes(search.toLowerCase());
    const matchesSubject = selectedSubject === "all" || att.subject === selectedSubject;

    let matchesMastery = true;
    if (masteryFilter === "high") matchesMastery = att.percentage >= 75;
    else if (masteryFilter === "passing") matchesMastery = att.percentage >= 40 && att.percentage < 75;
    else if (masteryFilter === "low") matchesMastery = att.percentage < 40;

    return matchesSearch && matchesSubject && matchesMastery;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 75) return "#16a34a"; // green
    if (pct >= 40) return "var(--gold)"; // gold
    return "#dc2626"; // red
  };

  const getScoreBadge = (pct: number) => {
    if (pct >= 75) {
      return (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(22, 163, 74, 0.1)",
            color: "#16a34a",
            border: "1px solid rgba(22, 163, 74, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <CheckCircle2 size={11} /> High Mastery
        </span>
      );
    }
    if (pct >= 40) {
      return (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(217, 119, 6, 0.1)",
            color: "var(--gold)",
            border: "1px solid rgba(217, 119, 6, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <TrendingUp size={11} /> Qualified
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 700,
          background: "rgba(220, 38, 38, 0.1)",
          color: "#dc2626",
          border: "1px solid rgba(220, 38, 38, 0.25)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <AlertTriangle size={11} /> Needs Practice
      </span>
    );
  };

  return (
    <div className="gurukul-page">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header__breadcrumb">Student Portal / Exam Archives</div>
        <h1 className="page-header__title">
          My Attempts & Exam History <span className="shloka">(इतिहास)</span>
        </h1>
        <p className="page-header__subtitle">
          Detailed archive of all your submitted assessments. Review step-by-step solutions, identify weak areas, and retake tests.
        </p>
      </div>

      {/* ── Performance KPI Summary ─────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div className="lens-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
              Total Assessments
            </span>
            <div style={{ padding: 6, borderRadius: "var(--radius-sm)", background: "rgba(249, 115, 22, 0.1)" }}>
              <Trophy size={18} color="var(--terracotta)" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>
            {loading ? "..." : stats?.total_quizzes_attempted || 0}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
            Completed evaluations
          </div>
        </div>

        <div className="lens-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
              Average Mastery
            </span>
            <div style={{ padding: 6, borderRadius: "var(--radius-sm)", background: "rgba(22, 163, 74, 0.1)" }}>
              <Target size={18} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: getScoreColor(stats?.average_percentage || 0) }}>
            {loading ? "..." : `${stats?.average_percentage || 0}%`}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
            Cumulative average score
          </div>
        </div>

        <div className="lens-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
              Peak Performance
            </span>
            <div style={{ padding: 6, borderRadius: "var(--radius-sm)", background: "rgba(217, 119, 6, 0.1)" }}>
              <Award size={18} color="var(--gold)" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)" }}>
            {loading ? "..." : `${stats?.highest_percentage || 0}%`}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
            Highest score achieved
          </div>
        </div>

        <div className="lens-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
              Practice Invested
            </span>
            <div style={{ padding: 6, borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.1)" }}>
              <Clock size={18} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>
            {loading ? "..." : `${stats?.total_time_spent_minutes || 0}m`}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
            Active testing duration
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <input
              type="text"
              className="gk-input"
              placeholder="Search attempts by title, subject, or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-3)",
              }}
            />
          </div>

          {/* Mastery Level Filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginRight: 4 }}>Mastery:</span>
            <button
              onClick={() => setMasteryFilter("all")}
              className={`chip-badge ${masteryFilter === "all" ? "chip-badge--accent" : ""}`}
              style={{ cursor: "pointer", padding: "6px 12px" }}
            >
              All
            </button>
            <button
              onClick={() => setMasteryFilter("high")}
              className={`chip-badge ${masteryFilter === "high" ? "chip-badge--accent" : ""}`}
              style={{ cursor: "pointer", padding: "6px 12px" }}
            >
              High (≥75%)
            </button>
            <button
              onClick={() => setMasteryFilter("passing")}
              className={`chip-badge ${masteryFilter === "passing" ? "chip-badge--accent" : ""}`}
              style={{ cursor: "pointer", padding: "6px 12px" }}
            >
              Qualified (40-74%)
            </button>
            <button
              onClick={() => setMasteryFilter("low")}
              className={`chip-badge ${masteryFilter === "low" ? "chip-badge--accent" : ""}`}
              style={{ cursor: "pointer", padding: "6px 12px" }}
            >
              Needs Practice (&lt;40%)
            </button>
          </div>
        </div>

        {/* Subject Filter Chips */}
        {subjects.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginRight: 4 }}>Subject:</span>
            <button
              onClick={() => setSelectedSubject("all")}
              className={`chip-badge ${selectedSubject === "all" ? "chip-badge--accent" : ""}`}
              style={{ cursor: "pointer", padding: "4px 10px", fontSize: 11.5 }}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`chip-badge ${selectedSubject === sub ? "chip-badge--accent" : ""}`}
                style={{ cursor: "pointer", padding: "4px 10px", fontSize: 11.5 }}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Attempt Records List ────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)" }}>
          Loading your exam archives...
        </div>
      ) : attempts.length === 0 ? (
        <div className="lens-card empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <History size={48} color="var(--terracotta)" style={{ opacity: 0.8 }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            No Exam Attempts Yet
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 420, margin: "0 auto 20px" }}>
            You haven't attempted any quizzes yet. Take your first test in the Quiz Arena to start building your academic record.
          </p>
          <button
            onClick={() => onNavigateToQuiz()}
            className="gk-btn gk-btn--primary"
            style={{ margin: "0 auto" }}
          >
            Go to Quiz Arena (परीक्षा) <ArrowRight size={15} />
          </button>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="lens-card empty-state" style={{ padding: "36px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            No attempts match your filters
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>
            Try adjusting your search keywords or mastery filter.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedSubject("all");
              setMasteryFilter("all");
            }}
            className="gk-btn gk-btn--secondary gk-btn--sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredAttempts.map((attempt) => {
            const dateStr = attempt.created_at
              ? new Date(attempt.created_at).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <div
                key={attempt.id}
                className="lens-card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  transition: "all 0.15s ease",
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="chip-badge chip-badge--accent" style={{ fontSize: 11 }}>
                        {attempt.grade || "Class 12"}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
                        {attempt.subject || "General Assessment"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-3)", opacity: 0.7 }}>•</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{dateStr}</span>
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                      {attempt.title
                        ? attempt.title.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
                        : `${attempt.subject || "Quiz"} Assessment`}
                    </h3>
                  </div>

                  {/* Status & Mastery Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {getScoreBadge(attempt.percentage)}
                  </div>
                </div>

                {/* Score & Metrics Bar */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: 12,
                    padding: "12px 14px",
                    background: "var(--surface-muted)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>
                      Score
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                      {attempt.score} <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>/ {attempt.total_marks}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>
                      Percentage
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: getScoreColor(attempt.percentage), marginTop: 2 }}>
                      {attempt.percentage}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>
                      Time Taken
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                      {formatDuration(attempt.time_spent_seconds)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                  <button
                    onClick={() => onNavigateToAttempt(attempt.id)}
                    className="gk-btn gk-btn--primary gk-btn--sm"
                    style={{ gap: 6 }}
                    title="Review your submission with answers and AI solutions"
                  >
                    <BookOpen size={14} /> View Detailed Breakdown & Solutions
                  </button>

                  <button
                    onClick={() => onNavigateToQuiz(attempt.exam_id)}
                    className="gk-btn gk-btn--secondary gk-btn--sm"
                    style={{ gap: 6 }}
                    title="Retake this assessment to improve your score"
                  >
                    <RefreshCw size={14} /> Retake Quiz
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
