"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationId: number;

    // Warm amber/gold particles — Gurukul firelight aesthetic
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -Math.random() * 0.35 - 0.1, // drift upward like embers
      size: Math.random() * 2.2 + 0.5,
      opacity: Math.random() * 0.35 + 0.08,
      hue: 35 + Math.random() * 20, // warm amber 35–55
    }));

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        // Gentle flicker
        p.opacity += (Math.random() - 0.5) * 0.015;
        p.opacity = Math.max(0.04, Math.min(0.42, p.opacity));

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -5) p.y = height + 5;
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;

        const isDark = document.documentElement.classList.contains("dark");
        const saturation = isDark ? "70%" : "65%";
        const lightness = isDark ? "62%" : "52%";

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, ${saturation}, ${lightness}, ${p.opacity})`;
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      aria-hidden="true"
    />
  );
}
