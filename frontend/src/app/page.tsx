"use client";

import { useAuth } from "@/components/AuthProvider";
import AdminPage from "./admin/page";
import TeacherPage from "./teacher/page";
import StudentPage from "./student/page";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--text-3)",
          fontFamily: "var(--font-serif)",
          fontSize: 18,
        }}
      >
        <span
          className="spin"
          style={{
            display: "inline-block",
            width: 24,
            height: 24,
            border: "2px solid var(--accent)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            marginRight: 12,
          }}
        />
        Entering Gurukul Sanctuary...
      </div>
    );
  }

  if (user?.role === "admin") {
    return <AdminPage />;
  }

  if (user?.role === "student") {
    return <StudentPage />;
  }

  // Default to Teacher (Offline Paper Generator)
  return <TeacherPage />;
}
