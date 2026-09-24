"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { studentApi } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import type { GeneratedExam, Question } from "@/types/template";
import type { QuizResult, ViolationEvent } from "@/types/auth";
import MathText from "@/components/MathText";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  Award,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Check,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Lock,
  AlertOctagon,
} from "lucide-react";
import Toast, { ToastVariant } from "./Toast";
import MatchQuestionView from "./MatchQuestionView";

interface QuizPlayerProps {
  quizId?: string;
  attemptId?: string;
  onExit: () => void;
}

function formatAnswerDisplay(ans: any, options?: any[] | null) {
  if (ans === undefined || ans === null || ans === "") return "(No response provided)";
  if (options && Array.isArray(options)) {
    const matched = options.find(
      (o) => String(o.key).trim().toUpperCase() === String(ans).trim().toUpperCase()
    );
    if (matched) {
      return `(${matched.key}) ${matched.text}`;
    }
  }
  if (typeof ans === "object") {
    return JSON.stringify(ans);
  }
  return String(ans);
}

export default function QuizPlayer({ quizId, attemptId, onExit }: QuizPlayerProps) {
  const { user } = useAuth();
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // ── Kavach Anti-Cheating & Proctoring Guardian State ──────────────────
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [activeWarningModal, setActiveWarningModal] = useState<{
    warningNumber: number;
    title: string;
    reason: string;
    timestamp: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKavachBadge, setShowKavachBadge] = useState(true);

  // Ref to track latest state inside event listeners without stale closures
  const stateRef = useRef({
    exam,
    result,
    submitting,
    warningsCount,
    violations,
    answers,
    timeSpent,
  });

  useEffect(() => {
    stateRef.current = {
      exam,
      result,
      submitting,
      warningsCount,
      violations,
      answers,
      timeSpent,
    };
  }, [exam, result, submitting, warningsCount, violations, answers, timeSpent]);

  const autosaveKey = quizId ? `gurukul_quiz_progress_${quizId}` : null;

  // Load exam or past attempt review
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (attemptId) {
          const attemptData = await studentApi.getAttempt(attemptId);
          setResult(attemptData);
        } else if (quizId) {
          const data = await studentApi.getQuiz(quizId);
          setExam(data);
          const defaultDuration = (data.duration_minutes || 30) * 60;

          // Check for autosaved in-progress session
          let restored = false;
          if (typeof window !== "undefined" && autosaveKey) {
            try {
              const savedRaw = sessionStorage.getItem(autosaveKey);
              if (savedRaw) {
                const saved = JSON.parse(savedRaw);
                if (saved.answers && typeof saved.answers === "object") {
                  setAnswers(saved.answers);
                  if (typeof saved.timeRemaining === "number" && saved.timeRemaining > 0) {
                    setTimeRemaining(saved.timeRemaining);
                  } else {
                    setTimeRemaining(defaultDuration);
                  }
                  if (typeof saved.timeSpent === "number") setTimeSpent(saved.timeSpent);
                  if (typeof saved.currentIndex === "number") setCurrentIndex(saved.currentIndex);
                  if (typeof saved.warningsCount === "number") setWarningsCount(saved.warningsCount);
                  if (Array.isArray(saved.violations)) setViolations(saved.violations);
                  restored = true;
                }
              }
            } catch {
              // ignore storage parse error
            }
          }

          if (!restored) {
            setTimeRemaining(defaultDuration);
          } else {
            setToast({ message: "Resumed in-progress quiz with active Kavach security.", variant: "info" });
          }
        }
      } catch (err: any) {
        setToast({ message: "Failed to load quiz data: " + err.message, variant: "error" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId, attemptId, autosaveKey]);

  // Autosave in-progress answers, timer, and Kavach status
  useEffect(() => {
    if (!autosaveKey || !exam || result || submitting) return;
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        autosaveKey,
        JSON.stringify({
          answers,
          timeRemaining,
          timeSpent,
          currentIndex,
          warningsCount,
          violations,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // storage full or unavailable
    }
  }, [autosaveKey, exam, result, submitting, answers, timeRemaining, timeSpent, currentIndex, warningsCount, violations]);

  // Timer tick
  useEffect(() => {
    if (!exam || result || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [exam, result, timeRemaining]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ── Core Kavach Disqualification Handler ─────────────────────────────
  const triggerDisqualification = useCallback(async (reason: string, currentViolationsList: ViolationEvent[]) => {
    const st = stateRef.current;
    if (st.submitting || st.result) return;
    const effectiveQuizId = quizId || st.exam?.exam_id || (st.exam as any)?.id;
    if (!effectiveQuizId) return;

    setSubmitting(true);
    setActiveWarningModal(null);

    try {
      const res = await studentApi.submitQuiz(effectiveQuizId, {
        answers: st.answers,
        time_spent_seconds: st.timeSpent,
        is_disqualified: true,
        warnings_count: 3,
        integrity_status: "disqualified",
        violations: currentViolationsList,
        disqualification_reason: reason,
      });
      if (autosaveKey && typeof window !== "undefined") {
        sessionStorage.removeItem(autosaveKey);
      }
      setResult(res);
      setToast({
        message: "🚫 Examination terminated due to repeated integrity violations (3 strikes).",
        variant: "error",
      });
    } catch (err: any) {
      setToast({ message: "Error recording submission: " + err.message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [quizId, autosaveKey]);

  // ── Record a Kavach Violation Event ──────────────────────────────────
  const recordViolation = useCallback((type: ViolationEvent["type"], detail: string) => {
    const st = stateRef.current;
    if (!st.exam || st.result || st.submitting) return;

    const timestamp = new Date().toLocaleTimeString();
    const nextWarningNumber = st.warningsCount + 1;

    const newViolation: ViolationEvent = {
      type,
      timestamp,
      warning_number: nextWarningNumber,
      detail,
    };

    const nextViolations = [...st.violations, newViolation];
    setViolations(nextViolations);
    setWarningsCount(nextWarningNumber);

    if (nextWarningNumber >= 3) {
      triggerDisqualification(
        `Disqualified on Strike 3: ${detail}`,
        nextViolations
      );
    } else {
      setActiveWarningModal({
        warningNumber: nextWarningNumber,
        title: nextWarningNumber === 1 ? "⚠️ Integrity Warning (1 of 3)" : "🚨 Final Warning (2 of 3)",
        reason: detail,
        timestamp,
      });
    }
  }, [triggerDisqualification]);

  // ── Visibility & Focus Monitoring Listeners ──────────────────────────
  useEffect(() => {
    if (!exam || result || submitting) return;

    let blurTimer: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("tab_switch", "Tab switched or browser minimized during active exam");
      }
    };

    const handleWindowBlur = () => {
      blurTimer = setTimeout(() => {
        if (!document.hasFocus()) {
          recordViolation("window_blur", "Exam window lost focus / application switch detected");
        }
      }, 500);
    };

    const handleWindowFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      if (blurTimer) clearTimeout(blurTimer);
    };
  }, [exam, result, submitting, recordViolation]);

  // ── Clipboard, Context Menu & Key Shortcut Lockdown ──────────────────
  useEffect(() => {
    if (!exam || result || submitting) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setToast({ message: "🛡️ Copying question text is prohibited by Kavach.", variant: "info" });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setToast({ message: "🛡️ Cutting content is disabled.", variant: "info" });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setToast({ message: "🛡️ Pasting external content is prohibited.", variant: "info" });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setToast({ message: "🛡️ Right-click context menu is locked during exams.", variant: "info" });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Ctrl/Cmd + C, V, A, U, P, S
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (["c", "v", "a", "u", "p", "s"].includes(key)) {
          e.preventDefault();
          setToast({ message: `🛡️ Keyboard shortcut (Ctrl+${key.toUpperCase()}) is prohibited.`, variant: "info" });
          return;
        }
      }

      // Intercept F12 & Developer Tools
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        setToast({ message: "🛡️ Developer inspection tools are strictly prohibited.", variant: "error" });
        return;
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exam, result, submitting]);

  const questions: Question[] = exam?.questions || [];
  const currentQ: Question | undefined = questions[currentIndex];

  const handleSelectAnswer = (ans: string) => {
    if (!currentQ) return;
    const qKey = String(currentQ.question_no ?? currentIndex + 1);
    setAnswers((prev) => ({
      ...prev,
      [qKey]: ans,
    }));
  };

  const handleRetake = async (targetExamId: string) => {
    if (autosaveKey && typeof window !== "undefined") {
      sessionStorage.removeItem(autosaveKey);
    }
    setResult(null);
    setAnswers({});
    setTimeSpent(0);
    setCurrentIndex(0);
    setWarningsCount(0);
    setViolations([]);
    setActiveWarningModal(null);
    setLoading(true);
    try {
      const data = await studentApi.getQuiz(targetExamId);
      setExam(data);
      setTimeRemaining((data.duration_minutes || 30) * 60);
    } catch (err: any) {
      setToast({ message: "Failed to restart quiz: " + err.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || result) return;
    const effectiveQuizId = quizId || exam?.exam_id || (exam as any)?.id;
    if (!effectiveQuizId) return;

    setSubmitting(true);
    try {
      const res = await studentApi.submitQuiz(effectiveQuizId, {
        answers,
        time_spent_seconds: timeSpent,
        is_disqualified: false,
        warnings_count: warningsCount,
        integrity_status: warningsCount > 0 ? "flagged" : "clean",
        violations,
      });
      if (autosaveKey && typeof window !== "undefined") {
        sessionStorage.removeItem(autosaveKey);
      }
      setResult(res);
      setToast({ message: "Quiz submitted and evaluated successfully!", variant: "success" });
    } catch (err: any) {
      setToast({ message: "Error submitting quiz: " + err.message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const requestFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="gurukul-page" style={{ textAlign: "center", padding: "100px 0" }}>
        <span className="spin" style={{ display: "inline-block", width: 32, height: 32, border: "3px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", marginBottom: 16 }} />
        <div style={{ color: "var(--text-2)", fontSize: 16 }}>Loading your assessment details...</div>
      </div>
    );
  }

  // ── Result & Breakdown View ──────────────────────────────
  if (result) {
    const isDisqualified = !!result.is_disqualified;

    return (
      <div className="gurukul-page" style={{ maxWidth: 860, margin: "0 auto", position: "relative" }}>
        {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

        {/* Disqualified Hero Banner or Standard Hero Score Card */}
        {isDisqualified ? (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "2px solid #dc2626",
              borderRadius: "var(--radius-xl)",
              padding: "36px 32px",
              textAlign: "center",
              boxShadow: "var(--shadow-md)",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertOctagon size={36} />
            </div>

            <h2 style={{ fontSize: 24, fontFamily: "var(--font-serif)", color: "#dc2626", marginBottom: 6, fontWeight: 800 }}>
              Examination Disqualified (अपात्र घोषित)
            </h2>

            <p style={{ fontSize: 14, color: "var(--text-1)", maxWidth: 600, margin: "0 auto 16px", lineHeight: 1.5 }}>
              This attempt was automatically forfeited due to <strong>3 consecutive integrity violations</strong> (such as tab switching or leaving the examination window).
            </p>

            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#dc2626",
                marginBottom: 8,
              }}
            >
              0.0% <span style={{ fontSize: 18, fontWeight: 500, color: "var(--text-3)" }}>(0 / {result.total_marks} Marks)</span>
            </div>

            {/* Forensic Violation Audit Log Card */}
            {result.violation_log && result.violation_log.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: "16px 20px",
                  background: "var(--surface)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert size={14} /> Kavach Security Audit Trail Recorded for Institutional Review:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.violation_log.map((v, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-1)", display: "flex", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>[{v.timestamp}]</span>
                      <span style={{ fontWeight: 600, color: v.warning_number >= 3 ? "#dc2626" : "#d97706" }}>
                        Strike {v.warning_number}: {v.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
              <button onClick={onExit} className="gk-btn gk-btn--primary">
                <ArrowLeft size={16} /> Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 32px",
              textAlign: "center",
              boxShadow: "var(--shadow-md)",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: result.percentage >= 75 ? "var(--forest-light)" : result.percentage >= 50 ? "var(--gold-light)" : "var(--terracotta-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: result.percentage >= 75 ? "var(--forest)" : result.percentage >= 50 ? "var(--gold)" : "var(--terracotta)",
              }}
            >
              {result.percentage >= 75 ? <Trophy size={32} /> : <Award size={32} />}
            </div>

            <h2 style={{ fontSize: 24, fontFamily: "var(--font-serif)", color: "var(--text-1)", marginBottom: 4 }}>
              {result.percentage >= 85
                ? "Exemplary Mastery! (उत्कृष्टम्)"
                : result.percentage >= 60
                ? "Commendable Effort! (उत्तमम्)"
                : "Keep Practicing! (पुनः प्रयासं कुरु)"}
            </h2>

            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>
              {result.subject} • {result.grade} • Recorded on {new Date(result.completed_at || Date.now()).toLocaleDateString()}
            </p>

            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: result.percentage >= 75 ? "var(--forest)" : result.percentage >= 50 ? "var(--gold)" : "var(--terracotta)",
                marginBottom: 8,
              }}
            >
              {result.percentage}%
            </div>

            <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 16 }}>
              You scored <strong>{result.score}</strong> out of <strong>{result.total_marks}</strong> marks in{" "}
              <strong>{Math.floor(result.time_spent_seconds / 60)}m {result.time_spent_seconds % 60}s</strong>.
            </p>

            {/* Integrity Status Tag */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 100, background: result.warnings_count ? "rgba(245, 158, 11, 0.12)" : "var(--forest-light)", border: `1px solid ${result.warnings_count ? "rgba(245, 158, 11, 0.3)" : "var(--forest)"}`, fontSize: 12, fontWeight: 600, color: result.warnings_count ? "#d97706" : "var(--forest)", marginBottom: 24 }}>
              {result.warnings_count ? (
                <>
                  <ShieldAlert size={14} /> Completed with {result.warnings_count} focus warning(s)
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Verified 100% Clean Integrity
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => handleRetake(result.exam_id)}
                className="gk-btn gk-btn--secondary"
              >
                <RotateCcw size={16} /> Retake Quiz
              </button>
              <button onClick={onExit} className="gk-btn gk-btn--primary">
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Detailed Question Review */}
        <div>
          <div className="ornament-heading" style={{ marginBottom: 16 }}>
            <Sparkles size={16} /> Comprehensive Question Breakdown & Answers
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {result.questions_feedback.map((fb, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${fb.is_correct ? "var(--forest)" : "var(--terracotta)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "20px 22px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                      Question {fb.question_no}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        background: "var(--surface-sunken)",
                        border: "1px solid var(--border)",
                        borderRadius: 100,
                        padding: "1px 8px",
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                      }}
                    >
                      {fb.type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {fb.is_correct ? (
                      <span style={{ color: "var(--forest)", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle size={16} /> Correct (+{fb.marks_awarded} / {fb.max_marks} marks)
                      </span>
                    ) : (
                      <span style={{ color: "var(--terracotta)", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <XCircle size={16} /> Incorrect ({fb.marks_awarded || 0} / {fb.max_marks} marks)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Content */}
                {fb.type === "match_the_following" ? (
                  <div style={{ marginBottom: 16 }}>
                    <MatchQuestionView
                      questionText={fb.text}
                      options={fb.options}
                      correctAnswer={fb.correct_answer}
                      userAnswer={fb.user_answer}
                      isAnswerKeyMode={true}
                      isInteractive={false}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 14.5, color: "var(--text-1)", lineHeight: 1.6, marginBottom: 16 }}>
                      <MathText content={fb.text} />
                    </div>

                    {fb.options && Array.isArray(fb.options) && fb.options.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        {fb.options.map((opt: any) => {
                          const isCorrectOpt = String(opt.key).trim().toUpperCase() === String(fb.correct_answer).trim().toUpperCase();
                          const isUserOpt = String(opt.key).trim().toUpperCase() === String(fb.user_answer).trim().toUpperCase();

                          let borderStyle = "1px solid var(--border)";
                          let bgStyle = "var(--surface-sunken)";
                          if (isCorrectOpt) {
                            borderStyle = "1.5px solid var(--forest)";
                            bgStyle = "rgba(22, 101, 52, 0.08)";
                          } else if (isUserOpt && !fb.is_correct) {
                            borderStyle = "1.5px solid var(--terracotta)";
                            bgStyle = "rgba(185, 28, 28, 0.08)";
                          }

                          return (
                            <div
                              key={opt.key}
                              style={{
                                padding: "10px 14px",
                                borderRadius: "var(--radius-md)",
                                border: borderStyle,
                                background: bgStyle,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                fontSize: 13.5,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                                <span
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: isCorrectOpt ? "var(--forest)" : isUserOpt ? "var(--terracotta)" : "var(--border)",
                                    color: isCorrectOpt || isUserOpt ? "#fff" : "var(--text-2)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    flexShrink: 0,
                                  }}
                                >
                                  {opt.key}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <MathText content={opt.text} />
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                {isCorrectOpt && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--forest)", background: "rgba(22, 101, 52, 0.15)", padding: "2px 8px", borderRadius: 100 }}>
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isUserOpt && !isCorrectOpt && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--terracotta)", background: "rgba(185, 28, 28, 0.15)", padding: "2px 8px", borderRadius: 100 }}>
                                    ✗ Your Choice
                                  </span>
                                )}
                                {isUserOpt && isCorrectOpt && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--forest)", background: "rgba(22, 101, 52, 0.15)", padding: "2px 8px", borderRadius: 100 }}>
                                    ✓ Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Comparison Summary */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    padding: "12px 16px",
                    background: "var(--surface-sunken)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                      Student Response
                    </span>
                    <div style={{ fontWeight: 600, color: fb.is_correct ? "var(--forest)" : "var(--terracotta)" }}>
                      <MathText content={formatAnswerDisplay(fb.user_answer, fb.options)} />
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                      Correct / Model Answer
                    </span>
                    <div style={{ fontWeight: 600, color: "var(--forest)" }}>
                      <MathText content={formatAnswerDisplay(fb.correct_answer, fb.options)} />
                    </div>
                  </div>
                </div>

                {/* Evaluation Rationale */}
                {fb.explanation && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: fb.is_correct ? "rgba(22, 101, 52, 0.08)" : "rgba(185, 28, 28, 0.08)",
                      border: `1px solid ${fb.is_correct ? "rgba(22, 101, 52, 0.2)" : "rgba(185, 28, 28, 0.2)"}`,
                      fontSize: 12.5,
                      color: "var(--text-1)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <Sparkles size={14} style={{ color: fb.is_correct ? "var(--forest)" : "var(--terracotta)", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ color: fb.is_correct ? "var(--forest)" : "var(--terracotta)" }}>Evaluation: </strong>
                      {fb.explanation}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active Quiz Player View ──────────────────────────────
  if (!exam) {
    return (
      <div className="gurukul-page" style={{ textAlign: "center", padding: "80px 0" }}>
        <AlertTriangle size={48} color="var(--terracotta)" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, color: "var(--text-1)", marginBottom: 8 }}>Quiz Not Found</h2>
        <p style={{ color: "var(--text-3)", marginBottom: 24 }}>This quiz could not be loaded or is no longer available.</p>
        <button onClick={onExit} className="gk-btn gk-btn--primary">
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQKey = String(currentQ?.question_no ?? currentIndex + 1);
  const currentAnswer = answers[currentQKey] || "";

  return (
    <div
      className="gurukul-page"
      style={{
        maxWidth: 860,
        margin: "0 auto",
        position: "relative",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* Dynamic Forensic Anti-Photo Watermark Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.04,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "space-around",
          justifyContent: "space-around",
          overflow: "hidden",
          userSelect: "none",
          transform: "rotate(-22deg) scale(1.3)",
        }}
      >
        {Array.from({ length: 36 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--text-1)",
              padding: "24px 36px",
              whiteSpace: "nowrap",
            }}
          >
            {user?.scholar_id ? `SCHOLAR #${user.scholar_id}` : (user?.email || "SHISHYA")} • {exam.subject} • GURUKUL KAVACH
          </div>
        ))}
      </div>

      {/* ── KAVACH STRIKE WARNING MODAL ───────────────────────── */}
      {activeWarningModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: activeWarningModal.warningNumber === 2 ? "2px solid #dc2626" : "2px solid #d97706",
              borderRadius: "var(--radius-xl)",
              maxWidth: 520,
              width: "100%",
              padding: "32px 28px",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              animation: "popIn 0.3s ease",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: activeWarningModal.warningNumber === 2 ? "rgba(220, 38, 38, 0.15)" : "rgba(217, 119, 6, 0.15)",
                color: activeWarningModal.warningNumber === 2 ? "#dc2626" : "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <ShieldAlert size={34} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, color: activeWarningModal.warningNumber === 2 ? "#dc2626" : "#d97706", marginBottom: 8 }}>
              {activeWarningModal.title}
            </h3>

            <p style={{ fontSize: 13.5, color: "var(--text-1)", lineHeight: 1.6, marginBottom: 16 }}>
              <strong>Violation Recorded:</strong> {activeWarningModal.reason}
            </p>

            <div
              style={{
                padding: "12px 14px",
                background: "var(--surface-sunken)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12.5,
                color: "var(--text-2)",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
                ⚖️ Gurukul Exam Integrity Rules:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                <li>Do NOT switch browser tabs or minimize the window.</li>
                <li>Do NOT open external applications or AI assistants.</li>
                <li>
                  <strong style={{ color: "#dc2626" }}>
                    {activeWarningModal.warningNumber === 2
                      ? "STRIKE 3 (NEXT VIOLATION) WILL INSTANTLY TERMINATE THE EXAM WITH 0 MARKS."
                      : "You have 2 strikes remaining before instant disqualification."}
                  </strong>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setActiveWarningModal(null)}
              className="gk-btn gk-btn--primary"
              style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700 }}
            >
              I Understand & Resume Examination →
            </button>
          </div>
        </div>
      )}

      {/* Top Bar: Back, Quiz Title, Kavach Shield & Timer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          padding: "12px 18px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <button onClick={onExit} className="gk-btn gk-btn--secondary gk-btn--sm">
          <ArrowLeft size={14} /> Exit
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
            {exam.subject} ({exam.grade})
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>•</span>
            <span style={{ color: warningsCount > 0 ? "#d97706" : "var(--forest)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Shield size={12} /> Kavach Active {warningsCount > 0 ? `(${warningsCount}/3 Strikes)` : "(Secure)"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={requestFullscreenMode}
            className="gk-btn gk-btn--ghost gk-btn--sm"
            style={{ padding: "4px 8px", fontSize: 11, color: "var(--text-2)" }}
            title="Enter Fullscreen Kiosk Mode"
          >
            <Maximize2 size={13} /> Fullscreen
          </button>

          {/* Timer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 100,
              background: timeRemaining < 300 ? "var(--terracotta-light)" : "var(--surface-sunken)",
              color: timeRemaining < 300 ? "var(--terracotta)" : "var(--text-1)",
              border: `1px solid ${timeRemaining < 300 ? "var(--terracotta)" : "var(--border)"}`,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <Clock size={16} />
            <span>{formatTimer(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Question Index Navigator Pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 20,
          position: "relative",
          zIndex: 10,
        }}
      >
        {questions.map((q, idx) => {
          const qNo = String(q.question_no ?? idx + 1);
          const isAnswered = !!answers[qNo];
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: isCurrent
                  ? "2px solid var(--accent)"
                  : isAnswered
                  ? "1px solid var(--forest)"
                  : "1px solid var(--border)",
                background: isCurrent
                  ? "var(--accent)"
                  : isAnswered
                  ? "var(--forest-light)"
                  : "var(--surface)",
                color: isCurrent
                  ? "var(--surface)"
                  : isAnswered
                  ? "var(--forest)"
                  : "var(--text-2)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Card */}
      {currentQ && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "32px 28px",
            boxShadow: "var(--shadow-md)",
            marginBottom: 24,
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Question Meta Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-3)",
                background: "var(--surface-sunken)",
                padding: "3px 10px",
                borderRadius: 100,
                border: "1px solid var(--border)",
              }}
            >
              Section {currentQ.section_id || "A"} • {currentQ.type.replace(/_/g, " ")} • {currentQ.marks || 1} Mark{(currentQ.marks || 1) > 1 ? "s" : ""}
            </span>

            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          {/* Question Interactive Content */}
          {currentQ.type === "match_the_following" ? (
            <MatchQuestionView
              questionText={currentQ.text}
              options={currentQ.options}
              userAnswer={currentAnswer}
              onSelectAnswer={handleSelectAnswer}
              isInteractive={true}
              isAnswerKeyMode={false}
            />
          ) : (
            <div>
              {/* Question Text with KaTeX Math rendering */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                <MathText content={currentQ.text} />
              </div>

              {/* Options for MCQ / True-False */}
              {currentQ.options && currentQ.options.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {currentQ.options.map((opt) => {
                    const isSelected = String(currentAnswer).trim().toUpperCase() === String(opt.key).trim().toUpperCase();
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectAnswer(opt.key)}
                        style={{
                          padding: "14px 18px",
                          borderRadius: "var(--radius-lg)",
                          border: isSelected ? "2px solid var(--forest)" : "1px solid var(--border)",
                          background: isSelected ? "rgba(22, 101, 52, 0.08)" : "var(--surface-sunken)",
                          color: "var(--text-1)",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: isSelected ? "var(--forest)" : "var(--surface)",
                            color: isSelected ? "#fff" : "var(--text-2)",
                            border: `1px solid ${isSelected ? "var(--forest)" : "var(--border)"}`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {opt.key}
                        </span>
                        <div style={{ flex: 1, fontSize: 14 }}>
                          <MathText content={opt.text} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in blanks or One word Input */}
              {(currentQ.type === "fill_in_the_blanks" || currentQ.type === "one_word") && (
                <div style={{ marginBottom: 20 }}>
                  <label className="gk-label">Type your answer here:</label>
                  <input
                    type="text"
                    className="gk-input"
                    placeholder="Enter word or phrase..."
                    value={currentAnswer}
                    onChange={(e) => handleSelectAnswer(e.target.value)}
                    style={{ fontSize: 15, padding: "12px 14px" }}
                  />
                </div>
              )}

              {/* Short / Long / Case Study Answer Textarea */}
              {["short_answer", "long_answer", "case_study"].includes(currentQ.type) && (
                <div style={{ marginBottom: 20 }}>
                  <label className="gk-label">Your Response / Explanation:</label>
                  <textarea
                    className="gk-textarea"
                    rows={5}
                    placeholder="Type your explanation, steps, or derivations here..."
                    value={currentAnswer}
                    onChange={(e) => handleSelectAnswer(e.target.value)}
                    style={{ fontSize: 14, lineHeight: 1.6 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="gk-btn gk-btn--secondary"
        >
          <ArrowLeft size={16} /> Previous
        </button>

        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          Answered <strong>{Object.keys(answers).length}</strong> of {questions.length} questions
        </div>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="gk-btn gk-btn--gold"
          >
            {submitting ? (
              <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }} />
            ) : (
              <>
                <CheckCircle size={16} /> Submit Quiz
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="gk-btn gk-btn--primary"
          >
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
