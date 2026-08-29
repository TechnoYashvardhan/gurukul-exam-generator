"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AdminPage from "./admin/page";
import TeacherPage from "./teacher/page";
import StudentPage from "./student/page";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--text-3)",
          fontFamily: "var(--font-serif)",
          gap: 14,
        }}
      >
        <span
          className="spin"
          style={{
            display: "inline-block",
            width: 28,
            height: 28,
            border: "2px solid var(--accent)",
            borderTopColor: "transparent",
            borderRadius: "50%",
          }}
        />
        <div style={{ fontSize: 16 }}>Entering Gurukul Sanctuary...</div>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminPage />;
  }

  if (user.role === "student") {
    return <StudentPage />;
  }

  return <TeacherPage />;
}

