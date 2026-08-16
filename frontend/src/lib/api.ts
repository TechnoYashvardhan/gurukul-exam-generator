// API client — all calls to the FastAPI backend
// Base URL is set via NEXT_PUBLIC_API_URL env var (default: http://localhost:8000)

import type {
  SaveTemplateRequest,
  TemplateDetail,
  TemplateSummary,
  GeneratedExam,
  ExamTemplate,
} from "@/types/template";
import type { DocumentSummary, WebFetchRequest, GenerateWithSourceRequest } from "@/types/document";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API = `${BASE}/api/v1`;

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : detail?.message ?? `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const templatesApi = {
  list: (): Promise<TemplateSummary[]> =>
    request("GET", "/templates/"),

  get: (id: string): Promise<TemplateDetail> =>
    request("GET", `/templates/${id}`),

  create: (payload: SaveTemplateRequest): Promise<TemplateDetail> =>
    request("POST", "/templates/", payload),

  update: (id: string, payload: SaveTemplateRequest): Promise<TemplateDetail> =>
    request("PUT", `/templates/${id}`, payload),

  delete: (id: string): Promise<void> =>
    request("DELETE", `/templates/${id}`),
};

// ── Documents ────────────────────────────────────────────────────────────────

export const documentsApi = {
  list: (): Promise<DocumentSummary[]> =>
    request("GET", "/documents/"),

  get: (id: string): Promise<DocumentSummary> =>
    request("GET", `/documents/${id}`),

  upload: (file: File, subject: string, grade: string): Promise<DocumentSummary> => {
    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);
    form.append("grade", grade);
    return fetch(`${API}/documents/upload`, { method: "POST", body: form })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail?.message ?? `Upload failed`);
        return data as DocumentSummary;
      });
  },

  webFetch: (payload: WebFetchRequest): Promise<DocumentSummary> =>
    request("POST", "/documents/web-fetch", payload),

  delete: (id: string): Promise<void> =>
    request("DELETE", `/documents/${id}`),

  poll: async (id: string, maxWaitMs = 120_000): Promise<DocumentSummary> => {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 2500));
      const doc = await documentsApi.get(id);
      if (doc.status === "ready" || doc.status === "error") return doc;
    }
    throw new Error("Document processing timed out after 2 minutes.");
  },
};

// ── Generation (with source) ──────────────────────────────────────────────────

export const generationApi = {
  generate: (payload: GenerateWithSourceRequest): Promise<GeneratedExam> =>
    request("POST", "/generate/exam", payload),
};

// ── Health ────────────────────────────────────────────────────────────────────

export const healthApi = {
  check: (): Promise<{ status: string; llm_provider: string; llm_model: string }> =>
    request("GET", "/health"),
};
