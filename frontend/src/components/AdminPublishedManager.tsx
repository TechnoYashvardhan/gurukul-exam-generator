"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Eye,
  PauseCircle,
  PlayCircle,
  Award,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Calendar,
  Sparkles,
  School,
  TrendingUp,
  BarChart3,
  HelpCircle,
  Check,
  RefreshCw
} from "lucide-react";
import { adminApi } from "@/lib/api";
import {
  PublishedQuizSummary,
  PublishedQuizDetailResponse,
  PublishedQuizStudentAttempt,
  ClassSummary
} from "@/types/auth";
import Toast, { ToastVariant } from "./Toast";
import MathText from "./MathText";

export default function AdminPublishedManager() {
  const [quizzes, setQuizzes] = useState<PublishedQuizSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "scheduled" | "closed">("all");
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // Deep dive detail modal
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizDetail, setQuizDetail] = useState<PublishedQuizDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  // Unpublish / Delete states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [quizList, classList] = await Promise.all([
        adminApi.listPublishedQuizzes(),
        adminApi.listClasses(),
      ]);
      setQuizzes(quizList);
      setClasses(classList);
    } catch (e: any) {
      setToast({ message: e.message || "Failed to load published quizzes.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenDetail(quizId: string) {
    setSelectedQuizId(quizId);
    setLoadingDetail(true);
    try {
      const detail = await adminApi.getPublishedQuizDetail(quizId);
      setQuizDetail(detail);
    } catch (e: any) {
      setToast({ message: e.message || "Failed to load quiz details.", variant: "error" });
      setSelectedQuizId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleUnpublish(quiz: PublishedQuizSummary) {
    if (!window.confirm(`Unpublish "${quiz.title}"? Students will no longer see this quiz in their arena.`)) {
      return;
    }
    setActionLoadingId(quiz.id);
    try {
      await adminApi.unpublishQuiz(quiz.id);
      setToast({
        message: `⏸️ "${quiz.title}" unpublished successfully from Student Arena.`,
        variant: "success",
      });
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      if (selectedQuizId === quiz.id) {
        setSelectedQuizId(null);
        setQuizDetail(null);
      }
    } catch (e: any) {
      setToast({ message: e.message || "Failed to unpublish quiz.", variant: "error" });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(quiz: PublishedQuizSummary) {
    if (!window.confirm(`Permanently delete "${quiz.title}" and all its ${quiz.total_attempts} student submission records? This cannot be undone.`)) {
      return;
    }
    setActionLoadingId(quiz.id);
    try {
      await adminApi.deletePublishedQuiz(quiz.id);
      setToast({
        message: `🗑️ Quiz deleted permanently.`,
        variant: "success",
      });
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      if (selectedQuizId === quiz.id) {
        setSelectedQuizId(null);
        setQuizDetail(null);
      }
    } catch (e: any) {
      setToast({ message: e.message || "Failed to delete quiz.", variant: "error" });
    } finally {
      setActionLoadingId(null);
    }
  }

  const cleanTitle = (raw: string) => (raw || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();

  // Filtered quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    const titleClean = cleanTitle(q.title).toLowerCase();
    const matchesSearch =
      titleClean.includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.target_class_name.toLowerCase().includes(search.toLowerCase());

    const matchesClass =
      selectedClassFilter === "all" ||
      (selectedClassFilter === "global" && !q.target_class_id) ||
      q.target_class_id === selectedClassFilter;

    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = q.is_active_window && !q.status_label.includes("Closed");
    } else if (statusFilter === "scheduled") {
      matchesStatus = !q.is_active_window && q.status_label.includes("Scheduled");
    } else if (statusFilter === "closed") {
      matchesStatus = q.status_label.includes("Closed");
    }

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Aggregated overview stats
  const totalPublished = quizzes.length;
  const totalSubmissions = quizzes.reduce((acc, q) => acc + q.total_attempts, 0);
  const overallAvg =
    totalSubmissions > 0
      ? Math.round(
          quizzes.reduce((acc, q) => acc + q.avg_score_percentage * q.total_attempts, 0) /
            totalSubmissions
        )
      : 0;
  const liveCount = quizzes.filter((q) => q.is_active_window && !q.status_label.includes("Closed")).length;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{ marginBottom: 16 }}>
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header__breadcrumb">Prakashan / Published Quizzes & Analytics</div>
        <h1 className="page-header__title">Published Quizzes & Performance Hub</h1>
        <div className="page-header__ornament">
          <div className="page-header__ornament-line" />
          <div className="page-header__ornament-diamond" />
          <div className="page-header__ornament-line--right" />
        </div>
        <p className="page-header__subtitle">
          Monitor live test delivery, analyze student performance across cohorts, and manage active parikshas
        </p>
      </div>

      {/* ── Metric Highlights Banner ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Total Published
            </span>
            <Send size={18} color="var(--terracotta)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-1)" }}>{totalPublished}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            ⚡ {liveCount} Live currently in Student Arena
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Student Attempts
            </span>
            <Users size={18} color="var(--gold-dark)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-1)" }}>{totalSubmissions}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Completed online evaluations
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Overall Score Avg
            </span>
            <TrendingUp size={18} color="var(--forest)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--forest)" }}>{overallAvg}%</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Weighted student average
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
              Target Cohorts
            </span>
            <School size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{classes.length}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Enrolled academic batches
          </div>
        </div>
      </div>

      {/* ── Filters and Controls Bar ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          background: "var(--surface)",
          padding: "12px 16px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <input
            type="text"
            className="gk-input"
            placeholder="Search by quiz title, subject, or cohort..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34, height: 36, fontSize: 13 }}
          />
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-3)",
            }}
          />
        </div>

        {/* Cohort filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="gk-input"
            style={{ fontSize: 12.5, height: 36, padding: "0 10px", width: "auto" }}
          >
            <option value="all">👥 All Cohorts</option>
            <option value="global">🌍 Global (All Students)</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Status filter buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`type-pill ${statusFilter === "all" ? "type-pill--active" : ""}`}
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`type-pill ${statusFilter === "active" ? "type-pill--active" : ""}`}
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              ⚡ Live
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("scheduled")}
              className={`type-pill ${statusFilter === "scheduled" ? "type-pill--active" : ""}`}
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              🗓️ Scheduled
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("closed")}
              className={`type-pill ${statusFilter === "closed" ? "type-pill--active" : ""}`}
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              Closed
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="gk-btn gk-btn--secondary"
            title="Refresh List"
            style={{ height: 36, padding: "0 10px" }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Quizzes List / Table ───────────────────────────────────────────── */}
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
          <div>Loading published quizzes and student records...</div>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="empty-state" style={{ padding: "48px 24px", background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)" }}>
          <Send size={44} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>No Published Quizzes Found</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 440, margin: "0 auto" }}>
            Generate a quiz in Rachna or select one from Itihas (History), then click &quot;Publish to Students&quot; to distribute it to cohorts.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredQuizzes.map((quiz) => {
            const isLive = quiz.is_active_window && !quiz.status_label.includes("Closed");
            const isScheduled = !quiz.is_active_window && quiz.status_label.includes("Scheduled");

            return (
              <div
                key={quiz.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: "var(--shadow-sm)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Top Row: Title, Cohort, Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "var(--accent-light)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      📜
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>
                          {cleanTitle(quiz.title)}
                        </h3>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 100,
                            background: "var(--gold-soft)",
                            color: "var(--gold-dark)",
                            fontWeight: 700,
                          }}
                        >
                          {quiz.subject} • {quiz.grade}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 12, color: "var(--text-3)", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <School size={13} color="var(--forest)" />
                          <strong>Cohort:</strong> {quiz.target_class_name}
                        </span>
                        <span>•</span>
                        <span>{quiz.num_questions} Questions ({quiz.total_marks} Marks)</span>
                        <span>•</span>
                        <span>{quiz.duration_minutes} Mins Duration</span>
                        <span>•</span>
                        <span>Created: {new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 100,
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        background: isLive
                          ? "rgba(34, 197, 94, 0.12)"
                          : isScheduled
                          ? "rgba(59, 130, 246, 0.12)"
                          : "rgba(239, 68, 68, 0.12)",
                        color: isLive ? "#16a34a" : isScheduled ? "#2563eb" : "#dc2626",
                        border: `1px solid ${isLive ? "rgba(34, 197, 94, 0.3)" : isScheduled ? "rgba(59, 130, 246, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      }}
                    >
                      {isLive ? "⚡ Live Now" : isScheduled ? `🗓️ ${quiz.status_label}` : "⚠️ Closed"}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Student Analytics Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                    background: "var(--surface-sunken)",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Total Attempts</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>
                      {quiz.total_attempts} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>({quiz.unique_students_count} students)</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Average Score</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: quiz.avg_score_percentage >= 60 ? "var(--forest)" : "var(--terracotta)" }}>
                      {quiz.avg_score_percentage}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Pass Rate (≥40%)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gold-dark)" }}>
                      {quiz.pass_rate_percentage}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Score Range</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)" }}>
                      {quiz.lowest_percentage}% – {quiz.highest_percentage}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Avg Time Taken</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)" }}>
                      {quiz.avg_time_spent_seconds > 0 ? `${Math.round(quiz.avg_time_spent_seconds / 60)} mins` : "—"}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    {quiz.schedule_start_at && (
                      <span>Opens: {new Date(quiz.schedule_start_at).toLocaleString()} • </span>
                    )}
                    {quiz.schedule_end_at ? (
                      <span>Deadline: {new Date(quiz.schedule_end_at).toLocaleString()}</span>
                    ) : (
                      <span>No closing deadline</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(quiz.id)}
                      className="gk-btn gk-btn--primary"
                      style={{ fontSize: 12.5, height: 32, padding: "0 12px" }}
                    >
                      <Eye size={14} /> View Submissions ({quiz.total_attempts})
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUnpublish(quiz)}
                      disabled={actionLoadingId === quiz.id}
                      className="gk-btn gk-btn--secondary"
                      style={{ fontSize: 12.5, height: 32, padding: "0 12px", color: "var(--terracotta)" }}
                      title="Unpublish from Student Arena"
                    >
                      <PauseCircle size={14} /> Unpublish
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(quiz)}
                      disabled={actionLoadingId === quiz.id}
                      className="gk-btn"
                      style={{
                        fontSize: 12.5,
                        height: 32,
                        padding: "0 10px",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#dc2626",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                      title="Delete Quiz and Attempts"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Student Submissions Deep-Dive Modal ─────────────────────────────── */}
      {selectedQuizId && (
        <div className="gk-modal-backdrop" onClick={() => setSelectedQuizId(null)}>
          <div
            className="gk-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 840, width: "95vw", maxHeight: "90vh", padding: "28px 24px", overflowY: "auto" }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                  }}
                >
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
                    {quizDetail ? cleanTitle(quizDetail.quiz.title) : "Quiz Performance Dossier"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                    Cohort: {quizDetail?.quiz.target_class_name} • Total Submissions: {quizDetail?.attempts.length || 0}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedQuizId(null)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {loadingDetail ? (
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
                <div>Loading student evaluation breakdown...</div>
              </div>
            ) : !quizDetail || quizDetail.attempts.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 20px" }}>
                <Users size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <h4 style={{ margin: 0, fontSize: 16 }}>No Submissions Yet</h4>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                  Students from {quizDetail?.quiz.target_class_name} have not submitted answers for this quiz yet.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Submission Leaderboard Table */}
                <div style={{ overflowX: "auto" }}>
                  <table className="roster-table" style={{ width: "100%", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Scholar ID</th>
                        <th>Student Name</th>
                        <th>Class / Cohort</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Time Spent</th>
                        <th>Submitted At</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizDetail.attempts.map((att) => {
                        const isExpanded = expandedAttemptId === att.attempt_id;
                        return (
                          <React.Fragment key={att.attempt_id}>
                            <tr style={{ background: isExpanded ? "var(--surface-sunken)" : "transparent" }}>
                              <td>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                  {att.scholar_id}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{att.student_name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{att.student_email}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{att.class_name}</span>
                              </td>
                              <td>
                                <strong>{att.score}</strong> / {att.total_marks}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: att.percentage >= 75 ? "var(--forest)" : att.percentage >= 40 ? "var(--gold-dark)" : "#dc2626",
                                  }}
                                >
                                  {att.percentage}%
                                </span>
                              </td>
                              <td>{Math.round(att.time_spent_seconds / 60)}m {att.time_spent_seconds % 60}s</td>
                              <td>{new Date(att.submitted_at).toLocaleDateString()}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setExpandedAttemptId(isExpanded ? null : att.attempt_id)}
                                  className="gk-btn gk-btn--secondary"
                                  style={{ fontSize: 11, padding: "3px 8px", height: 26 }}
                                >
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                  {isExpanded ? "Hide" : "Answers"}
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Question Feedback Breakdown */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} style={{ padding: "14px 16px", background: "var(--surface-sunken)" }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, color: "var(--text-1)" }}>
                                    📝 Question-by-Question Submission Breakdown for {att.student_name}:
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {att.questions_feedback.map((qf, qIdx) => (
                                      <div
                                        key={qIdx}
                                        style={{
                                          padding: "10px 14px",
                                          borderRadius: "var(--radius-md)",
                                          border: `1px solid ${qf.is_correct ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                          background: qf.is_correct ? "rgba(34, 197, 94, 0.04)" : "rgba(239, 68, 68, 0.04)",
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                                            Q{qf.question_no || qIdx + 1}. <MathText content={qf.text} />
                                          </div>
                                          <span
                                            style={{
                                              fontSize: 11,
                                              padding: "2px 8px",
                                              borderRadius: 100,
                                              fontWeight: 700,
                                              background: qf.is_correct ? "var(--forest-light)" : "var(--terracotta-light)",
                                              color: qf.is_correct ? "var(--forest)" : "var(--terracotta)",
                                            }}
                                          >
                                            {qf.marks_awarded ?? (qf as any).score_awarded ?? (qf.is_correct ? 1 : 0)} / {qf.max_marks ?? (qf as any).marks ?? 1} Marks
                                          </span>
                                        </div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginTop: 6 }}>
                                          <div style={{ color: qf.is_correct ? "var(--forest)" : "var(--terracotta)" }}>
                                            <strong>Student Answer <span className="shloka" style={{ fontWeight: 600, fontSize: 11 }}>(शिष्य)</span>:</strong> {qf.user_answer || "—"}
                                          </div>
                                          <div style={{ color: "var(--forest)" }}>
                                            <strong>Correct Answer:</strong> {qf.correct_answer || "—"}
                                          </div>
                                        </div>

                                        {(qf.explanation || (qf as any).evaluation_reason) && (
                                          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6, fontStyle: "normal" }}>
                                            💡 {qf.explanation || (qf as any).evaluation_reason}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
