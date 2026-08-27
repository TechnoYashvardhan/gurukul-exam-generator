import { useLocalStorage } from "./useLocalStorage";
import type { GeneratedExam } from "@/types/template";
import { v4 as uuidv4 } from "uuid";

export interface ExamHistoryEntry {
  id: string;
  title: string;
  subject: string;
  grade: string;
  created_at: string;
  exam: GeneratedExam;
}

export function useExamHistory(role: "admin" | "teacher" = "teacher") {
  const storageKey = `gk-exam-history-${role}`;
  const [entries, setEntries] = useLocalStorage<ExamHistoryEntry[]>(storageKey, []);

  const saveExam = (exam: GeneratedExam, defaultTitle?: string) => {
    const newEntry: ExamHistoryEntry = {
      id: uuidv4(),
      title: defaultTitle || `${exam.subject} - ${exam.grade}`,
      subject: exam.subject,
      grade: exam.grade,
      created_at: new Date().toISOString(),
      exam,
    };
    setEntries((prev) => [newEntry, ...prev]);
    return newEntry;
  };

  const removeExam = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const renameExam = (id: string, newTitle: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e))
    );
  };

  const updateExamData = (id: string, updatedExam: GeneratedExam) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, exam: updatedExam } : e))
    );
  };

  return {
    entries,
    saveExam,
    removeExam,
    renameExam,
    updateExamData,
  };
}
