import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { GeneratedExam, ExamHistoryEntry } from "@/types/template";
import { generationApi } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";

export type { ExamHistoryEntry };

export function useExamHistory(role: "admin" | "teacher" = "teacher") {
  const storageKey = `gk-exam-history-${role}`;
  const [entries, setEntries] = useLocalStorage<ExamHistoryEntry[]>(storageKey, []);

  // Fetch persisted exams from DB on mount / role change
  useEffect(() => {
    let isMounted = true;
    generationApi
      .listExams(role)
      .then((dbExams) => {
        if (!isMounted || !Array.isArray(dbExams)) return;
        setEntries((prev) => {
          const dbMap = new Map<string, ExamHistoryEntry>();
          for (const item of dbExams) {
            dbMap.set(item.id, item);
          }
          const combined = [...dbExams];
          for (const localItem of prev) {
            if (!dbMap.has(localItem.id)) {
              combined.push(localItem);
            }
          }
          return combined;
        });
      })
      .catch(() => {
        // Fall back silently to localStorage
      });

    return () => {
      isMounted = false;
    };
  }, [role, setEntries]);

  const saveExam = (exam: GeneratedExam, defaultTitle?: string) => {
    const examId = exam.exam_id || uuidv4();
    exam.exam_id = examId;
    const newEntry: ExamHistoryEntry = {
      id: examId,
      title: defaultTitle || `${exam.subject} - ${exam.grade}`,
      subject: exam.subject,
      grade: exam.grade,
      created_at: new Date().toISOString(),
      created_by_role: role,
      exam,
    };
    setEntries((prev) => [newEntry, ...prev.filter((e) => e.id !== examId)]);
    return newEntry;
  };

  const removeExam = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    generationApi.deleteExam(id).catch((err) => {
      console.warn("Failed to delete exam from database:", err);
    });
  };

  const renameExam = (id: string, newTitle: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e))
    );
    generationApi.renameExam(id, newTitle).catch((err) => {
      console.warn("Failed to rename exam in database:", err);
    });
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
