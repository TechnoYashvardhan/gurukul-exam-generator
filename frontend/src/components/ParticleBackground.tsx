"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  opacity: number;
  hue: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  age: number;
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
    let mouseX = -1000;
    let mouseY = -1000;

    // Warm amber & gold living particles (Gurukul Gyan Jyoti aura)
    const particleCount = Math.min(65, Math.floor((width * height) / 18000));
    const particles: Particle[] = Array.from({ length: particleCount }, () => {
      const size = Math.random() * 2.8 + 0.8;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(Math.random() * 0.6 + 0.2), // gentle upward float
        size,
        baseSize: size,
        opacity: Math.random() * 0.45 + 0.25,
        hue: 28 + Math.random() * 24, // Saffron 28 to Gold 52
        wobbleSpeed: Math.random() * 0.02 + 0.008,
        wobbleAmp: Math.random() * 0.8 + 0.3,
        age: Math.random() * 1000,
      };
    });

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");
      const saturation = isDark ? "85%" : "80%";
      const lightness = isDark ? "65%" : "50%";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++;

        // Gentle sinusoidal sway
        p.x += p.vx + Math.sin(p.age * p.wobbleSpeed) * p.wobbleAmp;
        p.y += p.vy;

        // Mouse proximity reaction (gentle push)
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.6;
          p.x += (dx / dist) * force * 2;
          p.y += (dy / dist) * force * 2;
        }

        // Soft flicker
        const flicker = Math.sin(p.age * 0.05) * 0.12;
        const currentOpacity = Math.max(0.1, Math.min(0.65, p.opacity + flicker));

        // Wrap around edges seamlessly
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Draw particle with glowing halo
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, ${saturation}, ${lightness}, ${currentOpacity})`;
        ctx!.fill();

        // Outer ambient glow for larger particles
        if (p.size > 1.8) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(${p.hue}, ${saturation}, ${lightness}, ${currentOpacity * 0.22})`;
          ctx!.fill();
        }
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
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
