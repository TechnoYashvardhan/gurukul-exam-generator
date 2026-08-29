export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  email: string;
  scholar_id?: string | null;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  class_id?: string | null;
  class_name?: string | null;
}

export interface ClassSummary {
  id: string;
  name: string;
  course: string;
  section?: string | null;
  created_at: string;
  student_count: number;
  assigned_quizzes_count: number;
}

export interface StudentRosterItem {
  id: string;
  scholar_id: string;
  full_name: string;
  email: string;
  class_id?: string | null;
  class_name?: string | null;
  created_at: string;
  attempts_count: number;
  avg_percentage: number;
  highest_percentage: number;
  last_attempt_at?: string | null;
}

export interface StudentReportAttempt {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  subject: string;
  grade: string;
  score: number;
  total_marks: number;
  percentage: number;
  time_spent_seconds: number;
  created_at: string;
  breakdown: {
    question_no: number;
    text: string;
    type: string;
    marks: number;
    options?: { key: string; text: string }[] | null;
    correct_answer?: string;
    user_answer?: string | null;
    is_correct: boolean;
    score_awarded: number;
    evaluation_reason?: string | null;
  }[];
}

export interface StudentFullReport {
  student_id: string;
  scholar_id: string;
  full_name: string;
  email: string;
  class_name?: string | null;
  course?: string | null;
  total_quizzes_taken: number;
  overall_avg_percentage: number;
  overall_highest_percentage: number;
  total_time_spent_seconds: number;
  attempts: StudentReportAttempt[];
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
  schedule_start_at?: string | null;
  schedule_end_at?: string | null;
  is_active_window?: boolean;
  status_label?: string | null;
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

export interface PublishedQuizSummary {
  id: string;
  subject: string;
  grade: string;
  title: string;
  target_class_id?: string | null;
  target_class_name: string;
  target_course?: string | null;
  schedule_start_at?: string | null;
  schedule_end_at?: string | null;
  is_active_window: boolean;
  status_label: string;
  total_marks: number;
  duration_minutes: number;
  num_questions: number;
  created_at: string;
  total_attempts: number;
  unique_students_count: number;
  avg_score_percentage: number;
  highest_percentage: number;
  lowest_percentage: number;
  pass_rate_percentage: number;
  avg_time_spent_seconds: number;
}

export interface PublishedQuizStudentAttempt {
  attempt_id: string;
  student_id: string;
  scholar_id: string;
  student_name: string;
  student_email: string;
  class_name?: string | null;
  score: number;
  total_marks: number;
  percentage: number;
  time_spent_seconds: number;
  submitted_at: string;
  questions_feedback: QuestionFeedback[];
}

export interface PublishedQuizDetailResponse {
  quiz: PublishedQuizSummary;
  exam_json: any;
  attempts: PublishedQuizStudentAttempt[];
}
