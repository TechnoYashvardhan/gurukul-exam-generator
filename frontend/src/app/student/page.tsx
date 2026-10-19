"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar, { View } from "@/components/Sidebar";
import StudentDashboard from "@/components/StudentDashboard";
import StudentQuizArena from "@/components/StudentQuizArena";
import StudentHistory from "@/components/StudentHistory";
import QuizPlayer from "@/components/QuizPlayer";
import SaathiChatbot from "@/components/SaathiChatbot";
import ProtectedRoute from "@/components/ProtectedRoute";

const ParticleBackground = dynamic(
  () => import("@/components/ParticleBackground"),
  { ssr: false }
);

export default function StudentPage() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);

  const isInQuizMode = Boolean(activeQuizId || activeAttemptId);

  const handleStartQuiz = (quizId?: string) => {
    setActiveAttemptId(null);
    if (quizId) {
      setActiveQuizId(quizId);
    } else {
      setActiveView("quiz");
    }
  };

  const handleViewAttempt = (attemptId: string) => {
    setActiveQuizId(null);
    setActiveAttemptId(attemptId);
  };

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <ParticleBackground />
      <div className="gurukul-app">
        {/* ── Remove Sidebar Completely During Active Quiz / Attempt ── */}
        {!isInQuizMode && (
          <Sidebar
            activeView={activeView}
            onViewChange={(view) => {
              setActiveView(view);
              setActiveQuizId(null);
              setActiveAttemptId(null);
            }}
            role="student"
          />
        )}

        {/* ── Main Content Area (Full Viewport during Quiz) ── */}
        <div
          className="gurukul-content"
          style={
            isInQuizMode
              ? {
                  width: "100vw",
                  maxWidth: "100vw",
                  padding: 0,
                  margin: 0,
                }
              : undefined
          }
        >
          {activeAttemptId ? (
            <QuizPlayer
              attemptId={activeAttemptId}
              onExit={() => {
                setActiveAttemptId(null);
              }}
            />
          ) : activeQuizId ? (
            <QuizPlayer
              quizId={activeQuizId}
              onExit={() => {
                setActiveQuizId(null);
                setActiveView("dashboard");
              }}
            />
          ) : (
            <>
              {activeView === "dashboard" && (
                <StudentDashboard
                  onNavigateToQuiz={handleStartQuiz}
                  onNavigateToAttempt={handleViewAttempt}
                />
              )}

              {activeView === "quiz" && (
                <StudentQuizArena onSelectQuiz={(id) => setActiveQuizId(id)} />
              )}

              {activeView === "history" && (
                <StudentHistory
                  onNavigateToQuiz={handleStartQuiz}
                  onNavigateToAttempt={handleViewAttempt}
                />
              )}
            </>
          )}
        </div>

        {/* Saathi Knowledge Companion (Accessible outside active exams) */}
        {!isInQuizMode && <SaathiChatbot onNavigate={(v) => setActiveView(v)} />}
      </div>
    </ProtectedRoute>
  );
}
