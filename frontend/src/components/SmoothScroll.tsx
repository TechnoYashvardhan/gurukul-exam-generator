"use client";

import { useEffect } from "react";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Global listener for interactive lens-card mouse spotlight effect
    const handleMouseMove = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(".lens-card") as HTMLElement;
      if (target) {
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        target.style.setProperty("--mouse-x", `${x}px`);
        target.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    // 2. Global tactile ripple effect for all buttons
    const handleButtonClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest(".gk-btn, button") as HTMLElement;
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.className = "gk-dynamic-ripple";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("click", handleButtonClick, { capture: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleButtonClick, { capture: true });
    };
  }, []);

  return <>{children}</>;
}
