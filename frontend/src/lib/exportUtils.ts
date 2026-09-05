import type { GeneratedExam } from "@/types/template";
import { parseMatchText } from "@/components/MatchQuestionView";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Footer,
  PageNumber,
} from "docx";

export const SAMPLE_EXAM_JSON: GeneratedExam = {
  exam_id: "00000000-0000-0000-0000-000000000001",
  subject: "Computer Science & Data Structures",
  grade: "BCA 1st Year",
  total_marks: 50,
  duration_minutes: 60,
  heading_details: "<p style=\"text-align: center;\"><strong style=\"font-size: 16pt;\">Dev Sanskriti Vishwavidyalaya</strong></p><p style=\"text-align: center; font-size: 12pt;\">Department of Computer Science | Mid-Term Examination</p><p style=\"text-align: center;\"><strong>Course:</strong> BCA &nbsp;|&nbsp; <strong>Semester:</strong> 1st &nbsp;|&nbsp; <strong>Session:</strong> 2026-27</p>",
  instructions: "<ol><li>All questions are compulsory and carry specified marks.</li><li>Read each question carefully before attempting.</li><li>Calculators, mobile devices, and unauthorized materials are strictly prohibited.</li><li>Write neat and legible answers in the answer script.</li></ol>",
  sections: [
    {
      id: "sec_a",
      title: "Section A",
      type: "mcq",
      num_questions: 2,
      marks_per_question: 1,
      instructions: "Multiple Choice Questions (1 Mark Each)",
      bloom_level: "remember",
    },
    {
      id: "sec_b",
      title: "Section B",
      type: "short_answer",
      num_questions: 2,
      marks_per_question: 5,
      instructions: "Short Conceptual Questions (5 Marks Each)",
      bloom_level: "understand",
    },
    {
      id: "sec_c",
      title: "Section C",
      type: "long_answer",
      num_questions: 1,
      marks_per_question: 10,
      instructions: "Comprehensive Descriptive Problems (10 Marks Each)",
      bloom_level: "apply",
    },
  ],
  questions: [
    {
      section_id: "sec_a",
      question_no: 1,
      type: "mcq",
      text: "Which data structure follows the LIFO (Last In First Out) principle?",
      options: [
        { key: "A", text: "Queue" },
        { key: "B", text: "Stack" },
        { key: "C", text: "Linked List" },
        { key: "D", text: "Binary Search Tree" },
      ],
      answer: "B",
      marks: 1,
      bloom_level: "remember",
      difficulty: "easy",
    },
    {
      section_id: "sec_a",
      question_no: 2,
      type: "mcq",
      text: "What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?",
      options: [
        { key: "A", text: "O(1)" },
        { key: "B", text: "O(n)" },
        { key: "C", text: "O(log n)" },
        { key: "D", text: "O(n log n)" },
      ],
      answer: "C",
      marks: 1,
      bloom_level: "understand",
      difficulty: "easy",
    },
    {
      section_id: "sec_b",
      question_no: 3,
      type: "short_answer",
      text: "Explain the primary differences between an Array and a Singly Linked List in terms of memory allocation and insertion complexity.",
      options: null,
      answer: "Arrays allocate contiguous memory with fixed size and O(n) insertion at beginning. Linked Lists allocate non-contiguous nodes dynamically using pointers with O(1) insertion at the head.",
      marks: 5,
      bloom_level: "understand",
      difficulty: "medium",
    },
    {
      section_id: "sec_b",
      question_no: 4,
      type: "short_answer",
      text: "Define a Circular Queue. Why is a Circular Queue advantageous over a simple Linear Queue implemented via an array?",
      options: null,
      answer: "A circular queue connects the last position back to the first in a circle. It prevents memory wastage caused by unused space at the front of a linear queue after multiple dequeue operations.",
      marks: 5,
      bloom_level: "analyze",
      difficulty: "medium",
    },
    {
      section_id: "sec_c",
      question_no: 5,
      type: "long_answer",
      text: "Define In-Order, Pre-Order, and Post-Order traversals of a Binary Tree. Given a binary tree with root node 50, left child 30, right child 70, left-left 20, and left-right 40, write out all three traversals step-by-step.",
      options: null,
      answer: "In-Order: 20 -> 30 -> 40 -> 50 -> 70. Pre-Order: 50 -> 30 -> 20 -> 40 -> 70. Post-Order: 20 -> 40 -> 30 -> 70 -> 50.",
      marks: 10,
      bloom_level: "apply",
      difficulty: "hard",
    },
  ],
  retries_used: 0,
  llm_provider: "imported_json",
  llm_model: "custom",
};

