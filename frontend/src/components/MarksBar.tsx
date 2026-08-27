"use client";

interface MarksBarProps {
  computed: number;
  total: number;
}

export default function MarksBar({ computed, total }: MarksBarProps) {
  const pct = total > 0 ? Math.min((computed / total) * 100, 100) : 0;
  const isOver = computed > total;
  const isMatch = computed === total;

  return (
    <div className="marks-bar-wrap">
      <div className="marks-bar-info">
        <span className="marks-bar-label">Section Marks</span>
        <span
          className={`marks-bar-value ${
            isOver ? "marks-bar-value--over" : isMatch ? "marks-bar-value--match" : ""
          }`}
        >
          {computed} / {total}
          {isMatch && " ✓"}
          {isOver && " — over by " + (computed - total)}
        </span>
      </div>
      <div className="marks-bar">
        <div
          className={`marks-bar__fill ${
            isOver ? "marks-bar__fill--over" : isMatch ? "marks-bar__fill--match" : ""
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isMatch && !isOver && (
        <p style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }}>
          Add {total - computed} more marks across your sections to match the total.
        </p>
      )}
    </div>
  );
}
