"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { templatesApi } from "@/lib/api";
import type { Difficulty, ExamTemplate, Section } from "@/types/template";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Save, RefreshCw, ClipboardList, Plus, Circle, Leaf, Flame, Zap, Skull } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import RichTextEditor from "./RichTextEditor";
import MarksBar from "./MarksBar";
import SectionCard from "./SectionCard";
import Toast, { type ToastVariant } from "./Toast";

// ── Props ────────────────────────────────────────────────────────────────────
interface TemplateBuilderProps {
  onSaved: () => void;
  externalLoad?: { name: string; config: ExamTemplate } | null;
  onExternalLoadConsumed?: () => void;
  role?: "admin" | "teacher";
}

// ── Difficulty metadata ───────────────────────────────────────────────────────
const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; bloom: string; color: string; icon: React.ReactNode }
> = {
  easy: {
    label: "Easy",
    bloom: "Remember & Understand (Bloom's L1–L2)",
    color: "diff--easy",
    icon: <Circle fill="currentColor" size={16} />,
  },
  medium: {
    label: "Medium",
    bloom: "Apply & Analyze (Bloom's L3–L4)",
    color: "diff--medium",
    icon: <Circle fill="currentColor" size={16} />,
  },
  hard: {
    label: "Hard",
    bloom: "Evaluate (Bloom's L5)",
    color: "diff--hard",
    icon: <Circle fill="currentColor" size={16} />,
  },
  extreme: {
    label: "Extreme",
    bloom: "Create & Synthesize (Bloom's L6)",
    color: "diff--extreme",
    icon: <Circle fill="currentColor" size={16} />,
  },
};

// ── makeSection ───────────────────────────────────────────────────────────────
function makeSection(index: number, staticId?: string): Section {
  return {
    id: staticId || `s${uuidv4().slice(0, 6)}`,
    title: `Section ${String.fromCharCode(65 + index)}`,
    type: "mcq",
    num_questions: 5,
    marks_per_question: 1,
    instructions: null,
  };
}

// ── Toast state type ──────────────────────────────────────────────────────────
interface ToastState {
  message: string;
  variant: ToastVariant;
}

