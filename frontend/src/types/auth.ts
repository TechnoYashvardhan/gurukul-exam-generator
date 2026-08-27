export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface QuestionFeedback {
  question_no: number;
  section_id: string;
  type: string;
  text: string;
  options: { key: string; text: string }[] | null;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  marks_awarded: number;
  max_marks: number;
  explanation?: string | null;
}

export interface QuizResult {
  attempt_id: string;
  exam_id: string;
  subject: string;
  grade: string;
  score: number;
  total_marks: number;
  percentage: number;
  time_spent_seconds: number;
  questions_feedback: QuestionFeedback[];
  completed_at: string;
}

export interface QuizListItem {
  id: string;
  subject: string;
  grade: string;
  total_marks: number;
  duration_minutes: number;
  num_questions: number;
  created_at: string;
  heading_details?: string | null;
  instructions?: string | null;
  attempted: boolean;
  best_score?: number | null;
}

export interface StudentStats {
  total_quizzes_attempted: number;
  average_percentage: number;
  highest_percentage: number;
  total_time_spent_minutes: number;
  recent_attempts: {
    id: string;
    exam_id: string;
    subject?: string;
    grade?: string;
    title?: string;
    score: number;
    total_marks: number;
    percentage: number;
    time_spent_seconds: number;
    created_at: string;
  }[];
}
