import type { GeneratedExam } from "@/types/template";

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
