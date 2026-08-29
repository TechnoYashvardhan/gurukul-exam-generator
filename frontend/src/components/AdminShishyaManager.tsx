"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  GraduationCap,
  Plus,
  Trash2,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  X,
  BookOpen,
  School,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { ClassSummary, StudentRosterItem, StudentFullReport, StudentReportAttempt } from "@/types/auth";
import MathText from "./MathText";
import Toast, { ToastVariant } from "./Toast";

export default function AdminShishyaManager() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // Modals
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassCourse, setNewClassCourse] = useState("");
  const [newClassSection, setNewClassSection] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newScholarId, setNewScholarId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Deep dive report modal
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);
  const [studentReport, setStudentReport] = useState<StudentFullReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  // Load Classes
  useEffect(() => {
    async function load() {
      setLoadingClasses(true);
      try {
        const data = await adminApi.listClasses();
        setClasses(data);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
        }
      } catch (err: any) {
        setToast({ message: "Failed to load classes: " + err.message, variant: "error" });
      } finally {
        setLoadingClasses(false);
      }
    }
    load();
  }, []);

  // Load Students when selected class changes
  useEffect(() => {
    const classId = selectedClassId;
    async function loadStudents() {
      if (!classId) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const data = await adminApi.listClassStudents(classId);
        setStudents(data);
      } catch (err: any) {
        setToast({ message: "Failed to load students: " + err.message, variant: "error" });
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  // Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassCourse.trim()) {
      setToast({ message: "Please provide class name and course.", variant: "info" });
      return;
    }
    setCreatingClass(true);
    try {
      const created = await adminApi.createClass({
        name: newClassName.trim(),
        course: newClassCourse.trim(),
        section: newClassSection.trim() || undefined,
      });
      setClasses((prev) => [...prev, created]);
      setSelectedClassId(created.id);
      setShowAddClassModal(false);
      setNewClassName("");
      setNewClassCourse("");
      setNewClassSection("");
      setToast({ message: `Class '${created.name}' created successfully!`, variant: "success" });
    } catch (err: any) {
      setToast({ message: "Error creating class: " + err.message, variant: "error" });
    } finally {
      setCreatingClass(false);
    }
  };

  // Delete Class
  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete class '${name}'? All student enrollments will be cleared.`)) return;
    try {
      await adminApi.deleteClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      if (selectedClassId === id) {
        const remaining = classes.filter((c) => c.id !== id);
        setSelectedClassId(remaining.length > 0 ? remaining[0].id : null);
      }
      setToast({ message: `Class '${name}' deleted.`, variant: "info" });
    } catch (err: any) {
      setToast({ message: "Failed to delete class: " + err.message, variant: "error" });
    }
  };

  // Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    const scholarId = newScholarId.trim();
    if (!scholarId || !scholarId.match(/^\d{7}$/)) {
      setToast({ message: "Scholar ID must be exactly 7 digits (e.g. 2410852).", variant: "info" });
      return;
    }
    if (!newStudentName.trim() || !newStudentEmail.trim()) {
      setToast({ message: "Please provide student name and email.", variant: "info" });
      return;
    }

    setCreatingStudent(true);
    try {
      const created = await adminApi.addStudent(selectedClassId, {
        scholar_id: scholarId,
        full_name: newStudentName.trim(),
        email: newStudentEmail.trim(),
      });
      setStudents((prev) => [created, ...prev]);
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClassId ? { ...c, student_count: c.student_count + 1 } : c))
      );
      setShowAddStudentModal(false);
      setNewScholarId("");
      setNewStudentName("");
      setNewStudentEmail("");
      setToast({
        message: `Student '${created.full_name}' added! Default password is 'student@dsvv123'.`,
        variant: "success",
      });
    } catch (err: any) {
      setToast({ message: "Error adding student: " + err.message, variant: "error" });
    } finally {
      setCreatingStudent(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Remove student '${name}' from roster?`)) return;
    try {
      await adminApi.deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (selectedClassId) {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClassId ? { ...c, student_count: Math.max(0, c.student_count - 1) } : c
          )
        );
      }
      setToast({ message: `Student '${name}' removed.`, variant: "info" });
    } catch (err: any) {
      setToast({ message: "Failed to delete student: " + err.message, variant: "error" });
    }
  };

  // Open Deep Dive Report
  const handleOpenReport = async (studentId: string) => {
    setReportStudentId(studentId);
    setLoadingReport(true);
    setExpandedAttemptId(null);
    try {
      const report = await adminApi.getStudentReport(studentId);
      setStudentReport(report);
    } catch (err: any) {
      setToast({ message: "Failed to load student report: " + err.message, variant: "error" });
    } finally {
      setLoadingReport(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scholar_id.includes(searchQuery) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* Header with Title and Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, margin: 0 }}>
            Shishya & Class Roster (शिष्य प्रबन्धन)
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>
            Organize student cohorts, enforce 7-digit Scholar ID provisioning, and inspect per-student deep-dive academic report cards.
          </p>
        </div>
        <button
          onClick={() => setShowAddClassModal(true)}
          className="gk-btn gk-btn--primary"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
        >
          <Plus size={15} /> Add New Class / Course
        </button>
      </div>

      {/* Classes Carousel / Selector Bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 12,
          marginBottom: 20,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {loadingClasses ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0" }}>Loading cohorts...</div>
        ) : classes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0" }}>
            No classes created yet. Click "+ Add New Class / Course" to set up your first cohort.
          </div>
        ) : (
          classes.map((cls) => {
            const isSelected = cls.id === selectedClassId;
            return (
              <div
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                style={{
                  minWidth: 200,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: isSelected ? "2px solid var(--gold)" : "1px solid var(--border)",
                  background: isSelected ? "var(--gold-soft)" : "var(--surface)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: isSelected ? "var(--gold-dark)" : "var(--text)",
                      lineHeight: 1.2,
                    }}
                  >
                    {cls.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(cls.id, cls.name);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: 2,
                    }}
                    title="Delete Class"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                  <span>👥 {cls.student_count} Students</span>
                  <span>📜 {cls.assigned_quizzes_count} Quizzes</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Class Dashboard */}
      {selectedClass && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <School size={18} style={{ color: "var(--gold)" }} />
                {selectedClass.name}
                <span style={{ fontSize: 12, padding: "2px 8px", background: "var(--surface-muted)", borderRadius: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                  {selectedClass.course} {selectedClass.section ? `• ${selectedClass.section}` : ""}
                </span>
              </h3>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", width: 220 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search Scholar ID / Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="gk-input"
                  style={{ paddingLeft: 30, fontSize: 12.5, height: 34 }}
                />
              </div>
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="gk-btn gk-btn--primary"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, height: 34 }}
              >
                <Plus size={14} /> Add Student
              </button>
            </div>
          </div>

          {/* Roster Table */}
          {loadingStudents ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>
              Loading student roster...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }}>
              <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>No Students Enrolled in this Cohort</div>
              <p style={{ fontSize: 12.5, maxWidth: 400, margin: "4px auto 14px" }}>
                Add students with their official 7-digit Scholar ID and Name to grant them access to class-specific tests.
              </p>
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="gk-btn gk-btn--secondary"
                style={{ fontSize: 12.5 }}
              >
                <Plus size={13} /> Add Student to {selectedClass.name}
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--text-muted)", fontSize: 12 }}>
                    <th style={{ padding: "10px 12px" }}>Scholar ID</th>
                    <th style={{ padding: "10px 12px" }}>Student Name</th>
                    <th style={{ padding: "10px 12px" }}>Email</th>
                    <th style={{ padding: "10px 12px" }}>Quizzes Taken</th>
                    <th style={{ padding: "10px 12px" }}>Avg Mastery</th>
                    <th style={{ padding: "10px 12px" }}>Peak Score</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((std) => (
                    <tr key={std.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px", fontFamily: "monospace", fontWeight: 700, color: "var(--gold-dark)" }}>
                        🎓 {std.scholar_id}
                      </td>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{std.full_name}</td>
                      <td style={{ padding: "12px", color: "var(--text-muted)" }}>{std.email}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ fontWeight: 700 }}>{std.attempts_count}</span> tests
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              std.avg_percentage >= 75
                                ? "rgba(34, 197, 94, 0.15)"
                                : std.avg_percentage >= 50
                                ? "rgba(234, 179, 8, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                            color:
                              std.avg_percentage >= 75
                                ? "#16a34a"
                                : std.avg_percentage >= 50
                                ? "#ca8a04"
                                : "#dc2626",
                          }}
                        >
                          {std.avg_percentage}%
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontWeight: 600 }}>
                        {std.highest_percentage > 0 ? `${std.highest_percentage}%` : "—"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <button
                            onClick={() => handleOpenReport(std.id)}
                            className="gk-btn gk-btn--secondary"
                            style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <FileText size={12} /> View Report
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(std.id, std.full_name)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: 4,
                            }}
                            title="Remove Student"
                          >
                            <Trash2 size={14} />
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
      )}

      {/* ── MODAL: Add New Class ─────────────────────────────────────────────── */}
      {showAddClassModal && (
        <div className="gk-modal-backdrop" onClick={() => setShowAddClassModal(false)}>
          <div className="gk-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add New Class / Cohort</h3>
              <button onClick={() => setShowAddClassModal(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateClass} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Class / Batch Name *</label>
                <input
                  type="text"
                  placeholder="e.g. BCA 1st Year (2026)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="gk-input"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Course / Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor of Computer Applications"
                  value={newClassCourse}
                  onChange={(e) => setNewClassCourse(e.target.value)}
                  className="gk-input"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Section / Batch (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Section A / Morning Shift"
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  className="gk-input"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddClassModal(false)} className="gk-btn gk-btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creatingClass} className="gk-btn gk-btn--primary">
                  {creatingClass ? "Creating..." : "Create Cohort"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add New Student ───────────────────────────────────────────── */}
      {showAddStudentModal && (
        <div className="gk-modal-backdrop" onClick={() => setShowAddStudentModal(false)}>
          <div className="gk-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add Student to {selectedClass?.name}</h3>
              <button onClick={() => setShowAddStudentModal(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>7-Digit Scholar ID *</label>
                  <span style={{ fontSize: 11, color: newScholarId.length === 7 ? "var(--gold)" : "var(--text-muted)" }}>
                    {newScholarId.length}/7 digits
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={7}
                  placeholder="e.g. 2410852"
                  value={newScholarId}
                  onChange={(e) => setNewScholarId(e.target.value.replace(/\D/g, ""))}
                  className="gk-input"
                  style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Student Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Arjuna Sharma"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="gk-input"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. 2410852@campus.dsvv.in"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="gk-input"
                  required
                />
              </div>

              {/* Password Notice */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <AlertCircle size={15} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
                <span>
                  Default password for this student will automatically be set to <strong>student@dsvv123</strong>.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="gk-btn gk-btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creatingStudent} className="gk-btn gk-btn--primary">
                  {creatingStudent ? "Adding..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Student Deep Dive Performance Report Card ─────────────────── */}
      {reportStudentId && (
        <div className="gk-modal-backdrop" onClick={() => setReportStudentId(null)}>
          <div
            className="gk-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 850, maxHeight: "90vh", overflowY: "auto", padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold-dark)", fontWeight: 700 }}>
                  Academic Performance Dossier
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700 }}>
                  {studentReport?.full_name || "Student Report"}
                </h3>
                <div style={{ display: "flex", gap: 12, fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                  <span>🎓 Scholar ID: <strong>{studentReport?.scholar_id}</strong></span>
                  <span>🏫 Class: <strong>{studentReport?.class_name || "General"}</strong></span>
                  <span>✉️ {studentReport?.email}</span>
                </div>
              </div>
              <button onClick={() => setReportStudentId(null)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {loadingReport ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                Compiling academic report card...
              </div>
            ) : !studentReport || studentReport.attempts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }}>
                <BookOpen size={30} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <div style={{ fontWeight: 600 }}>No Quiz Attempts Recorded</div>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  This student has not submitted any active quiz assessments yet.
                </p>
              </div>
            ) : (
              <div>
                {/* Summary Metrics Bar */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ padding: "12px", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Total Attempts</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{studentReport.total_quizzes_taken}</div>
                  </div>
                  <div style={{ padding: "12px", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Average Score</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", marginTop: 2 }}>
                      {studentReport.overall_avg_percentage}%
                    </div>
                  </div>
                  <div style={{ padding: "12px", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Peak Score</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>
                      {studentReport.overall_highest_percentage}%
                    </div>
                  </div>
                  <div style={{ padding: "12px", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Total Time</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                      {Math.round(studentReport.total_time_spent_seconds / 60)} mins
                    </div>
                  </div>
                </div>

                {/* List of Quiz Attempts with expandable breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {studentReport.attempts.map((attempt) => {
                    const isExpanded = expandedAttemptId === attempt.attempt_id;
                    return (
                      <div
                        key={attempt.attempt_id}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          background: "var(--surface)",
                        }}
                      >
                        {/* Attempt Header */}
                        <div
                          onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.attempt_id)}
                          style={{
                            padding: "14px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            background: isExpanded ? "var(--gold-soft)" : "transparent",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{attempt.exam_title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                              {attempt.subject} • {attempt.grade} • Taken on {new Date(attempt.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: attempt.percentage >= 75 ? "#16a34a" : attempt.percentage >= 50 ? "#ca8a04" : "#dc2626" }}>
                                {attempt.percentage}%
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                {attempt.score} / {attempt.total_marks} Marks
                              </div>
                            </div>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </div>

                        {/* Expanded Breakdown */}
                        {isExpanded && (
                          <div style={{ padding: "16px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
                              📖 Detailed Question Responses & AI Evaluation:
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              {attempt.breakdown.map((q, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: "12px 14px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border)",
                                    background: q.is_correct ? "rgba(34, 197, 94, 0.04)" : "rgba(239, 68, 68, 0.04)",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                      Q{q.question_no || idx + 1}. <MathText content={q.text} />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 10,
                                        background: q.is_correct ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                        color: q.is_correct ? "#16a34a" : "#dc2626",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {q.score_awarded} / {q.marks} Marks
                                    </span>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, fontSize: 12 }}>
                                    <div style={{ padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
                                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>Student's Answer:</span>
                                      <strong style={{ color: q.is_correct ? "#16a34a" : "#dc2626" }}>
                                        {q.user_answer ? <MathText content={String(q.user_answer)} /> : "(No response)"}
                                      </strong>
                                    </div>
                                    <div style={{ padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
                                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>Correct Model Answer:</span>
                                      <strong style={{ color: "#16a34a" }}>
                                        <MathText content={String(q.correct_answer || "—")} />
                                      </strong>
                                    </div>
                                  </div>

                                  {q.evaluation_reason && (
                                    <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic", background: "var(--surface)", padding: "6px 10px", borderRadius: 4 }}>
                                      💡 AI Evaluation: {q.evaluation_reason}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
