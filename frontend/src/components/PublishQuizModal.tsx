"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  Calendar,
  Clock,
  School,
  Users,
  Globe,
  CheckCircle2,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { ClassSummary } from "@/types/auth";

interface PublishQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    targetClassId?: string;
    scheduleStartAt?: string;
    scheduleEndAt?: string;
  }) => Promise<void>;
  classes: ClassSummary[];
  examTitle?: string;
  subject?: string;
}

export default function PublishQuizModal({
  isOpen,
  onClose,
  onConfirm,
  classes,
  examTitle,
  subject,
}: PublishQuizModalProps) {
  const [targetClassId, setTargetClassId] = useState<string>("all");
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let scheduleStartAt: string | undefined = undefined;
    let scheduleEndAt: string | undefined = undefined;

    if (scheduleMode === "scheduled") {
      if (!startDate || !startTime) {
        setError("Please choose both a start date and time for the scheduled quiz.");
        return;
      }
      const startIso = new Date(`${startDate}T${startTime}`).toISOString();
      scheduleStartAt = startIso;

      if (hasDeadline) {
        if (!endDate || !endTime) {
          setError("Please choose both an end date and time for the deadline.");
          return;
        }
        const endIso = new Date(`${endDate}T${endTime}`).toISOString();
        if (new Date(endIso) <= new Date(startIso)) {
          setError("Deadline end time must be after the start time.");
          return;
        }
        scheduleEndAt = endIso;
      }
    }

    setLoading(true);
    try {
      await onConfirm({
        targetClassId: targetClassId === "all" ? undefined : targetClassId,
        scheduleStartAt,
        scheduleEndAt,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to publish quiz.");
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === targetClassId);

  return (
    <div className="gk-modal-backdrop" onClick={onClose}>
      <div
        className="gk-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540, padding: "28px 24px" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--accent-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <Send size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Publish Quiz to Students</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                {subject ? `${subject} • ` : ""}Target cohorts and delivery schedule
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-sm)",
              color: "#dc2626",
              fontSize: 12.5,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cohort Selector */}
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
              1. Select Target Cohort / Course
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              {/* Global All Classes option */}
              <div
                onClick={() => setTargetClassId("all")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  border: targetClassId === "all" ? "2px solid var(--gold)" : "1px solid var(--border)",
                  background: targetClassId === "all" ? "var(--gold-soft)" : "var(--surface)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Globe size={16} color="var(--gold-dark)" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>All Students (Global)</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Quiz will be available across all classes</div>
                  </div>
                </div>
                {targetClassId === "all" && <CheckCircle2 size={16} color="var(--gold-dark)" />}
              </div>

              {/* Class specific options */}
              {classes.map((cls) => {
                const isSelected = targetClassId === cls.id;
                return (
                  <div
                    key={cls.id}
                    onClick={() => setTargetClassId(cls.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: isSelected ? "2px solid var(--gold)" : "1px solid var(--border)",
                      background: isSelected ? "var(--gold-soft)" : "var(--surface)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <School size={16} color="var(--forest)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{cls.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                          {cls.course} {cls.section ? `• ${cls.section}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--surface-muted)", borderRadius: 10, color: "var(--text-muted)" }}>
                        👥 {cls.student_count}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color="var(--gold-dark)" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule Selector */}
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
              2. Delivery Timing & Schedule
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setScheduleMode("immediate")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "var(--radius-md)",
                  border: scheduleMode === "immediate" ? "2px solid var(--gold)" : "1px solid var(--border)",
                  background: scheduleMode === "immediate" ? "var(--gold-soft)" : "var(--surface)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Send size={18} color="var(--terracotta)" />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Publish Immediately</span>
                <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Live right now</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode("scheduled")}
                style={{
                  padding: "12px 10px",
                  borderRadius: "var(--radius-md)",
                  border: scheduleMode === "scheduled" ? "2px solid var(--gold)" : "1px solid var(--border)",
                  background: scheduleMode === "scheduled" ? "var(--gold-soft)" : "var(--surface)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Calendar size={18} color="var(--forest)" />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Schedule for Later</span>
                <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Set custom start/end</span>
              </button>
            </div>

            {/* Date Pickers for Schedule Mode */}
            {scheduleMode === "scheduled" && (
              <div
                style={{
                  padding: "14px",
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Start Date & Time */}
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
                    Start Date & Time (Opens for students) *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="gk-input"
                      style={{ fontSize: 12.5 }}
                      required
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="gk-input"
                      style={{ fontSize: 12.5 }}
                      required
                    />
                  </div>
                </div>

                {/* Deadline Option */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      id="hasDeadline"
                      checked={hasDeadline}
                      onChange={(e) => setHasDeadline(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor="hasDeadline" style={{ fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Set Quiz Submission Deadline (Closes window)
                    </label>
                  </div>

                  {hasDeadline && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="gk-input"
                        style={{ fontSize: 12.5 }}
                        required={hasDeadline}
                      />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="gk-input"
                        style={{ fontSize: 12.5 }}
                        required={hasDeadline}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="gk-btn gk-btn--secondary" disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="gk-btn gk-btn--primary"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {loading ? (
                "Publishing..."
              ) : scheduleMode === "scheduled" ? (
                <>
                  <Calendar size={15} /> Schedule Quiz
                </>
              ) : (
                <>
                  <Send size={15} /> Publish Quiz Now
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
