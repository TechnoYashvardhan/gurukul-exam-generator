import type {
  SaveTemplateRequest,
  TemplateDetail,
  TemplateSummary,
  GeneratedExam,
} from "@/types/template";
import type { DocumentSummary, GenerateWithSourceRequest } from "@/types/document";
import type {
  AuthResponse,
  QuizListItem,
  QuizResult,
  StudentStats,
  User,
  ClassSummary,
  StudentRosterItem,
  StudentFullReport,
  PublishedQuizSummary,
  PublishedQuizDetailResponse,
} from "@/types/auth";

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8001`;
  }
  return "http://localhost:8001";
}

export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api/v1`;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gk_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${getApiUrl()}${path}`, opts);
  if (!res.ok) {
    let errText = await res.text();
    try {
      const parsed = JSON.parse(errText);
      errText = parsed.detail?.message || parsed.detail || errText;
    } catch {}
    throw new Error(errText);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export const templatesApi = {
  list: (role?: "admin" | "teacher" | string) =>
    request<TemplateSummary[]>("GET", `/templates${role ? `?role=${role}` : ""}`),
  get: (id: string) => request<TemplateDetail>("GET", "/templates/" + id),
  create: (payload: SaveTemplateRequest, role?: "admin" | "teacher" | string) =>
    request<{ id: string }>("POST", `/templates${role ? `?role=${role}` : ""}`, payload),
  delete: (id: string) => request<void>("DELETE", "/templates/" + id),
};

export const documentsApi = {
  list: () => request<DocumentSummary[]>("GET", "/documents"),
  get: (id: string) => request<DocumentSummary>("GET", "/documents/" + id),
  upload: async (file: File, subject: string = "", grade: string = ""): Promise<DocumentSummary> => {
    const formData = new FormData();
    formData.append("file", file);
    if (subject) formData.append("subject", subject);
    if (grade) formData.append("grade", grade);

    const res = await fetch(`${getApiUrl()}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      let errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errText = parsed.detail?.message || parsed.detail || errText;
      } catch {}
      throw new Error(errText);
    }
    return res.json();
  },
  waitReady: async (id: string): Promise<DocumentSummary> => {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const doc = await documentsApi.get(id);
      if (doc.status === "ready" || doc.status === "error") return doc;
    }
    throw new Error("Document processing timed out after 2 minutes.");
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      let errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errText = parsed.detail ?? errText;
      } catch {}
      throw new Error(errText);
    }
  },

  webFetch: async (payload: { subject: string; grade: string; extra_keywords?: string; url?: string }): Promise<DocumentSummary> => {
    const res = await fetch(`${getApiUrl()}/documents/web-fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errText = parsed.detail ?? errText;
      } catch {}
      throw new Error(errText);
    }
    return res.json();
  },

  createCustomTopic: async (payload: {
    title: string;
    subject: string;
    grade?: string;
    topics_text: string;
  }): Promise<DocumentSummary> => {
    const res = await fetch(`${getApiUrl()}/documents/custom-topic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errText = parsed.detail ?? errText;
      } catch {}
      throw new Error(errText);
    }
    return res.json();
  },

  extractTopicsPdf: async (file: File): Promise<{
    filename: string;
    extracted_text: string;
    word_count: number;
    char_count: number;
    suggested_subject?: string;
    suggested_title?: string;
  }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${getApiUrl()}/documents/extract-topics-pdf`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      let errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errText = parsed.detail ?? errText;
      } catch {}
      throw new Error(errText);
    }
    return res.json();
  },
};

export const generationApi = {
  generate: async (payload: GenerateWithSourceRequest, onProgress?: (msg: string) => void): Promise<GeneratedExam> => {
    const res = await fetch(`${getApiUrl()}/generate/exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      let errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errText = parsed.detail?.message || parsed.detail || errText;
      } catch {}
      throw new Error(errText);
    }
    
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let finalExam: GeneratedExam | null = null;

    if (!reader) throw new Error("No response body from server.");

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep last partial line in buffer
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.status && onProgress) onProgress(data.status);
          if (data.exam) finalExam = data.exam as GeneratedExam;
          if (data.error) throw new Error(data.error as string);
        } catch (e) {
          if (e instanceof SyntaxError) continue; // partial JSON chunk, skip
          throw e;
        }
      }
    }

    if (!finalExam) throw new Error("Generation finished but no exam was returned.");
    return finalExam;
  },
  publish: (
    id: string,
    publish: boolean = true,
    options?: {
      targetClassId?: string;
      scheduleStartAt?: string;
      scheduleEndAt?: string;
    }
  ) =>
    request<{
      status: string;
      exam_id: string;
      is_published: boolean;
      target_class_id?: string;
      schedule_start_at?: string;
      schedule_end_at?: string;
      message: string;
    }>(
      "POST",
      `/generate/exam/${id}/publish`,
      {
        publish,
        target_class_id: options?.targetClassId,
        schedule_start_at: options?.scheduleStartAt,
        schedule_end_at: options?.scheduleEndAt,
      }
    ),
  importJson: (exam: GeneratedExam) =>
    request<{
      status: string;
      exam: GeneratedExam;
      exam_id: string;
    }>("POST", "/generate/import-json", { exam }),
};