// ── Icon map for difficulty tokens ─────────────────────────────────────────────
const DIFF_ICONS: Record<Difficulty, React.ReactNode> = {
  easy: <Leaf size={20} />,
  medium: <Flame size={20} />,
  hard: <Zap size={20} />,
  extreme: <Skull size={20} />,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TemplateBuilder({
  onSaved,
  externalLoad,
  onExternalLoadConsumed,
  role = "teacher",
}: TemplateBuilderProps) {
  // ── Form state (scoped by role so Admin and Teacher drafts never conflict) ────
  const [name, setName] = useLocalStorage(`tpl-name-${role}`, "");
  const [subject, setSubject] = useLocalStorage(`tpl-subject-${role}`, "");
  const [grade, setGrade] = useLocalStorage(`tpl-grade-${role}`, "");
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>(`tpl-difficulty-${role}`, "medium");
  const [totalMarks, setTotalMarks] = useLocalStorage<number>(`tpl-marks-${role}`, 100);
  const [duration, setDuration] = useLocalStorage<number>(`tpl-duration-${role}`, 180);
  const [headingDetails, setHeadingDetails] = useLocalStorage(`tpl-heading-${role}`, "");
  const [instructions, setInstructions] = useLocalStorage(`tpl-instructions-${role}`, "");
  const [sections, setSections] = useLocalStorage<Section[]>(`tpl-sections-${role}`, [
    makeSection(0, "s-default"),
  ]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Filter out any corrupted data from localStorage
  const validSections = sections.filter(Boolean);

  const computedMarks = validSections.reduce(
    (acc, s) => acc + s.num_questions * s.marks_per_question,
    0
  );

  const diffMeta = DIFFICULTY_META[difficulty];

  // ── External load (from sidebar) ────────────────────────────────────────────
  useEffect(() => {
    if (!externalLoad) return;
    loadTemplate(externalLoad.name, externalLoad.config);
    onExternalLoadConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalLoad]);

  // ── Section handlers ─────────────────────────────────────────────────────────
  const addSection = () =>
    setSections((prev) => [...prev, makeSection(prev.length)]);

  const removeSection = (index: number) =>
    setSections((prev) => prev.filter((_, i) => i !== index));

  const updateSection = useCallback((index: number, updated: Section) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  // ── Load from saved template ─────────────────────────────────────────────────
  function loadTemplate(templateName: string, config: ExamTemplate) {
    setName(templateName);
    setSubject(config.subject);
    setGrade(config.grade);
    setDifficulty(config.difficulty);
    setTotalMarks(config.total_marks);
    setDuration(config.duration_minutes);
    setHeadingDetails(config.heading_details || "");
    setInstructions(config.instructions || "");
    setSections(config.sections);
    showToast("Template loaded!", "info");
  }

  // ── Toast helper ─────────────────────────────────────────────────────────────
  function showToast(message: string, variant: ToastVariant = "info") {
    setToast({ message, variant });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) {
      showToast("Please give this template a name.", "error");
      return;
    }
    if (!subject.trim() || !grade.trim()) {
      showToast("Subject and Grade are required.", "error");
      return;
    }
    if (computedMarks !== totalMarks) {
      showToast(
        `Section marks (${computedMarks}) must equal total marks (${totalMarks}).`,
        "error"
      );
      return;
    }

    const template: ExamTemplate = {
      subject: subject.trim(),
      grade: grade.trim(),
      difficulty,
      bloom_level: null,
      total_marks: totalMarks,
      duration_minutes: duration,
      heading_details: headingDetails.trim() || null,
      instructions: instructions.trim() || null,
      sections: validSections,
    };

    setSaving(true);
    try {
      await templatesApi.create({ name: name.trim(), template }, role);
      showToast("Template saved successfully!", "success");
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save template.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Drag and Drop ─────────────────────────────────────────────────────────────
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;
    
    const newSections = Array.from(validSections);
    
    // Protect against out-of-bounds indexes caused by StrictMode bugs
    if (sourceIndex >= newSections.length) return;
    
    const [moved] = newSections.splice(sourceIndex, 1);
    if (!moved) return;
    
    newSections.splice(destIndex, 0, moved);
    
    setSections(newSections);
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirm("Clear everything and start fresh?")) return;
    setName("");
    setSubject("");
    setGrade("");
    setDifficulty("medium");
    setTotalMarks(100);
    setDuration(180);
    setHeadingDetails("");
    setInstructions("");
    setSections([makeSection(0)]);
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="page-header">
          <div className="page-header__breadcrumb">Vidya / Template Builder</div>
          <h1 className="page-header__title">Exam Template</h1>
          <div className="page-header__ornament">
            <div className="page-header__ornament-line" />
            <div className="page-header__ornament-diamond" />
            <div className="page-header__ornament-line--right" />
          </div>
          <p className="page-header__subtitle">
            Shape the knowledge test — let the AI do the rest
          </p>
        </div>

        {/* ── Top action bar ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            className="gk-btn gk-btn--secondary gk-btn--sm"
            onClick={handleReset}
          >
            <RefreshCw size={14} /> Start Fresh
          </button>
          <button
            className="gk-btn gk-btn--primary gk-btn--sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span
                className="spin"
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <>
                <Save size={14} /> Save Template
              </>
            )}
          </button>
        </div>

        {/* ── Exam details card ──────────────────────────────────────────────── */}
        <div className="vidya-card">
          <div className="vidya-card__header">
            <span className="vidya-card__title">
              <span className="vidya-card__title-icon">
                <ClipboardList size={18} />
              </span>
              Exam Details
            </span>
          </div>

          {/* 2-column grid for fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Template Name — spans 2 cols */}
            <div className="gk-field" style={{ gridColumn: "1 / -1" }}>
              <label className="gk-label" htmlFor="tpl-name">
                Template Name <span>*</span>
              </label>
              <input
                id="tpl-name"
                className="gk-input"
                type="text"
                placeholder="e.g. Class 10 Science Mid-Term Exam"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Subject */}
            <div className="gk-field">
              <label className="gk-label" htmlFor="tpl-subject">
                Subject <span>*</span>
              </label>
              <input
                id="tpl-subject"
                className="gk-input"
                type="text"
                placeholder="e.g. Physics, Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Grade */}
            <div className="gk-field">
              <label className="gk-label" htmlFor="tpl-grade">
                Grade / Level <span>*</span>
              </label>
              <input
                id="tpl-grade"
                className="gk-input"
                type="text"
                placeholder="e.g. Grade 10 / Class XII"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>

            {/* Total Marks */}
            <div className="gk-field">
              <label className="gk-label" htmlFor="tpl-marks">
                Total Marks
              </label>
              <input
                id="tpl-marks"
                className="gk-input"
                type="number"
                min={1}
                max={500}
                value={totalMarks}
                onChange={(e) =>
                  setTotalMarks(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>

            {/* Duration */}
            <div className="gk-field">
              <label className="gk-label" htmlFor="tpl-duration">
                Duration (minutes)
              </label>
              <input
                id="tpl-duration"
                className="gk-input"
                type="number"
                min={10}
                max={300}
                step={5}
                value={duration}
                onChange={(e) =>
                  setDuration(Math.max(10, parseInt(e.target.value) || 10))
                }
              />
            </div>

            {/* Heading Details — spans 2 cols */}
            <div className="gk-field" style={{ gridColumn: "1 / -1" }}>
              <label className="gk-label">
                Heading Details{" "}
                <span
                  style={{
                    fontWeight: 400,
                    textTransform: "none",
                    letterSpacing: 0,
                    color: "var(--text-3)",
                    fontSize: 11,
                  }}
                >
                  — School Name, Class, Session
                </span>
              </label>
              <RichTextEditor
                content={headingDetails}
                onChange={setHeadingDetails}
                placeholder="e.g. ABC High School..."
              />
            </div>

            {/* Instructions — spans 2 cols */}
            <div className="gk-field" style={{ gridColumn: "1 / -1" }}>
              <label className="gk-label">
                Exam Instructions{" "}
                <span
                  style={{
                    fontWeight: 400,
                    textTransform: "none",
                    letterSpacing: 0,
                    color: "var(--text-3)",
                    fontSize: 11,
                  }}
                >
                  — Shown at top of paper
                </span>
              </label>
              <RichTextEditor
                content={instructions}
                onChange={setInstructions}
                placeholder="e.g. All questions are compulsory..."
              />
            </div>
          </div>

          {/* ── Difficulty tokens ────────────────────────────────────────────── */}
          <div style={{ marginTop: 20 }}>
            <div className="ornament-heading">Difficulty Level</div>
            <div className="difficulty-tokens">
              {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`difficulty-token difficulty-token--${d}${
                    difficulty === d ? " difficulty-token--active" : ""
                  }`}
                  onClick={() => setDifficulty(d)}
                >
                  <div className="difficulty-token__circle">{DIFF_ICONS[d]}</div>
                  <span className="difficulty-token__label">
                    {DIFFICULTY_META[d].label}
                  </span>
                </button>
              ))}
            </div>
            {/* Bloom level text */}
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--text-3)",
                fontStyle: "italic",
              }}
            >
              {diffMeta.bloom}
            </p>
          </div>
        </div>

        {/* ── Marks bar ──────────────────────────────────────────────────────── */}
        <MarksBar computed={computedMarks} total={totalMarks} />

        {/* ── Sections ───────────────────────────────────────────────────────── */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              className="ornament-heading"
              style={{ flex: 1, marginBottom: 0 }}
            >
              Exam Sections{" "}
              <span
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-mid)",
                  borderRadius: 100,
                  padding: "1px 10px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  marginLeft: 8,
                }}
              >
                {sections.length}
              </span>
            </div>
            <button
              type="button"
              className="gk-btn gk-btn--secondary gk-btn--sm"
              onClick={addSection}
              disabled={sections.length >= 10}
            >
              <Plus size={14} /> Add Section
            </button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {validSections.map((sec, i) => (
                    <Draggable key={sec.id} draggableId={sec.id} index={i}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <SectionCard
                            section={sec}
                            index={i}
                            onChange={(updated) => updateSection(i, updated)}
                            onRemove={() => removeSection(i)}
                            canRemove={validSections.length > 1}
                            dragHandleProps={provided.dragHandleProps}
                            role={role}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* ── Bottom save bar ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            <span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {validSections.length}
              </strong>{" "}
              sections
            </span>
            <span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {validSections.reduce((a, s) => a + s.num_questions, 0)}
              </strong>{" "}
              questions
            </span>
            <span
              style={{
                color:
                  computedMarks === totalMarks
                    ? "var(--forest)"
                    : "var(--terracotta)",
              }}
            >
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {computedMarks}
              </strong>{" "}
              / {totalMarks} marks
            </span>
            <span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {duration}
              </strong>{" "}
              min
            </span>
          </div>

          <button
            type="button"
            className="gk-btn gk-btn--gold"
            onClick={handleSave}
            disabled={saving || computedMarks !== totalMarks}
          >
            {saving ? (
              <span
                className="spin"
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <>
                <Save size={16} /> Save Template
              </>
            )}
          </button>
        </div>

      </div>
    </>
  );
}
