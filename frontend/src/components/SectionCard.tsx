"use client";

import { useState } from "react";
import type { Section, SubSection, CaseStudySubQConfig, QuestionType } from "@/types/template";
import {
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Layers,
  BookOpen,
  Sparkles,
  Sliders,
  Check,
  Shuffle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface SectionCardProps {
  section: Section;
  index: number;
  onChange: (updated: Section) => void;
  onRemove: () => void;
  canRemove: boolean;
  dragHandleProps?: any;
  role?: "admin" | "teacher";
}

const ADMIN_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "MCQ" },
  { value: "fill_in_the_blanks", label: "Fill in Blanks" },
  { value: "true_false", label: "True / False" },
  { value: "match_the_following", label: "Match Following" },
  { value: "one_word", label: "One Word" },
  { value: "case_study", label: "Case Study / Passage" },
];

const TEACHER_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "MCQ" },
  { value: "short_answer", label: "Short Answer" },
  { value: "long_answer", label: "Long Answer" },
  { value: "case_study", label: "Case Study / Passage" },
  { value: "fill_in_the_blanks", label: "Fill in Blanks" },
  { value: "true_false", label: "True / False" },
  { value: "match_the_following", label: "Match Following" },
  { value: "one_word", label: "One Word" },
];

const CASE_SUBQ_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "MCQ (Multiple Choice)" },
  { value: "fill_in_the_blanks", label: "Fill in the Blanks" },
  { value: "true_false", label: "True / False" },
  { value: "one_word", label: "One Word / Direct" },
  { value: "short_answer", label: "Short Answer / Inference" },
];

