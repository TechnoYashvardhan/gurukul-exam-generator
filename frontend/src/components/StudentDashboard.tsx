"use client";

import { useEffect, useState } from "react";
import { studentApi } from "@/lib/api";
import type { QuizListItem, StudentStats } from "@/types/auth";
import {
  Trophy,
  Target,
  Clock,
  Award,
  Play,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Flame,
  KeyRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ChangePasswordModal from "./ChangePasswordModal";

interface StudentDashboardProps {
  onNavigateToQuiz: (quizId?: string) => void;
  onNavigateToAttempt?: (attemptId: string) => void;
}

export default function StudentDashboard({ onNavigateToQuiz, onNavigateToAttempt }: StudentDashboardProps) {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, quizList] = await Promise.all([
        studentApi.getStats().catch(() => ({
          total_quizzes_attempted: 0,
          average_percentage: 0,
          highest_percentage: 0,
          total_time_spent_minutes: 0,
          recent_attempts: [],
        })),
        studentApi.listQuizzes().catch(() => []),
      ]);
      setStats(statsData);
      setQuizzes(quizList);
    } finally {
      setLoading(false);
    }
  }

  const unattemptedQuizzes = quizzes.filter((q) => !q.attempted);

  return (
    <div className="gurukul-page">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header" style={{ position: "relative" }}>
        <div style={{ position: "absolute", right: 0, top: 0 }}>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="gk-btn gk-btn--secondary"
            style={{ fontSize: 12, height: 32, padding: "0 12px", gap: 6 }}
          >
            <KeyRound size={14} /> Change Password
          </button>
        </div>
        <div className="page-header__breadcrumb">Aashram / Student Sanctuary</div>
        <h1 className="page-header__title">Welcome, Young Shishya</h1>
        <div className="page-header__ornament">
          <div className="page-header__ornament-line" />
          <div className="page-header__ornament-diamond" />
          <div className="page-header__ornament-line--right" />
        </div>
        <p className="page-header__subtitle">
          "Vidya Dadati Vinayam" — Knowledge bestows humility, humility brings worthiness.
        </p>
      </div>

      {/* ── Statistics Grid ──────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--accent-light)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trophy size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Quizzes Attempted
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
              {stats?.total_quizzes_attempted ?? 0}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--forest-light)",
              color: "var(--forest)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Average Mastery
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
              {stats?.average_percentage ?? 0}%
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--gold-light)",
              color: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Best Performance
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
              {stats?.highest_percentage ?? 0}%
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--terracotta-light)",
              color: "var(--terracotta)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Time Invested
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
              {stats?.total_time_spent_minutes ?? 0}m
            </div>
          </div>
        </div>
      </div>

      {/* ── Recommended Quizzes ──────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="ornament-heading" style={{ marginBottom: 0 }}>
            <Sparkles size={16} /> Recommended Quizzes
          </div>
          <button
            onClick={() => onNavigateToQuiz()}
            className="gk-btn gk-btn--secondary gk-btn--sm"
          >
            Explore All <ArrowRight size={14} />
          </button>
        </div>

        {unattemptedQuizzes.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}>
            <span className="empty-state__icon"><CheckCircle2 size={36} color="var(--forest)" /></span>
            <p className="empty-state__title">You're All Caught Up!</p>
            <p className="empty-state__sub">
              You've attempted all available quizzes. Great discipline, scholar!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {unattemptedQuizzes.slice(0, 3).map((quiz) => (
              <div
                key={quiz.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: "var(--accent-light)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-mid)",
                      }}
                    >
                      {quiz.grade}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {quiz.duration_minutes}m
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
                    {quiz.subject}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 16 }}>
                    {quiz.num_questions} Questions · {quiz.total_marks} Marks
                  </p>
                </div>

                <button
                  onClick={() => onNavigateToQuiz(quiz.id)}
                  className="gk-btn gk-btn--primary gk-btn--sm"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Play size={14} /> Start Quiz Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Attempts Table ───────────────────────────── */}
      <div>
        <div className="ornament-heading">
          <BookOpen size={16} /> Recent Performance Record
        </div>

        {!stats || stats.recent_attempts.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}>
            <span className="empty-state__icon"><Trophy size={36} /></span>
            <p className="empty-state__title">No tests completed yet</p>
            <p className="empty-state__sub">Take your first quiz to record your progress.</p>
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-sunken)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-3)", fontWeight: 600 }}>Date</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-3)", fontWeight: 600 }}>Subject / Quiz</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-3)", fontWeight: 600 }}>Score</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-3)", fontWeight: 600 }}>Mastery</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-3)", fontWeight: 600 }}>Time Spent</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-3)", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_attempts.map((att) => (
                  <tr key={att.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-2)", whiteSpace: "nowrap" }}>
                      {new Date(att.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-1)" }}>
                        {att.subject || "General Quiz"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {att.grade || "All Grades"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-1)" }}>
                      {att.score} / {att.total_marks}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: att.percentage >= 75 ? "var(--forest)" : att.percentage >= 50 ? "var(--gold)" : "var(--terracotta)",
                        }}
                      >
                        {att.percentage}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                      {Math.round(att.time_spent_seconds / 60)}m {att.time_spent_seconds % 60}s
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        {onNavigateToAttempt && (
                          <button
                            onClick={() => onNavigateToAttempt(att.id)}
                            className="gk-btn gk-btn--primary gk-btn--sm"
                            style={{ padding: "4px 10px", fontSize: 11 }}
                            title="View Question-by-Question Breakdown and Model Answers"
                          >
                            <BookOpen size={12} /> View Breakdown
                          </button>
                        )}
                        <button
                          onClick={() => onNavigateToQuiz(att.exam_id)}
                          className="gk-btn gk-btn--secondary gk-btn--sm"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          title="Retake this quiz"
                        >
                          <RefreshCw size={12} /> Retake
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sanskrit Wisdom Footer ──────────────────────────── */}
      <div
        style={{
          marginTop: 48,
          padding: "24px 20px",
          background: "var(--surface-sunken)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          textAlign: "center",
        }}
      >
        <Flame size={20} color="var(--terracotta)" style={{ margin: "0 auto 8px" }} />
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontStyle: "italic", color: "var(--text-1)", marginBottom: 4 }}>
          "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः । न हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः ॥"
        </p>
        <p style={{ fontSize: 12, color: "var(--text-3)" }}>
          Success is achieved through persistent effort and practice, not mere wishing.
        </p>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