export const adminApi = {
  listClasses: () => request<ClassSummary[]>("GET", "/admin/classes"),
  createClass: (payload: { name: string; course: string; section?: string }) =>
    request<ClassSummary>("POST", "/admin/classes", payload),
  deleteClass: (id: string) => request<void>("DELETE", `/admin/classes/${id}`),
  listClassStudents: (classId: string) => request<StudentRosterItem[]>("GET", `/admin/classes/${classId}/students`),
  addStudent: (classId: string, payload: { scholar_id: string; full_name: string; email: string }) =>
    request<StudentRosterItem>("POST", `/admin/classes/${classId}/students`, payload),
  deleteStudent: (studentId: string) => request<void>("DELETE", `/admin/students/${studentId}`),
  getStudentReport: (studentId: string) => request<StudentFullReport>("GET", `/admin/students/${studentId}/report`),
  listPublishedQuizzes: () => request<PublishedQuizSummary[]>("GET", "/admin/published-quizzes"),
  getPublishedQuizDetail: (examId: string) => request<PublishedQuizDetailResponse>("GET", `/admin/published-quizzes/${examId}/details`),
  unpublishQuiz: (examId: string) => request<{ status: string; message: string }>("POST", `/admin/published-quizzes/${examId}/unpublish`),
  deletePublishedQuiz: (examId: string) => request<{ status: string; message: string }>("DELETE", `/admin/published-quizzes/${examId}`),
};

export const healthApi = {
  check: (): Promise<{ status: string; llm_provider: string; llm_model: string }> =>
    request("GET", "/health"),
};

export const authApi = {
  signup: (payload: { email: string; password: string; full_name?: string; role: string; scholar_id?: string }) =>
    request<AuthResponse>("POST", "/auth/signup", payload),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("POST", "/auth/login", payload),
  me: () => request<User>("GET", "/auth/me"),
  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<{ status: string; message: string }>("POST", "/auth/change-password", payload),
};

export const studentApi = {
  listQuizzes: () => request<QuizListItem[]>("GET", "/student/quizzes"),
  getQuiz: (id: string) => request<GeneratedExam & { id: string }>("GET", `/student/quiz/${id}`),
  submitQuiz: (id: string, payload: { answers: Record<string, any>; time_spent_seconds: number }) =>
    request<QuizResult>("POST", `/student/quiz/${id}/submit`, payload),
  getAttempt: (attemptId: string) => request<QuizResult>("GET", `/student/attempt/${attemptId}`),
  getStats: () => request<StudentStats>("GET", "/student/stats"),
};