/**
 * Downloads a GeneratedExam object as a formatted .json file
 */
export function downloadExamAsJson(exam: GeneratedExam, customFilename?: string) {
  const safeSubject = (exam.subject || "question-paper")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const shortId = exam.exam_id ? exam.exam_id.slice(0, 8) : "custom";
  const filename = customFilename || `${safeSubject}-${shortId}.json`;

  const jsonStr = JSON.stringify(exam, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the standard editable JSON template sample
 */
export function downloadSampleTemplateJson() {
  downloadExamAsJson(SAMPLE_EXAM_JSON, "gurukul-question-paper-template.json");
}

/**
 * Strips HTML tags and decodes common HTML entities into clean readable plaintext
 */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*[\/]?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns a human-friendly clean title for an exam (stripping any raw HTML from rich-text headers)
 */
export function getCleanExamTitle(
  headingDetails?: string | null,
  subject?: string | null,
  grade?: string | null,
  maxLen: number = 75
): string {
  const cleanHeader = stripHtml(headingDetails);
  if (cleanHeader) {
    return cleanHeader.length > maxLen ? cleanHeader.slice(0, maxLen - 3) + "..." : cleanHeader;
  }
  if (subject) {
    return `${subject}${grade ? ` (${grade})` : ""} Exam`;
  }
  return "Question Paper";
}

/**
 * Downloads a GeneratedExam as a clean GitHub-Flavored Markdown (.md) document
 */
export function downloadExamAsMarkdown(exam: GeneratedExam, includeAnswerKey: boolean = false) {
  const safeSubject = (exam.subject || "question-paper")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = includeAnswerKey ? "-with-answers" : "";
  const filename = `${safeSubject}${suffix}.md`;

  const lines: string[] = [];
  lines.push(`# ${exam.subject || "Examination Paper"}`);
  if (exam.grade) lines.push(`**Grade / Course:** ${exam.grade}`);
  lines.push(`**Total Marks:** ${exam.total_marks || 100} &nbsp;|&nbsp; **Duration:** ${exam.duration_minutes || 60} Minutes`);
  lines.push("");

  const cleanHeader = stripHtml(exam.heading_details);
  if (cleanHeader) {
    lines.push(`> ${cleanHeader}`);
    lines.push("");
  }

  const cleanInst = stripHtml(exam.instructions);
  if (cleanInst) {
    lines.push(`### General Instructions:`);
    lines.push(cleanInst);
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  const uniqueSecIds = Array.from(new Set(exam.questions.map((q) => q.section_id)));

  exam.questions.forEach((q, idx) => {
    const isFirstInSec = idx === 0 || q.section_id !== exam.questions[idx - 1].section_id;
    const secIndex = uniqueSecIds.indexOf(q.section_id);
    const secLetter = String.fromCharCode(65 + (secIndex >= 0 ? secIndex : 0));
    const sectionMeta = exam.sections?.find((s) => s.id === q.section_id);

    if (isFirstInSec) {
      const secTitle = sectionMeta?.title
        ? sectionMeta.title.trim().toUpperCase().startsWith("SECTION")
          ? sectionMeta.title.trim().toUpperCase()
          : `SECTION ${secLetter} — ${sectionMeta.title.trim().toUpperCase()}`
        : `SECTION ${secLetter} — ${q.type.replace("_", " ").toUpperCase()}`;

      lines.push(`## ${secTitle}`);
      lines.push(`*Each question carries ${q.marks} Mark${q.marks > 1 ? "s" : ""}*`);
      if (sectionMeta?.instructions) {
        lines.push(`_${sectionMeta.instructions}_`);
      }
      lines.push("");
    }

    lines.push(`**Q${q.question_no}.** ${q.text}  *(${q.marks} Mark${q.marks > 1 ? "s" : ""})*`);
    lines.push("");

    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => {
        lines.push(`- **(${opt.key})** ${opt.text}`);
      });
      lines.push("");
    }

    if (includeAnswerKey && q.answer) {
      lines.push(`> **Correct Answer / Marking Scheme:** \`${q.answer}\``);
      lines.push("");
    }
  });

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clean raw LaTeX math notation into crisp, standardized academic notation for Word documents.
 */
export function cleanLatexMath(str: string): string {
  if (!str) return "";
  let s = str;

  // Unescape literal \n
  s = s.replace(/\\n/g, "\n");

  // Vector notations: \vec{F} or \vec${F} or $\vec{F}$ or \vec{v}
  s = s.replace(/\\vec\$?\{?([a-zA-Z0-9])\}?/g, "$1⃗");

  // Chemistry / atomic notation: \ce{...}
  s = s.replace(/\\ce\{([^}]+)\}/g, "$1");

  // Common physics constants & Greek letters
  s = s.replace(/\\hbar\b/g, "ℏ");
  s = s.replace(/\\Delta\b/g, "Δ");
  s = s.replace(/\\delta\b/g, "δ");
  s = s.replace(/\\theta\b/g, "θ");
  s = s.replace(/\\mu\b/g, "μ");
  s = s.replace(/\\lambda\b/g, "λ");
  s = s.replace(/\\alpha\b/g, "α");
  s = s.replace(/\\beta\b/g, "β");
  s = s.replace(/\\gamma\b/g, "γ");
  s = s.replace(/\\omega\b/g, "ω");
  s = s.replace(/\\Omega\b/g, "Ω");
  s = s.replace(/\\pi\b/g, "π");
  s = s.replace(/\\sigma\b/g, "σ");
  s = s.replace(/\\phi\b/g, "ϕ");
  s = s.replace(/\\tau\b/g, "τ");
  s = s.replace(/\\rho\b/g, "ρ");
  s = s.replace(/\\epsilon\b/g, "ε");

  // Math operators
  s = s.replace(/\\times\b/g, "×");
  s = s.replace(/\\pm\b/g, "±");
  s = s.replace(/\\mp\b/g, "∓");
  s = s.replace(/\\approx\b/g, "≈");
  s = s.replace(/\\neq\b/g, "≠");
  s = s.replace(/\\le\b|\\leq\b/g, "≤");
  s = s.replace(/\\ge\b|\\geq\b/g, "≥");
  s = s.replace(/\\infty\b/g, "∞");
  s = s.replace(/\\cdot\b/g, "·");
  s = s.replace(/\\rightarrow\b|\\to\b/g, "→");
  s = s.replace(/\\leftarrow\b/g, "←");
  s = s.replace(/\\circ\b/g, "°");
  s = s.replace(/\\partial\b/g, "∂");

  // Trig and log functions
  s = s.replace(/\\(?:sin|cos|tan|sec|csc|cot|ln|log|exp)\b/g, (m) => m.slice(1));

  // Common Vulgar fractions
  s = s.replace(/\\frac\{1\}\{2\}/g, "½");
  s = s.replace(/\\frac\{1\}\{4\}/g, "¼");
  s = s.replace(/\\frac\{3\}\{4\}/g, "¾");
  s = s.replace(/\\frac\{1\}\{3\}/g, "⅓");
  s = s.replace(/\\frac\{2\}\{3\}/g, "⅔");
  s = s.replace(/\\frac\{1\}\{5\}/g, "⅕");
  s = s.replace(/\\frac\{2\}\{5\}/g, "⅖");
  s = s.replace(/\\frac\{3\}\{5\}/g, "⅗");
  s = s.replace(/\\frac\{4\}\{5\}/g, "⅘");
  s = s.replace(/\\frac\{1\}\{6\}/g, "⅙");
  s = s.replace(/\\frac\{1\}\{8\}/g, "⅛");

  // General \frac{num}{den}
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_match, num, den) => {
    const n = num.trim();
    const d = den.trim();
    const needsNumParen = n.includes("+") || n.includes("-") || n.includes(" ") || n.includes("·");
    const needsDenParen = d.includes("+") || d.includes("-") || d.includes(" ") || d.includes("·") || d.length > 3;
    const nStr = needsNumParen ? `(${n})` : n;
    const dStr = needsDenParen ? `(${d})` : d;
    return `${nStr} / ${dStr}`;
  });

  // Square roots \sqrt{...}
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");

  // Clean \text{...} and \mathrm{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^{}]+)\}/g, "$1");

  // Strip dollar signs
  s = s.replace(/\$/g, "");

  return s;
}

