"use client";

import { useState } from "react";
import type { Section } from "@/types/template";
import { GripVertical, X, ChevronDown, ChevronUp } from "lucide-react";

interface SectionCardProps {
  section: Section;
  index: number;
  onChange: (updated: Section) => void;
  onRemove: () => void;
  canRemove: boolean;
  dragHandleProps?: any;
  role?: "admin" | "teacher";
}

const ADMIN_TYPE_OPTIONS: { value: Section["type"]; label: string }[] = [
  { value: "mcq",                 label: "MCQ" },
  { value: "fill_in_the_blanks",   label: "Fill in Blanks" },
  { value: "true_false",          label: "True / False" },
  { value: "match_the_following",  label: "Match Following" },
  { value: "one_word",            label: "One Word" },
];

const TEACHER_TYPE_OPTIONS: { value: Section["type"]; label: string }[] = [
  { value: "mcq",          label: "MCQ" },
  { value: "short_answer", label: "Short Answer" },
  { value: "long_answer",  label: "Long Answer" },
  { value: "case_study",   label: "Case Study" },
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function SectionCard({ section, index, onChange, onRemove, canRemove, dragHandleProps, role = "teacher" }: SectionCardProps) {
  const [showInstructions, setShowInstructions] = useState(!!section.instructions);
  const sectionLetter = String.fromCharCode(65 + index);
  const computedMarks = section.num_questions * section.marks_per_question;
  const options = role === "admin" ? ADMIN_TYPE_OPTIONS : TEACHER_TYPE_OPTIONS;

  function update(patch: Partial<Section>) {
    onChange({ ...section, ...patch });
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "var(--text-3)",
    marginBottom: 8,
    fontFamily: "var(--font-mono)",
  };

  return (
    <div className="lens-card section-card" style={{ padding: "20px", marginBottom: "16px" }}>
      {/* Header */}
      <div className="section-card__header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div {...dragHandleProps} style={{ color: "var(--text-3)", cursor: "grab", flexShrink: 0, padding: 4, display: 'flex', alignItems: 'center' }} aria-hidden="true">
          <GripVertical size={16} />
        </div>
        <div className="section-card__letter-badge" style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>
          {sectionLetter}
        </div>
        <input
          className="gk-input section-card__title-input"
          type="text"
          aria-label={"Section " + sectionLetter + " title"}
          value={section.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Section title (e.g. Multiple Choice Questions)"
          style={{ flex: 1, height: "36px", fontSize: "14px", fontWeight: 600 }}
        />
        <span className="chip-badge chip-badge--gold" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
          {computedMarks} marks
        </span>
        {canRemove && (
          <button
            type="button"
            className="gk-btn gk-btn--danger gk-btn--icon"
            style={{ width: 32, height: 32, padding: 0 }}
            onClick={onRemove}
            aria-label={"Remove section " + sectionLetter}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Question type pills */}
      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>Question Format</div>
        <div className="type-pills" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={"type-pill " + (section.type === opt.value ? "type-pill--active" : "")}
              onClick={() => update({ type: opt.value })}
              style={{ padding: "6px 14px", fontSize: "12.5px" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Steppers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
        <div className="gk-field">
          <label className="gk-label" htmlFor={"sec-" + section.id + "-numq"}>Question Count</label>
          <div className="gk-stepper">
            <button type="button" className="gk-stepper__btn"
              onClick={() => update({ num_questions: clamp(section.num_questions - 1, 1, 20) })}
              disabled={section.num_questions <= 1}>-</button>
            <input
              id={"sec-" + section.id + "-numq"}
              type="number"
              className="gk-stepper__input"
              value={section.num_questions}
              min={1}
              max={20}
              onChange={(e) => update({ num_questions: clamp(parseInt(e.target.value) || 1, 1, 20) })}
            />
            <button type="button" className="gk-stepper__btn"
              onClick={() => update({ num_questions: clamp(section.num_questions + 1, 1, 20) })}
              disabled={section.num_questions >= 20}>+</button>
          </div>
        </div>
        <div className="gk-field">
          <label className="gk-label" htmlFor={"sec-" + section.id + "-mpq"}>Marks per Question</label>
          <div className="gk-stepper">
            <button type="button" className="gk-stepper__btn"
              onClick={() => update({ marks_per_question: clamp(section.marks_per_question - 1, 1, 100) })}
              disabled={section.marks_per_question <= 1}>-</button>
            <input
              id={"sec-" + section.id + "-mpq"}
              type="number"
              className="gk-stepper__input"
              value={section.marks_per_question}
              min={1}
              max={100}
              onChange={(e) => update({ marks_per_question: clamp(parseInt(e.target.value) || 1, 1, 100) })}
            />
            <button type="button" className="gk-stepper__btn"
              onClick={() => update({ marks_per_question: clamp(section.marks_per_question + 1, 1, 100) })}
              disabled={section.marks_per_question >= 100}>+</button>
          </div>
        </div>
      </div>

      <div className="gk-field" style={{ marginBottom: 14 }}>
        <label className="gk-label" htmlFor={"sec-" + section.id + "-bloom"}>Bloom's Cognitive Level (Optional)</label>
        <select
          id={"sec-" + section.id + "-bloom"}
          className="gk-select"
          value={section.bloom_level || ""}
          onChange={(e) => update({ bloom_level: e.target.value || null })}
          style={{ width: "100%", height: "38px" }}
        >
          <option value="">Auto (Derived from global difficulty)</option>
          <option value="remember">Remember (Level 1 - Recall facts)</option>
          <option value="understand">Understand (Level 2 - Explain concepts)</option>
          <option value="apply">Apply (Level 3 - Execute formulas & methods)</option>
          <option value="analyze">Analyze (Level 4 - Draw connections)</option>
          <option value="evaluate">Evaluate (Level 5 - Justify a stance)</option>
          <option value="create">Create (Level 6 - Synthesize original ideas)</option>
        </select>
      </div>

      {/* Collapsible instructions */}
      <button
        type="button"
        className="section-card__instructions-toggle gk-btn gk-btn--ghost gk-btn--sm"
        onClick={() => setShowInstructions((v) => !v)}
        aria-expanded={showInstructions}
        style={{ padding: "4px 8px", fontSize: "12px", gap: 6, color: "var(--accent)" }}
      >
        {showInstructions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showInstructions ? "Hide section instructions" : "+ Add section instructions (optional)"}
      </button>

      <div style={{
        display: "grid",
        gridTemplateRows: showInstructions ? "1fr" : "0fr",
        transition: "grid-template-rows 0.28s ease",
        overflow: "hidden",
      }}>
        <div style={{ minHeight: 0 }}>
          <div style={{ paddingTop: 10 }}>
            <textarea
              className="gk-textarea"
              rows={2}
              placeholder="e.g. Answer any 3 out of 5 questions. All questions carry equal marks."
              value={section.instructions ?? ""}
              onChange={(e) => update({ instructions: e.target.value || null })}
              aria-label={"Instructions for Section " + sectionLetter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
