"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated -> redirect to login
        router.replace("/login");
      } else if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as UserRole)) {
        // Authenticated but wrong role -> redirect to appropriate portal
        if (user.role === "admin") {
          router.replace("/admin");
        } else if (user.role === "student") {
          router.replace("/student");
        } else {
          router.replace("/teacher");
        }
      }
    }
  }, [user, isLoading, allowedRoles, router]);

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
          color: "var(--text-2)",
          fontFamily: "var(--font-sans)",
          gap: 16,
        }}
      >
        <div
          className="spin"
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--accent)",
            borderTopColor: "transparent",
            borderRadius: "50%",
          }}
        />
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em" }}>
          Authenticating Gurukul Session...
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--text-3)",
        }}
      >
        Redirecting to authorized sanctuary...
      </div>
    );
  }

  return <>{children}</>;
}