/**
 * Tokenize text into Word TextRuns with proper superscripts, subscripts, and font settings.
 */
export function formatTextToDocxRuns(
  rawText: string,
  options: {
    size?: number;
    font?: string;
    color?: string;
    bold?: boolean;
    italics?: boolean;
  } = {}
): TextRun[] {
  const {
    size = 20,
    font = "Calibri",
    color = "1e293b",
    bold = false,
    italics = false,
  } = options;

  if (!rawText) return [];

  const cleaned = cleanLatexMath(rawText);

  // Match superscripts ^... and subscripts _...
  const tokens: { text: string; isSuper: boolean; isSub: boolean }[] = [];
  const scriptRegex = /(\^\{([^{}]+)\}|\^([0-9a-zA-Z\+\-]+)|_\{([^{}]+)\}|_([0-9a-zA-Z\+\-]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: cleaned.slice(lastIndex, match.index), isSuper: false, isSub: false });
    }
    if (match[1].startsWith("^")) {
      const exp = match[2] || match[3];
      tokens.push({ text: exp, isSuper: true, isSub: false });
    } else if (match[1].startsWith("_")) {
      const sub = match[4] || match[5];
      tokens.push({ text: sub, isSuper: false, isSub: true });
    }
    lastIndex = scriptRegex.lastIndex;
  }
  if (lastIndex < cleaned.length) {
    tokens.push({ text: cleaned.slice(lastIndex), isSuper: false, isSub: false });
  }

  return tokens.map((tok) => {
    return new TextRun({
      text: tok.text,
      font,
      size: tok.isSuper || tok.isSub ? Math.max(14, size - 4) : size,
      color,
      bold,
      italics,
      superScript: tok.isSuper,
      subScript: tok.isSub,
    });
  });
}

