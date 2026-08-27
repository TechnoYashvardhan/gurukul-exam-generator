// Central TypeScript types mirroring the backend Pydantic schemas

export type QuestionType =
  | "mcq"
  | "short_answer"
  | "long_answer"
  | "case_study"
  | "fill_in_the_blanks"
  | "true_false"
  | "match_the_following"
  | "one_word";
export type Difficulty = "easy" | "medium" | "hard" | "extreme";

export interface Section {
  id: string;
  title: string;
  type: QuestionType;
  num_questions: number;
  marks_per_question: number;
  instructions: string | null;
  bloom_level?: string | null;
}

export interface ExamTemplate {
  subject: string;
  grade: string;
  difficulty: Difficulty;
  bloom_level: string | null;
  total_marks: number;
  duration_minutes: number;
  heading_details?: string | null;
  instructions?: string | null;
  sections: Section[];
}

export interface SaveTemplateRequest {
  name: string;
  template: ExamTemplate;
}

export interface TemplateSummary {
  id: string;
  name: string;
  subject: string | null;
  grade: string | null;
  total_marks: number;
  num_sections: number;
  created_at: string;
}

export interface TemplateDetail extends TemplateSummary {
  config: ExamTemplate;
}

// MCQ option for exam output
export interface MCQOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface Question {
  section_id: string;
  question_no: number;
  type: QuestionType;
  text: string;
  options: MCQOption[] | null;
  answer: string;
  marks: number;
  bloom_level: string;
  difficulty: Difficulty;
}

export interface GeneratedExam {
  exam_id: string;
  subject: string;
  grade: string;
  total_marks: number;
  duration_minutes: number;
  heading_details?: string | null;
  instructions?: string | null;
  sections?: Section[] | null;
  questions: Question[];
  retries_used: number;
  llm_provider: string;
  llm_model: string;
}
