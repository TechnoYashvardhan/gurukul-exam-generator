"use client";

import { useEffect, useState } from "react";
import { studentApi } from "@/lib/api";
import type { GeneratedExam, Question } from "@/types/template";
import type { QuizResult } from "@/types/auth";
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
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

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
            setToast({ message: "Resumed in-progress quiz from autosave.", variant: "info" });
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

  // Autosave in-progress answers and timer
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
          updatedAt: Date.now(),
        })
      );
    } catch {
      // storage full or unavailable
    }
  }, [autosaveKey, exam, result, submitting, answers, timeRemaining, timeSpent, currentIndex]);

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
    return (
      <div className="gurukul-page" style={{ maxWidth: 860, margin: "0 auto" }}>
        {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

        {/* Hero Score Card */}
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
            {result.subject} • {result.grade} • Attempt Recorded on {new Date(result.completed_at || Date.now()).toLocaleDateString()}
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

          <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 24 }}>
            You scored <strong>{result.score}</strong> out of <strong>{result.total_marks}</strong> marks in{" "}
            <strong>{Math.floor(result.time_spent_seconds / 60)}m {result.time_spent_seconds % 60}s</strong>.
          </p>

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
                    {/* Question Text */}
                    <div style={{ fontSize: 14.5, color: "var(--text-1)", lineHeight: 1.6, marginBottom: 16 }}>
                      <MathText content={fb.text} />
                    </div>

                    {/* Options List (for MCQ / True-False / Options questions) */}
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
    <div className="gurukul-page" style={{ maxWidth: 860, margin: "0 auto" }}>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* Top Bar: Back, Quiz Title & Timer */}
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
        }}
      >
        <button onClick={onExit} className="gk-btn gk-btn--secondary gk-btn--sm">
          <ArrowLeft size={14} /> Exit Quiz
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
            {exam.subject} ({exam.grade})
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>

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

      {/* Question Index Navigator Pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 20,
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
          }}
        >
          {/* Question Meta */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-3)",
              }}
            >
              {currentQ.type.replace(/_/g, " ")} · {currentQ.marks || 1} Marks
            </span>
            {currentQ.section_id && !currentQ.section_id.toLowerCase().includes("default") && (
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                Section {currentQ.section_id.replace(/^s-?/i, "").toUpperCase()}
              </span>
            )}
          </div>

          {/* Question Text with KaTeX (hidden for match_the_following since MatchQuestionView renders its own structured header) */}
          {currentQ.type !== "match_the_following" && (
            <div style={{ fontSize: 17, lineHeight: 1.6, color: "var(--text-1)", marginBottom: 28 }}>
              <MathText content={currentQ.text} />
            </div>
          )}

          {/* Interactive Answer Input Section */}
          <div style={{ marginTop: currentQ.type === "match_the_following" ? 0 : 20 }}>
            {/* Match the Following Interactive Component */}
            {currentQ.type === "match_the_following" && (
              <MatchQuestionView
                questionText={currentQ.text}
                options={currentQ.options}
                userAnswer={currentAnswer}
                onSelectAnswer={(key) => handleSelectAnswer(key)}
                isInteractive={true}
              />
            )}

            {/* MCQ Options */}
            {currentQ.type === "mcq" && currentQ.options && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {currentQ.options.map((opt) => {
                  const isSelected = currentAnswer.toUpperCase() === opt.key.toUpperCase();
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectAnswer(opt.key)}
                      style={{
                        padding: "14px 18px",
                        borderRadius: "var(--radius-lg)",
                        border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        background: isSelected ? "var(--accent-light)" : "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: isSelected ? "var(--accent)" : "var(--surface-sunken)",
                          color: isSelected ? "var(--surface)" : "var(--text-2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {opt.key}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--text-1)", flex: 1 }}>
                        <MathText content={opt.text} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* True / False */}
            {currentQ.type === "true_false" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <button
                  type="button"
                  onClick={() => handleSelectAnswer("A")}
                  style={{
                    padding: "20px 16px",
                    borderRadius: "var(--radius-lg)",
                    border: `2px solid ${currentAnswer === "A" ? "var(--forest)" : "var(--border)"}`,
                    background: currentAnswer === "A" ? "var(--forest-light)" : "var(--surface)",
                    color: currentAnswer === "A" ? "var(--forest)" : "var(--text-1)",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Check size={20} /> TRUE
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAnswer("B")}
                  style={{
                    padding: "20px 16px",
                    borderRadius: "var(--radius-lg)",
                    border: `2px solid ${currentAnswer === "B" ? "var(--terracotta)" : "var(--border)"}`,
                    background: currentAnswer === "B" ? "var(--terracotta-light)" : "var(--surface)",
                    color: currentAnswer === "B" ? "var(--terracotta)" : "var(--text-1)",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <XCircle size={20} /> FALSE
                </button>
              </div>
            )}

            {/* Fill in the Blanks / One Word */}
            {(currentQ.type === "fill_in_the_blanks" || currentQ.type === "one_word") && (
              <div className="gk-field">
                <label className="gk-label" htmlFor="answer-input">
                  Your Answer (Single word or term)
                </label>
                <input
                  id="answer-input"
                  type="text"
                  className="gk-input"
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                  style={{ fontSize: 16, padding: "12px 16px" }}
                  autoFocus
                />
              </div>
            )}

            {/* Subjective types fallback */}
            {["short_answer", "long_answer", "case_study"].includes(currentQ.type) && (
              <div className="gk-field">
                <label className="gk-label">Your Response</label>
                <textarea
                  className="gk-textarea"
                  rows={4}
                  placeholder="Type your explanation or steps here..."
                  value={currentAnswer}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions: Previous, Next, Submit */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
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
          Answered {Object.keys(answers).length} / {questions.length}
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