/**
 * Parses rich HTML header directly from Header Editor into faithful Word paragraphs.
 */
export function parseHtmlHeaderToDocx(html?: string | null, fallbackSubject: string = "General"): Paragraph[] {
  if (!html || !html.trim()) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 140 },
        children: [
          new TextRun({
            text: `${fallbackSubject} Examination`,
            bold: true,
            size: 28, // 14pt
            font: "Calibri",
            color: "0f172a",
          }),
        ],
      }),
    ];
  }

  // Client-side DOM parsing (accurate for all rich text HTML)
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const blocks = Array.from(doc.body.children);

      if (blocks.length > 0) {
        const paragraphs: Paragraph[] = [];

        blocks.forEach((el, bIdx) => {
          const alignStyle = el.getAttribute("style") || "";
          const alignAttr = el.getAttribute("align") || "";
          let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER;
          if (/text-align:\s*right/i.test(alignStyle) || alignAttr === "right") {
            alignment = AlignmentType.RIGHT;
          } else if (/text-align:\s*left/i.test(alignStyle) || alignAttr === "left") {
            alignment = AlignmentType.LEFT;
          }

          const runs: TextRun[] = [];
          function walk(
            node: Node,
            currentStyles: { bold?: boolean; italics?: boolean; underline?: boolean; font?: string; size?: number }
          ) {
            if (node.nodeType === Node.TEXT_NODE) {
              const txt = node.textContent?.replace(/\u00a0/g, " ") || "";
              if (txt.trim().length > 0 || txt === " ") {
                runs.push(
                  new TextRun({
                    text: txt,
                    bold: currentStyles.bold,
                    italics: currentStyles.italics,
                    underline: currentStyles.underline ? {} : undefined,
                    font: currentStyles.font || "Calibri",
                    size: currentStyles.size || (bIdx === 0 ? 28 : (bIdx === 1 ? 24 : 20)),
                    color: bIdx === 0 ? "0f172a" : "334155",
                  })
                );
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const elem = node as HTMLElement;
              const tag = elem.tagName.toLowerCase();
              const style = elem.getAttribute("style") || "";
              const fontMatch = style.match(/font-family:\s*([^;\"']+)/i);
              const sizeMatch = style.match(/font-size:\s*(\d+)pt/i);

              const newStyles = {
                ...currentStyles,
                bold: currentStyles.bold || ["strong", "b", "h1", "h2", "h3"].includes(tag) || /font-weight:\s*(?:bold|[789]00)/i.test(style),
                italics: currentStyles.italics || ["em", "i"].includes(tag) || /font-style:\s*italic/i.test(style),
                underline: currentStyles.underline || tag === "u" || /text-decoration:\s*underline/i.test(style),
                font: fontMatch ? fontMatch[1].trim() : currentStyles.font,
                size: sizeMatch
                  ? parseInt(sizeMatch[1], 10) * 2
                  : (tag === "h1" ? 32 : tag === "h2" ? 28 : tag === "h3" ? 24 : currentStyles.size),
              };

              if (tag === "br") {
                runs.push(new TextRun({ break: 1 }));
              } else {
                elem.childNodes.forEach((child) => walk(child, newStyles));
              }
            }
          }

          walk(el, {});

          if (runs.length > 0) {
            paragraphs.push(
              new Paragraph({
                alignment,
                spacing: { before: bIdx === 0 ? 60 : 20, after: bIdx === blocks.length - 1 ? 160 : 40 },
                children: runs,
              })
            );
          }
        });

        if (paragraphs.length > 0) return paragraphs;
      }
    } catch {
      // fallback to regex below
    }
  }

  // Universal regex fallback
  const blockMatches = Array.from(html.matchAll(/<(p|div|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi));
  const rawBlocks = blockMatches.length > 0 ? blockMatches.map((m) => m[0]) : html.split(/<br\s*\/?>/i);
  const paragraphs: Paragraph[] = [];

  rawBlocks.forEach((rawBlock, idx) => {
    const isRight = /text-align:\s*right/i.test(rawBlock) || /align=[\"']right[\"']/i.test(rawBlock);
    const isLeft = /text-align:\s*left/i.test(rawBlock) || /align=[\"']left[\"']/i.test(rawBlock);
    const alignment = isRight ? AlignmentType.RIGHT : (isLeft ? AlignmentType.LEFT : AlignmentType.CENTER);

    const fontMatch = rawBlock.match(/font-family:\s*([^;\"']+)/i);
    const fontFamily = fontMatch ? fontMatch[1].trim() : "Calibri";
    const sizeMatch = rawBlock.match(/font-size:\s*(\d+)pt/i);
    const fontSize = sizeMatch ? parseInt(sizeMatch[1], 10) * 2 : (idx === 0 ? 28 : (idx === 1 ? 24 : 20));

    const cleanText = rawBlock
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();

    if (cleanText) {
      paragraphs.push(
        new Paragraph({
          alignment,
          spacing: { before: idx === 0 ? 60 : 20, after: idx === rawBlocks.length - 1 ? 160 : 40 },
          children: [
            new TextRun({
              text: cleanText,
              bold: /<strong>|<b>|<h[1-3]/i.test(rawBlock),
              italics: /<em>|<i>/i.test(rawBlock),
              underline: /<u>/i.test(rawBlock) ? {} : undefined,
              size: fontSize,
              font: fontFamily,
              color: idx === 0 ? "0f172a" : "334155",
            }),
          ],
        })
      );
    }
  });

  return paragraphs.length > 0 ? paragraphs : [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 140 },
      children: [
        new TextRun({
          text: `${fallbackSubject} Examination`,
          bold: true,
          size: 28,
          font: "Calibri",
          color: "0f172a",
        }),
      ],
    }),
  ];
}

/**
 * Downloads a GeneratedExam as a true native Microsoft Word (.docx) OpenXML binary document.
 * 100% compliant with Microsoft Office, LibreOffice, Apple Pages, and Google Docs without corruption alerts.
 */
export async function downloadExamAsDocx(exam: GeneratedExam, includeAnswerKey: boolean = false) {
  const safeSubject = (exam.subject || "question-paper")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = includeAnswerKey ? "-with-answers" : "";
  const filename = `${safeSubject}${suffix}.docx`;

  const cleanInst = stripHtml(exam.instructions);

  const children: (Paragraph | Table)[] = [];

  // 1. Institution / Exam Header (Exact styling from Header Editor)
  const headerParas = parseHtmlHeaderToDocx(exam.heading_details, exam.subject || "General");
  children.push(...headerParas);

  // Optional: Answer Key Subtitle banner if exporting marking scheme
  if (includeAnswerKey) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 120 },
        children: [
          new TextRun({
            text: "ANSWER KEY & MARKING SCHEME",
            bold: true,
            size: 22,
            font: "Calibri",
            color: "b45309",
          }),
        ],
      })
    );
  }

  // 3. Metadata Table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Subject: ", bold: true, size: 20, font: "Calibri" }),
                    new TextRun({ text: exam.subject || "General", size: 20, font: "Calibri" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Duration: ", bold: true, size: 20, font: "Calibri" }),
                    new TextRun({ text: `${exam.duration_minutes || 60} Minutes`, size: 20, font: "Calibri" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Grade/Course: ", bold: true, size: 20, font: "Calibri" }),
                    new TextRun({ text: exam.grade || "Standard", size: 20, font: "Calibri" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: "Max Marks: ", bold: true, size: 20, font: "Calibri" }),
                    new TextRun({ text: String(exam.total_marks || 100), bold: true, size: 20, font: "Calibri" }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: "Exam ID: ", size: 18, font: "Calibri", color: "64748b" }),
                    new TextRun({ text: exam.exam_id ? exam.exam_id.slice(0, 8) : "N/A", size: 18, font: "Calibri", color: "64748b" }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // 4. Instructions
  if (cleanInst) {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 40 },
        children: [
          new TextRun({ text: "GENERAL INSTRUCTIONS:", bold: true, size: 20, font: "Calibri", color: "334155" }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: cleanInst, italics: true, size: 19, font: "Calibri", color: "475569" }),
        ],
      })
    );
  }

  // 5. Questions & Sections
  const uniqueSecIds = Array.from(new Set(exam.questions.map((q) => q.section_id)));

  exam.questions.forEach((q, idx) => {
    const isFirstInSec = idx === 0 || q.section_id !== exam.questions[idx - 1].section_id;
    const secIndex = uniqueSecIds.indexOf(q.section_id);
    const secLetter = String.fromCharCode(65 + (secIndex >= 0 ? secIndex : 0));
    const sectionMeta = exam.sections?.find((s) => s.id === q.section_id);

    if (isFirstInSec) {
      const secTitle = sectionMeta?.title
        ? sectionMeta.title.trim().toUpperCase().startsWith("SECTION")
          ? sectionMeta.title.trim().toUpperCase()
          : `SECTION ${secLetter} — ${sectionMeta.title.trim().toUpperCase()}`
        : `SECTION ${secLetter} — ${q.type.replace("_", " ").toUpperCase()}`;

      children.push(
        new Paragraph({
          spacing: { before: 240, after: 60 },
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          children: [
            new TextRun({
              text: ` ${secTitle} `,
              bold: true,
              size: 21,
              font: "Calibri",
              color: "0f172a",
            }),
            new TextRun({
              text: ` (Each question carries ${q.marks} Mark${q.marks > 1 ? "s" : ""})`,
              size: 19,
              font: "Calibri",
              color: "64748b",
            }),
          ],
        })
      );

      if (sectionMeta?.instructions) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: sectionMeta.instructions,
                italics: true,
                size: 19,
                font: "Calibri",
                color: "64748b",
              }),
            ],
          })
        );
      }
    }

    // Question statement & content
    if (q.type === "match_the_following") {
      const parsedMatch = parseMatchText(q.text);

      if (parsedMatch.hasColumns) {
        // Question prompt line
        children.push(
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: `Q${q.question_no}. `,
                bold: true,
                size: 21,
                font: "Calibri",
                color: "0f172a",
              }),
              ...formatTextToDocxRuns(parsedMatch.premise || "Match the items in Column I with Column II:", {
                size: 21,
                color: "1e293b",
              }),
              new TextRun({
                text: `  [${q.marks} Mark${q.marks > 1 ? "s" : ""}]`,
                bold: true,
                size: 19,
                font: "Calibri",
                color: "b45309",
              }),
            ],
          })
        );

        // 2-Column Word Table for Column I and Column II
        const maxRows = Math.max(parsedMatch.columnA.length, parsedMatch.columnB.length);
        const tableRows: TableRow[] = [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "F8FAFC" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
                  left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                },
                children: [
                  new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: "Column I", bold: true, size: 20, font: "Calibri", color: "1e293b" }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "F8FAFC" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
                  left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                },
                children: [
                  new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({ text: "Column II", bold: true, size: 20, font: "Calibri", color: "1e293b" }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ];

        for (let r = 0; r < maxRows; r++) {
          const itemA = parsedMatch.columnA[r];
          const itemB = parsedMatch.columnB[r];

          const aRuns: TextRun[] = itemA
            ? [
                new TextRun({ text: `${itemA.id}. `, bold: true, size: 20, font: "Calibri", color: "0f172a" }),
                ...formatTextToDocxRuns(itemA.text, { size: 20 }),
              ]
            : [];

          const bRuns: TextRun[] = itemB
            ? [
                new TextRun({ text: `(${itemB.id}) `, bold: true, size: 20, font: "Calibri", color: "0f172a" }),
                ...formatTextToDocxRuns(itemB.text, { size: 20 }),
              ]
            : [];

          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  },
                  children: [
                    new Paragraph({
                      spacing: { before: 30, after: 30 },
                      children: aRuns.length > 0 ? aRuns : [new TextRun({ text: "" })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  },
                  children: [
                    new Paragraph({
                      spacing: { before: 30, after: 30 },
                      children: bRuns.length > 0 ? bRuns : [new TextRun({ text: "" })],
                    }),
                  ],
                }),
              ],
            })
          );
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          })
        );
      } else {
        // Fallback if columns could not be extracted
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: `Q${q.question_no}. `,
                bold: true,
                size: 21,
                font: "Calibri",
                color: "0f172a",
              }),
              ...formatTextToDocxRuns(q.text, { size: 21, color: "1e293b" }),
              new TextRun({
                text: `  [${q.marks} Mark${q.marks > 1 ? "s" : ""}]`,
                bold: true,
                size: 19,
                font: "Calibri",
                color: "b45309",
              }),
            ],
          })
        );
      }
    } else {
      // Standard Question statement with formatted math
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `Q${q.question_no}. `,
              bold: true,
              size: 21,
              font: "Calibri",
              color: "0f172a",
            }),
            ...formatTextToDocxRuns(q.text, { size: 21, color: "1e293b" }),
            new TextRun({
              text: `  [${q.marks} Mark${q.marks > 1 ? "s" : ""}]`,
              bold: true,
              size: 19,
              font: "Calibri",
              color: "b45309",
            }),
          ],
        })
      );
    }

    // Question options
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt: any) => {
        children.push(
          new Paragraph({
            indent: { left: 420 },
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: `(${opt.key}) `,
                bold: true,
                size: 20,
                font: "Calibri",
                color: "334155",
              }),
              ...formatTextToDocxRuns(opt.text, { size: 20, color: "1e293b" }),
            ],
          })
        );
      });
    }

    // Answer key
    if (includeAnswerKey && q.answer) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 100 },
          indent: { left: 300 },
          shading: { type: ShadingType.CLEAR, fill: "ECFDF5" },
          children: [
            new TextRun({
              text: "  ✓ Model Solution / Marking Scheme: ",
              bold: true,
              size: 19,
              font: "Calibri",
              color: "047857",
            }),
            ...formatTextToDocxRuns(String(q.answer), { size: 19, color: "065f46" }),
          ],
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Gurukul AI Assessment Studio • Page ",
                    size: 17,
                    font: "Calibri",
                    color: "94a3b8",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 17,
                    font: "Calibri",
                    color: "94a3b8",
                  }),
                  new TextRun({
                    text: " of ",
                    size: 17,
                    font: "Calibri",
                    color: "94a3b8",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 17,
                    font: "Calibri",
                    color: "94a3b8",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
