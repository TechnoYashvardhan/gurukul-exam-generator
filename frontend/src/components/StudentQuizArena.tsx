"use client";

import { useEffect, useState } from "react";
import { studentApi } from "@/lib/api";
import type { QuizListItem } from "@/types/auth";
import { Search, Sparkles, Clock, HelpCircle, CheckCircle2, Play, RefreshCw, Filter } from "lucide-react";

interface StudentQuizArenaProps {
  onSelectQuiz: (quizId: string) => void;
}

export default function StudentQuizArena({ onSelectQuiz }: StudentQuizArenaProps) {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    setLoading(true);
    try {
      const data = await studentApi.listQuizzes();
      setQuizzes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const subjects = Array.from(new Set(quizzes.map((q) => q.subject))).filter(Boolean);

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.grade.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = selectedSubject === "all" || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="gurukul-page">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header__breadcrumb">Pariksha / Quiz Arena</div>
        <h1 className="page-header__title">Interactive Quiz Arena</h1>
        <div className="page-header__ornament">
          <div className="page-header__ornament-line" />
          <div className="page-header__ornament-diamond" />
          <div className="page-header__ornament-line--right" />
        </div>
        <p className="page-header__subtitle">
          Test your mastery online with immediate automated evaluation and feedback
        </p>
      </div>

      {/* ── Filter & Search Bar ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 28,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <input
            type="text"
            className="gk-input"
            placeholder="Search by subject or class..."
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

        {/* Subject Filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedSubject("all")}
            className={`type-pill ${selectedSubject === "all" ? "type-pill--active" : ""}`}
            style={{ padding: "6px 14px" }}
          >
            All Subjects
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`type-pill ${selectedSubject === sub ? "type-pill--active" : ""}`}
              style={{ padding: "6px 14px" }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quizzes Grid ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)" }}>
          <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", marginBottom: 12 }} />
          <div>Retrieving available quizzes from the temple...</div>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <span className="empty-state__icon"><Sparkles size={48} /></span>
          <p className="empty-state__title">No Quizzes Available</p>
          <p className="empty-state__sub">
            {quizzes.length === 0
              ? "Your teachers or admin have not published any quizzes yet. Check back soon!"
              : "No quizzes match your current search filters."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                padding: 24,
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {quiz.attempted && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--forest)",
                    background: "var(--forest-light)",
                    border: "1px solid var(--forest)",
                    padding: "2px 8px",
                    borderRadius: 100,
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>Best: {quiz.best_score}%</span>
                </div>
              )}

              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      padding: "2px 8px",
                      borderRadius: 100,
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent-mid)",
                      fontWeight: 600,
                    }}
                  >
                    {quiz.grade}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-1)",
                    marginBottom: 8,
                  }}
                >
                  {quiz.subject}
                </h3>

                {quiz.instructions && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      marginBottom: 16,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {quiz.instructions.replace(/<[^>]*>?/gm, "")}
                  </p>
                )}

                {quiz.status_label && (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: quiz.is_active_window === false && quiz.status_label.includes("Scheduled")
                        ? "rgba(59, 130, 246, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                      color: quiz.is_active_window === false && quiz.status_label.includes("Scheduled")
                        ? "#2563eb"
                        : "#dc2626",
                      border: `1px solid ${quiz.is_active_window === false && quiz.status_label.includes("Scheduled") ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                    }}
                  >
                    <Clock size={13} />
                    <span>{quiz.status_label}</span>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    padding: "12px 14px",
                    background: "var(--surface-sunken)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: 20,
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <HelpCircle size={14} color="var(--accent)" />
                    <span><strong>{quiz.num_questions}</strong> Questions</span>
                  </div>
                  <div style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={14} color="var(--gold)" />
                    <span><strong>{quiz.duration_minutes}</strong> Minutes</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectQuiz(quiz.id)}
                disabled={quiz.is_active_window === false}
                className={`gk-btn ${quiz.attempted ? "gk-btn--secondary" : "gk-btn--primary"}`}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  opacity: quiz.is_active_window === false ? 0.6 : 1,
                  cursor: quiz.is_active_window === false ? "not-allowed" : "pointer",
                }}
              >
                {quiz.is_active_window === false ? (
                  quiz.status_label?.includes("Closed") ? "Quiz Closed" : "Scheduled Quiz"
                ) : quiz.attempted ? (
                  <>
                    <RefreshCw size={14} /> Retake Quiz
                  </>
                ) : (
                  <>
                    <Play size={14} /> Attempt Quiz
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