const PRESETS = [
  {
    name: "CBSE Reading (10M)",
    desc: "4 MCQ + 2 Fill-ups + 1 T/F + 1 Short (3M)",
    config: [
      { type: "mcq" as QuestionType, count: 4, marks_per_sub: 1 },
      { type: "fill_in_the_blanks" as QuestionType, count: 2, marks_per_sub: 1 },
      { type: "true_false" as QuestionType, count: 1, marks_per_sub: 1 },
      { type: "short_answer" as QuestionType, count: 1, marks_per_sub: 3 },
    ],
  },
  {
    name: "MCQ Focus (4M)",
    desc: "4 MCQs of 1 Mark each",
    config: [{ type: "mcq" as QuestionType, count: 4, marks_per_sub: 1 }],
  },
  {
    name: "Extract / Context (5M)",
    desc: "2 MCQs + 1 T/F + 1 Short (2M)",
    config: [
      { type: "mcq" as QuestionType, count: 2, marks_per_sub: 1 },
      { type: "true_false" as QuestionType, count: 1, marks_per_sub: 1 },
      { type: "short_answer" as QuestionType, count: 1, marks_per_sub: 2 },
    ],
  },
  {
    name: "Mixed Objective (6M)",
    desc: "2 MCQ + 2 Fill-ups + 2 T/F",
    config: [
      { type: "mcq" as QuestionType, count: 2, marks_per_sub: 1 },
      { type: "fill_in_the_blanks" as QuestionType, count: 2, marks_per_sub: 1 },
      { type: "true_false" as QuestionType, count: 2, marks_per_sub: 1 },
    ],
  },
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function calculateCaseMarks(configs: CaseStudySubQConfig[] | undefined | null): number {
  if (!configs || configs.length === 0) return 4;
  return configs.reduce((acc, c) => acc + (c.count || 0) * (c.marks_per_sub || 0), 0);
}

function calculateSubSectionMarks(sub: SubSection): number {
  if (sub.type === "case_study" && sub.case_study_config && sub.case_study_config.length > 0) {
    return sub.num_questions * calculateCaseMarks(sub.case_study_config);
  }
  return sub.num_questions * sub.marks_per_question;
}

export function calculateSectionTotalMarks(section: Section): number {
  if (section.sub_sections && section.sub_sections.length > 0) {
    return section.sub_sections.reduce((acc, sub) => acc + calculateSubSectionMarks(sub), 0);
  }
  if (section.type === "case_study" && section.case_study_config && section.case_study_config.length > 0) {
    return section.num_questions * calculateCaseMarks(section.case_study_config);
  }
  return section.num_questions * section.marks_per_question;
}

// ── Case Study Breakdown Configurator Component ──────────────────────────────
interface CaseStudyBuilderProps {
  config: CaseStudySubQConfig[];
  onChange: (config: CaseStudySubQConfig[]) => void;
  numQuestions: number;
}

function CaseStudyBreakdownBuilder({ config, onChange, numQuestions }: CaseStudyBuilderProps) {
  const currentList = config && config.length > 0 ? config : PRESETS[0].config;
  const singlePassageMarks = calculateCaseMarks(currentList);
  const totalCaseMarks = singlePassageMarks * numQuestions;

  const updateRow = (idx: number, patch: Partial<CaseStudySubQConfig>) => {
    const updated = [...currentList];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const addRow = () => {
    onChange([...currentList, { type: "mcq", count: 1, marks_per_sub: 1 }]);
  };

  const removeRow = (idx: number) => {
    if (currentList.length <= 1) return;
    onChange(currentList.filter((_, i) => i !== idx));
  };

  const applyPreset = (presetConfig: CaseStudySubQConfig[]) => {
    onChange(JSON.parse(JSON.stringify(presetConfig)));
  };

  return (
    <div
      style={{
        marginTop: "12px",
        marginBottom: "16px",
        padding: "14px 16px",
        borderRadius: "10px",
        background: "rgba(234, 179, 8, 0.04)",
        border: "1px solid rgba(234, 179, 8, 0.22)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={16} style={{ color: "var(--accent, #eab308)" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)" }}>
            Case Study / Passage Sub-Questions Mix
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="chip-badge chip-badge--gold"
            style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px" }}
          >
            {singlePassageMarks}M per Passage ({totalCaseMarks}M Total)
          </span>
        </div>
      </div>

      {/* Quick Presets */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-3)", marginBottom: "6px" }}>
          QUICK PRESETS:
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {PRESETS.map((p) => {
            const isMatch =
              JSON.stringify(p.config.map((c) => ({ t: c.type, c: c.count, m: c.marks_per_sub }))) ===
              JSON.stringify(currentList.map((c) => ({ t: c.type, c: c.count, m: c.marks_per_sub })));
            return (
              <button
                key={p.name}
                type="button"
                className={`gk-btn gk-btn--sm ${isMatch ? "gk-btn--primary" : "gk-btn--ghost"}`}
                onClick={() => applyPreset(p.config)}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: isMatch ? undefined : "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                }}
                title={p.desc}
              >
                {isMatch && <Check size={12} style={{ marginRight: 4 }} />}
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rows Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {currentList.map((row, rIdx) => (
          <div
            key={rIdx}
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1fr 1fr auto auto",
              gap: "8px",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.2)",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Format selector */}
            <div>
              <select
                className="gk-select"
                value={row.type}
                onChange={(e) => updateRow(rIdx, { type: e.target.value as QuestionType })}
                style={{ width: "100%", height: "32px", fontSize: "12px", padding: "0 8px" }}
              >
                {CASE_SUBQ_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SubQ Count */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="gk-input"
                  value={row.count}
                  onChange={(e) => updateRow(rIdx, { count: clamp(parseInt(e.target.value) || 1, 1, 20) })}
                  style={{ width: "100%", height: "32px", fontSize: "12px", textAlign: "center", padding: "0 4px" }}
                  title="Number of sub-questions of this type"
                />
                <span style={{ fontSize: "11px", color: "var(--text-3)", whiteSpace: "nowrap" }}>Qs</span>
              </div>
            </div>

            {/* Marks each */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="gk-input"
                  value={row.marks_per_sub}
                  onChange={(e) => updateRow(rIdx, { marks_per_sub: clamp(parseInt(e.target.value) || 1, 1, 20) })}
                  style={{ width: "100%", height: "32px", fontSize: "12px", textAlign: "center", padding: "0 4px" }}
                  title="Marks per sub-question"
                />
                <span style={{ fontSize: "11px", color: "var(--text-3)", whiteSpace: "nowrap" }}>M</span>
              </div>
            </div>

            {/* Row Total */}
            <div style={{ minWidth: "50px", textAlign: "right" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent, #eab308)" }}>
                ={(row.count || 0) * (row.marks_per_sub || 0)}M
              </span>
            </div>

            {/* Delete button */}
            <div>
              <button
                type="button"
                className="gk-btn gk-btn--danger gk-btn--icon"
                onClick={() => removeRow(rIdx)}
                disabled={currentList.length <= 1}
                style={{ width: "28px", height: "28px", padding: 0, opacity: currentList.length <= 1 ? 0.3 : 1 }}
                title="Remove this sub-question row"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Row Button */}
      <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-start" }}>
        <button
          type="button"
          className="gk-btn gk-btn--ghost gk-btn--sm"
          onClick={addRow}
          style={{ fontSize: "11.5px", padding: "4px 10px", gap: "4px" }}
        >
          <Plus size={13} /> + Add Question Type
        </button>
      </div>
    </div>
  );
}

// ── SubSection Item Component ────────────────────────────────────────────────
interface SubSectionItemProps {
  subSection: SubSection;
  subIndex: number;
  sectionLetter: string;
  onChange: (updated: SubSection) => void;
  onRemove: () => void;
  canRemove: boolean;
  role?: "admin" | "teacher";
}

function SubSectionItem({
  subSection,
  subIndex,
  sectionLetter,
  onChange,
  onRemove,
  canRemove,
  role = "teacher",
}: SubSectionItemProps) {
  const options = role === "admin" ? ADMIN_TYPE_OPTIONS : TEACHER_TYPE_OPTIONS;
  const partNumber = ["I", "II", "III", "IV", "V", "VI"][subIndex] || `${subIndex + 1}`;
  const computedMarks = calculateSubSectionMarks(subSection);

  const update = (patch: Partial<SubSection>) => {
    onChange({ ...subSection, ...patch });
  };

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            background: "rgba(255, 255, 255, 0.08)",
            padding: "4px 8px",
            borderRadius: "4px",
            color: "var(--text-1)",
            whiteSpace: "nowrap",
          }}
        >
          Part {partNumber}
        </span>
        <input
          type="text"
          className="gk-input"
          value={subSection.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={`Part ${partNumber} Title (e.g. Context Extract / Short Questions)`}
          style={{ flex: 1, height: "34px", fontSize: "13px", fontWeight: 600 }}
        />
        <span className="chip-badge chip-badge--gold" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
          {computedMarks} marks
        </span>
        {canRemove && (
          <button
            type="button"
            className="gk-btn gk-btn--danger gk-btn--icon"
            style={{ width: "28px", height: "28px", padding: 0 }}
            onClick={onRemove}
            title="Remove this sub-section"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Format pills */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-3)", marginBottom: "6px", fontFamily: "var(--font-mono)" }}>
          SUB-SECTION FORMAT
        </div>
        <div className="type-pills" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={"type-pill " + (subSection.type === opt.value ? "type-pill--active" : "")}
              onClick={() => {
                const patch: Partial<SubSection> = { type: opt.value };
                if (opt.value === "case_study" && (!subSection.case_study_config || subSection.case_study_config.length === 0)) {
                  patch.case_study_config = JSON.parse(JSON.stringify(PRESETS[0].config));
                  patch.marks_per_question = calculateCaseMarks(patch.case_study_config);
                }
                update(patch);
              }}
              style={{ padding: "4px 10px", fontSize: "11.5px" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Steppers (if not case study or standard) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div className="gk-field">
          <label className="gk-label" style={{ fontSize: "11px" }}>
            {subSection.type === "case_study" ? "Passage Count" : "Question Count"}
          </label>
          <div className="gk-stepper">
            <button
              type="button"
              className="gk-stepper__btn"
              onClick={() => update({ num_questions: clamp(subSection.num_questions - 1, 1, 20) })}
              disabled={subSection.num_questions <= 1}
            >
              -
            </button>
            <input
              type="number"
              className="gk-stepper__input"
              value={subSection.num_questions}
              min={1}
              max={20}
              onChange={(e) => update({ num_questions: clamp(parseInt(e.target.value) || 1, 1, 20) })}
            />
            <button
              type="button"
              className="gk-stepper__btn"
              onClick={() => update({ num_questions: clamp(subSection.num_questions + 1, 1, 20) })}
              disabled={subSection.num_questions >= 20}
            >
              +
            </button>
          </div>
        </div>

        <div className="gk-field">
          <label className="gk-label" style={{ fontSize: "11px" }}>
            {subSection.type === "case_study" ? "Marks per Passage" : "Marks per Question"}
          </label>
          <div className="gk-stepper">
            <button
              type="button"
              className="gk-stepper__btn"
              onClick={() => update({ marks_per_question: clamp(subSection.marks_per_question - 1, 1, 100) })}
              disabled={subSection.marks_per_question <= 1 || subSection.type === "case_study"}
            >
              -
            </button>
            <input
              type="number"
              className="gk-stepper__input"
              value={
                subSection.type === "case_study"
                  ? calculateCaseMarks(subSection.case_study_config)
                  : subSection.marks_per_question
              }
              readOnly={subSection.type === "case_study"}
              min={1}
              max={100}
              onChange={(e) => update({ marks_per_question: clamp(parseInt(e.target.value) || 1, 1, 100) })}
            />
            <button
              type="button"
              className="gk-stepper__btn"
              onClick={() => update({ marks_per_question: clamp(subSection.marks_per_question + 1, 1, 100) })}
              disabled={subSection.marks_per_question >= 100 || subSection.type === "case_study"}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Internal Choice (OR Options) for Sub-Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: (subSection.internal_choice_count || 0) > 0 ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
          border: (subSection.internal_choice_count || 0) > 0 ? "1px solid rgba(99, 102, 241, 0.28)" : "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "8px",
          padding: "8px 12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Shuffle size={13} style={{ color: (subSection.internal_choice_count || 0) > 0 ? "var(--primary, #6366f1)" : "var(--text-3)" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-1)" }}>
              Internal Choice (OR Options)
            </span>
          </div>
          <p style={{ fontSize: "10.5px", color: "var(--text-3)", margin: "2px 0 0 0" }}>
            {(subSection.internal_choice_count || 0) > 0
              ? `${subSection.internal_choice_count} of ${subSection.num_questions} question(s) will have an "OR" alternative`
              : "No internal choice (all compulsory)"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", gap: "3px" }}>
            <button
              type="button"
              className={`gk-btn gk-btn--sm ${(subSection.internal_choice_count || 0) === 0 ? "gk-btn--primary" : "gk-btn--ghost"}`}
              style={{ fontSize: "10.5px", padding: "1px 6px", height: "24px" }}
              onClick={() => update({ internal_choice_count: 0 })}
            >
              None
            </button>
            <button
              type="button"
              className={`gk-btn gk-btn--sm ${(subSection.internal_choice_count || 0) === 1 ? "gk-btn--primary" : "gk-btn--ghost"}`}
              style={{ fontSize: "10.5px", padding: "1px 6px", height: "24px" }}
              onClick={() => update({ internal_choice_count: 1 })}
            >
              1 Q
            </button>
            <button
              type="button"
              className={`gk-btn gk-btn--sm ${(subSection.internal_choice_count || 0) === subSection.num_questions ? "gk-btn--primary" : "gk-btn--ghost"}`}
              style={{ fontSize: "10.5px", padding: "1px 6px", height: "24px" }}
              onClick={() => update({ internal_choice_count: subSection.num_questions })}
            >
              All
            </button>
          </div>

          <div className="gk-stepper" style={{ height: "26px" }}>
            <button
              type="button"
              className="gk-stepper__btn"
              onClick={() => update({ internal_choice_count: clamp((subSection.internal_choice_count || 0) - 1, 0, subSection.num_questions) })}
              disabled={(subSection.internal_choice_count || 0) <= 0}
              style={{ padding: "0 6px" }}
            >
              -
            </button>
            <span style={{ fontSize: "11px", fontWeight: 700, minWidth: "20px", textAlign: "center" }}>
              {subSection.internal_choice_count || 0}
            </span>
            <button
              type="button"
              className="gk-stepper__btn"
              onClick={() => update({ internal_choice_count: clamp((subSection.internal_choice_count || 0) + 1, 0, subSection.num_questions) })}
              disabled={(subSection.internal_choice_count || 0) >= subSection.num_questions}
              style={{ padding: "0 6px" }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Case Study Breakdown if type === 'case_study' */}
      {subSection.type === "case_study" && (
        <CaseStudyBreakdownBuilder
          config={subSection.case_study_config || PRESETS[0].config}
          numQuestions={subSection.num_questions}
          onChange={(newCfg) => {
            const m = calculateCaseMarks(newCfg);
            update({ case_study_config: newCfg, marks_per_question: m });
          }}
        />
      )}

      {/* Syllabus Scope & Bloom for this sub-section */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "10px" }}>
        <div className="gk-field">
          <label className="gk-label" style={{ fontSize: "11px" }}>
            🎯 Part Syllabus Scope (Multi-RAG)
          </label>
          <input
            type="text"
            className="gk-input"
            value={subSection.topic_query || ""}
            onChange={(e) => update({ topic_query: e.target.value || null })}
            placeholder="e.g. Unseen Prose Passage (leave empty for section scope)"
            style={{ width: "100%", height: "34px", fontSize: "12px" }}
          />
        </div>
        <div className="gk-field">
          <label className="gk-label" style={{ fontSize: "11px" }}>
            Bloom's Level
          </label>
          <select
            className="gk-select"
            value={subSection.bloom_level || ""}
            onChange={(e) => update({ bloom_level: e.target.value || null })}
            style={{ width: "100%", height: "34px", fontSize: "12px" }}
          >
            <option value="">Auto (Section default)</option>
            <option value="remember">Remember (L1)</option>
            <option value="understand">Understand (L2)</option>
            <option value="apply">Apply (L3)</option>
            <option value="analyze">Analyze (L4)</option>
            <option value="evaluate">Evaluate (L5)</option>
            <option value="create">Create (L6)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main SectionCard ─────────────────────────────────────────────────────────
export default function SectionCard({
  section,
  index,
  onChange,
  onRemove,
  canRemove,
  dragHandleProps,
  role = "teacher",
}: SectionCardProps) {
  const [showInstructions, setShowInstructions] = useState(!!section.instructions);
  const sectionLetter = String.fromCharCode(65 + index);
  const isMultiPart = !!(section.sub_sections && section.sub_sections.length > 0);
  const computedMarks = calculateSectionTotalMarks(section);
  const options = role === "admin" ? ADMIN_TYPE_OPTIONS : TEACHER_TYPE_OPTIONS;

  function update(patch: Partial<Section>) {
    onChange({ ...section, ...patch });
  }

  const toggleMultiPart = () => {
    if (isMultiPart) {
      // Revert to single section
      update({ sub_sections: null });
    } else {
      // Initialize with 2 standard sub-sections
      const initialSubs: SubSection[] = [
        {
          id: `sub_${uuidv4().slice(0, 6)}`,
          title: `Part I: Context / Extracts`,
          type: "case_study",
          num_questions: 1,
          marks_per_question: 10,
          case_study_config: JSON.parse(JSON.stringify(PRESETS[0].config)),
          topic_query: null,
          bloom_level: null,
        },
        {
          id: `sub_${uuidv4().slice(0, 6)}`,
          title: `Part II: Descriptive Questions`,
          type: "short_answer",
          num_questions: 4,
          marks_per_question: 3,
          case_study_config: null,
          topic_query: null,
          bloom_level: null,
        },
      ];
      update({ sub_sections: initialSubs });
    }
  };

  const addSubSection = () => {
    const currentSubs = section.sub_sections || [];
    const nextIdx = currentSubs.length;
    const partNum = ["I", "II", "III", "IV", "V", "VI"][nextIdx] || `${nextIdx + 1}`;
    const newSub: SubSection = {
      id: `sub_${uuidv4().slice(0, 6)}`,
      title: `Part ${partNum}: Questions`,
      type: "short_answer",
      num_questions: 2,
      marks_per_question: 2,
      case_study_config: null,
      topic_query: null,
      bloom_level: null,
    };
    update({ sub_sections: [...currentSubs, newSub] });
  };

  const updateSubSection = (subIdx: number, updated: SubSection) => {
    const currentSubs = [...(section.sub_sections || [])];
    currentSubs[subIdx] = updated;
    update({ sub_sections: currentSubs });
  };

  const removeSubSection = (subIdx: number) => {
    const currentSubs = section.sub_sections || [];
    if (currentSubs.length <= 1) {
      update({ sub_sections: null });
    } else {
      update({ sub_sections: currentSubs.filter((_, i) => i !== subIdx) });
    }
  };

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
      <div
        className="section-card__header"
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}
      >
        <div
          {...dragHandleProps}
          style={{ color: "var(--text-3)", cursor: "grab", flexShrink: 0, padding: 4, display: "flex", alignItems: "center" }}
          aria-hidden="true"
        >
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
          placeholder="Section title (e.g. Section C: Literature & Reading)"
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

      {/* Multi-Part / Sub-Sections Toggle Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: isMultiPart ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
          border: isMultiPart ? "1px solid rgba(99, 102, 241, 0.25)" : "1px dashed rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "8px 12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={15} style={{ color: isMultiPart ? "var(--primary, #6366f1)" : "var(--text-3)" }} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: isMultiPart ? "var(--text-1)" : "var(--text-3)" }}>
            {isMultiPart
              ? `Multi-Part Section (${section.sub_sections?.length} Sub-Sections / Parts)`
              : "Standard Single-Format Section"}
          </span>
        </div>
        <button
          type="button"
          className={`gk-btn gk-btn--sm ${isMultiPart ? "gk-btn--ghost" : "gk-btn--secondary"}`}
          onClick={toggleMultiPart}
          style={{ fontSize: "11.5px", padding: "4px 10px", gap: "4px" }}
        >
          {isMultiPart ? "Flatten to Single Section" : "+ Split into Sub-Sections / Parts"}
        </button>
      </div>

      {/* If MULTI-PART: Render SubSections list */}
      {isMultiPart ? (
        <div style={{ marginBottom: "16px" }}>
          {section.sub_sections?.map((sub, sIdx) => (
            <SubSectionItem
              key={sub.id || sIdx}
              subSection={sub}
              subIndex={sIdx}
              sectionLetter={sectionLetter}
              onChange={(updated) => updateSubSection(sIdx, updated)}
              onRemove={() => removeSubSection(sIdx)}
              canRemove={true}
              role={role}
            />
          ))}

          <button
            type="button"
            className="gk-btn gk-btn--ghost gk-btn--sm"
            onClick={addSubSection}
            style={{ width: "100%", padding: "8px", fontSize: "12px", border: "1px dashed rgba(255, 255, 255, 0.15)", borderRadius: "8px", gap: "6px" }}
          >
            <Plus size={14} /> + Add Another Sub-Section / Part to Section {sectionLetter}
          </button>
        </div>
      ) : (
        /* If SINGLE SECTION: Render Standard format pills & steppers */
        <>
          {/* Question type pills */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Question Format</div>
            <div className="type-pills" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={"type-pill " + (section.type === opt.value ? "type-pill--active" : "")}
                  onClick={() => {
                    const patch: Partial<Section> = { type: opt.value };
                    if (opt.value === "case_study" && (!section.case_study_config || section.case_study_config.length === 0)) {
                      patch.case_study_config = JSON.parse(JSON.stringify(PRESETS[0].config));
                      patch.marks_per_question = calculateCaseMarks(patch.case_study_config);
                    }
                    update(patch);
                  }}
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
              <label className="gk-label" htmlFor={"sec-" + section.id + "-numq"}>
                {section.type === "case_study" ? "Passage Count" : "Question Count"}
              </label>
              <div className="gk-stepper">
                <button
                  type="button"
                  className="gk-stepper__btn"
                  onClick={() => update({ num_questions: clamp(section.num_questions - 1, 1, 20) })}
                  disabled={section.num_questions <= 1}
                >
                  -
                </button>
                <input
                  id={"sec-" + section.id + "-numq"}
                  type="number"
                  className="gk-stepper__input"
                  value={section.num_questions}
                  min={1}
                  max={20}
                  onChange={(e) => update({ num_questions: clamp(parseInt(e.target.value) || 1, 1, 20) })}
                />
                <button
                  type="button"
                  className="gk-stepper__btn"
                  onClick={() => update({ num_questions: clamp(section.num_questions + 1, 1, 20) })}
                  disabled={section.num_questions >= 20}
                >
                  +
                </button>
              </div>
            </div>
            <div className="gk-field">
              <label className="gk-label" htmlFor={"sec-" + section.id + "-mpq"}>
                {section.type === "case_study" ? "Marks per Passage" : "Marks per Question"}
              </label>
              <div className="gk-stepper">
                <button
                  type="button"
                  className="gk-stepper__btn"
                  onClick={() => update({ marks_per_question: clamp(section.marks_per_question - 1, 1, 100) })}
                  disabled={section.marks_per_question <= 1 || section.type === "case_study"}
                >
                  -
                </button>
                <input
                  id={"sec-" + section.id + "-mpq"}
                  type="number"
                  className="gk-stepper__input"
                  value={
                    section.type === "case_study"
                      ? calculateCaseMarks(section.case_study_config)
                      : section.marks_per_question
                  }
                  readOnly={section.type === "case_study"}
                  min={1}
                  max={100}
                  onChange={(e) => update({ marks_per_question: clamp(parseInt(e.target.value) || 1, 1, 100) })}
                />
                <button
                  type="button"
                  className="gk-stepper__btn"
                  onClick={() => update({ marks_per_question: clamp(section.marks_per_question + 1, 1, 100) })}
                  disabled={section.marks_per_question >= 100 || section.type === "case_study"}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Internal Choice (OR Questions) Config */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: (section.internal_choice_count || 0) > 0 ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
              border: (section.internal_choice_count || 0) > 0 ? "1px solid rgba(99, 102, 241, 0.28)" : "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "14px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Shuffle size={14} style={{ color: (section.internal_choice_count || 0) > 0 ? "var(--primary, #6366f1)" : "var(--text-3)" }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-1)" }}>
                  Internal Choice (OR Options)
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "2px 0 0 0" }}>
                {(section.internal_choice_count || 0) > 0
                  ? `${section.internal_choice_count} of ${section.num_questions} question(s) will have an "OR" alternative choice`
                  : "No internal choice (all questions compulsory)"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  className={`gk-btn gk-btn--sm ${(section.internal_choice_count || 0) === 0 ? "gk-btn--primary" : "gk-btn--ghost"}`}
                  style={{ fontSize: "11px", padding: "2px 8px", height: "26px" }}
                  onClick={() => update({ internal_choice_count: 0 })}
                >
                  None
                </button>
                <button
                  type="button"
                  className={`gk-btn gk-btn--sm ${(section.internal_choice_count || 0) === 1 ? "gk-btn--primary" : "gk-btn--ghost"}`}
                  style={{ fontSize: "11px", padding: "2px 8px", height: "26px" }}
                  onClick={() => update({ internal_choice_count: 1 })}
                >
                  1 Q
                </button>
                <button
                  type="button"
                  className={`gk-btn gk-btn--sm ${(section.internal_choice_count || 0) === section.num_questions ? "gk-btn--primary" : "gk-btn--ghost"}`}
                  style={{ fontSize: "11px", padding: "2px 8px", height: "26px" }}
                  onClick={() => update({ internal_choice_count: section.num_questions })}
                >
                  All ({section.num_questions})
                </button>
              </div>

              <div className="gk-stepper" style={{ height: "28px" }}>
                <button
                  type="button"
                  className="gk-stepper__btn"
                  onClick={() => update({ internal_choice_count: clamp((section.internal_choice_count || 0) - 1, 0, section.num_questions) })}
                  disabled={(section.internal_choice_count || 0) <= 0}
                  style={{ padding: "0 8px" }}
                >
                  -
                </button>
                <span style={{ fontSize: "12px", fontWeight: 700, minWidth: "24px", textAlign: "center" }}>
                  {section.internal_choice_count || 0}
                </span>
                <button
                  type="button"
                  className="gk-stepper__btn"
                  onClick={() => update({ internal_choice_count: clamp((section.internal_choice_count || 0) + 1, 0, section.num_questions) })}
                  disabled={(section.internal_choice_count || 0) >= section.num_questions}
                  style={{ padding: "0 8px" }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Case Study Breakdown if type === 'case_study' */}
          {section.type === "case_study" && (
            <CaseStudyBreakdownBuilder
              config={section.case_study_config || PRESETS[0].config}
              numQuestions={section.num_questions}
              onChange={(newCfg) => {
                const m = calculateCaseMarks(newCfg);
                update({ case_study_config: newCfg, marks_per_question: m });
              }}
            />
          )}

          {/* Syllabus Scope / Chapter Focus (Gurukul AI 2.0 Multi-RAG) */}
          <div className="gk-field" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label
                className="gk-label"
                htmlFor={"sec-" + section.id + "-scope"}
                style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>🎯 Syllabus Scope / Chapter Focus</span>
              </label>
              <span style={{ fontSize: "10.5px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                Multi-RAG Scoping
              </span>
            </div>
            <input
              id={"sec-" + section.id + "-scope"}
              type="text"
              className="gk-input"
              value={section.topic_query || ""}
              onChange={(e) => update({ topic_query: e.target.value || null })}
              placeholder="e.g. Chapter 3: Kinematics & Laws of Motion (leave empty for full syllabus)"
              style={{ width: "100%", height: "38px", fontSize: "13px" }}
            />
          </div>

          <div className="gk-field" style={{ marginBottom: 14 }}>
            <label className="gk-label" htmlFor={"sec-" + section.id + "-bloom"}>
              Bloom's Cognitive Level (Optional)
            </label>
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
        </>
      )}

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

      <div
        style={{
          display: "grid",
          gridTemplateRows: showInstructions ? "1fr" : "0fr",
          transition: "grid-template-rows 0.28s ease",
          overflow: "hidden",
        }}
      >
        <div style={{ minHeight: 0 }}>
          <div style={{ paddingTop: 10 }}>
            <textarea
              className="gk-textarea"
              rows={2}
              placeholder="e.g. All questions in Section C are compulsory. Internal choices are provided in questions 14 and 18."
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
