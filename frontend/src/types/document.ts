// TypeScript types for the document library (Phase 3)

import type { ExamTemplate } from "./template";

export type DocumentStatus = "pending" | "processing" | "ready" | "error";
export type DocumentSource = "upload" | "web_fetch";

export interface DocumentSummary {
  id: string;
  filename: string;
  subject: string | null;
  grade: string | null;
  status: DocumentStatus;
  source: DocumentSource;
  page_count: number | null;
  chunk_count: number;
  created_at: string;
}

export interface WebFetchRequest {
  subject: string;
  grade: string;
  extra_keywords?: string;
}

export interface GenerateWithSourceRequest {
  template: ExamTemplate;
  document_id?: string | null;
  web_query?: string | null;
  syllabus_text?: string | null;
  custom_topic?: string | null;
  source_type?: string;
}
