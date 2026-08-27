"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar, { View } from "@/components/Sidebar";
import StudentDashboard from "@/components/StudentDashboard";
import StudentQuizArena from "@/components/StudentQuizArena";
import QuizPlayer from "@/components/QuizPlayer";

const ParticleBackground = dynamic(
  () => import("@/components/ParticleBackground"),
  { ssr: false }
);

export default function StudentPage() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);

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
    <>
      <ParticleBackground />
      <div className="gurukul-app">
        {/* Persistent Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            setActiveQuizId(null);
            setActiveAttemptId(null);
          }}
          role="student"
        />

        {/* Main Content Area */}
        <div className="gurukul-content">
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
                <StudentDashboard
                  onNavigateToQuiz={handleStartQuiz}
                  onNavigateToAttempt={handleViewAttempt}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
