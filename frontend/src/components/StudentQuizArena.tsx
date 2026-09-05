"use client";

import { useCallback, useEffect, useState } from "react";
import { studentApi } from "@/lib/api";
import type { QuizListItem } from "@/types/auth";
import { Search, Sparkles, Clock, HelpCircle, CheckCircle2, Play, RefreshCw, Calendar, Hourglass } from "lucide-react";
import QuizCountdown from "./QuizCountdown";

interface StudentQuizArenaProps {
  onSelectQuiz: (quizId: string) => void;
}

export default function StudentQuizArena({ onSelectQuiz }: StudentQuizArenaProps) {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [unlockedQuizIds, setUnlockedQuizIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studentApi.listQuizzes();
      setQuizzes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

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
        <div className="page-header__breadcrumb">Student Portal / Practice & Quizzes</div>
        <h1 className="page-header__title">Practice Quizzes</h1>
        <p className="page-header__subtitle">
          Practice questions online and get instant results and step-by-step solutions.
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
            className={`chip-badge ${selectedSubject === "all" ? "chip-badge--accent" : ""}`}
            style={{ padding: "6px 14px", cursor: "pointer" }}
          >
            All Subjects
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`chip-badge ${selectedSubject === sub ? "chip-badge--accent" : ""}`}
              style={{ padding: "6px 14px", cursor: "pointer" }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quizzes Grid ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)" }}>
          <span
            className="spin"
            style={{
              display: "inline-block",
              width: 24,
              height: 24,
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              marginBottom: 12,
            }}
          />
          <div>Retrieving available quizzes...</div>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="lens-card" style={{ padding: 36, textAlign: "center", marginTop: 20 }}>
          <Sparkles size={36} style={{ color: "var(--accent)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No Quizzes Available</h3>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            {quizzes.length === 0
              ? "Your teachers or admin have not published any quizzes yet. Check back soon!"
              : "No quizzes match your current search filters."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="lens-card"
              style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
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
                  }}
                >
                  <span className="chip-badge chip-badge--forest" style={{ fontSize: 10 }}>
                    <CheckCircle2 size={11} /> Best: {quiz.best_score}%
                  </span>
                </div>
              )}

              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <span className="chip-badge chip-badge--accent">
                    {quiz.grade}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  {quiz.subject}
                </h3>

                {quiz.instructions && (
                  <p
                    style={{
                      fontSize: 12.5,
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

                {/* Schedule / Status Badges */}
                {(() => {
                  const isScheduled =
                    !unlockedQuizIds.has(quiz.id) &&
                    quiz.schedule_start_at &&
                    new Date(quiz.schedule_start_at).getTime() > Date.now();
                  const isExpired =
                    quiz.schedule_end_at &&
                    new Date(quiz.schedule_end_at).getTime() <= Date.now();

                  if (isScheduled) {
                    return (
                      <div
                        style={{
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 11.5,
                          fontWeight: 600,
                          marginBottom: 14,
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "#2563eb",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Calendar size={13} />
                          <span>Opens: {new Date(quiz.schedule_start_at!).toLocaleString()}</span>
                        </div>
                        <div style={{ color: "#2563eb", fontWeight: 700 }}>
                          <QuizCountdown
                            targetDate={quiz.schedule_start_at!}
                            prefix="Starts in: "
                            onComplete={() => setUnlockedQuizIds((prev) => new Set(prev).add(quiz.id))}
                          />
                        </div>
                      </div>
                    );
                  }

                  if (isExpired) {
                    return (
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
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#dc2626",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <Clock size={13} />
                        <span>Closed / Expired</span>
                      </div>
                    );
                  }

                  if (quiz.schedule_end_at) {
                    return (
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
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#dc2626",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <Hourglass size={13} />
                        <span>Deadline: {new Date(quiz.schedule_end_at).toLocaleString()}</span>
                      </div>
                    );
                  }

                  return null;
                })()}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    padding: "10px 12px",
                    background: "var(--surface-sunken)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: 18,
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <HelpCircle size={14} color="var(--accent)" />
                    <span><strong>{quiz.num_questions}</strong> Questions</span>
                  </div>
                  <div style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={14} color="var(--gold)" />
                    <span><strong>{quiz.duration_minutes}</strong> Min</span>
                  </div>
                </div>
              </div>

              {(() => {
                const isScheduled = Boolean(
                  !unlockedQuizIds.has(quiz.id) &&
                  quiz.schedule_start_at &&
                  new Date(quiz.schedule_start_at).getTime() > Date.now()
                );
                const isExpired = Boolean(
                  quiz.schedule_end_at &&
                  new Date(quiz.schedule_end_at).getTime() <= Date.now()
                );
                const isDisabled = isScheduled || isExpired;

                return (
                  <button
                    onClick={() => onSelectQuiz(quiz.id)}
                    disabled={isDisabled}
                    className={`gk-btn ${quiz.attempted ? "gk-btn--secondary" : "gk-btn--primary"}`}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      opacity: isDisabled ? 0.65 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {isScheduled ? (
                      <>
                        <Clock size={14} /> Scheduled Quiz
                      </>
                    ) : isExpired ? (
                      "Quiz Closed"
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
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
