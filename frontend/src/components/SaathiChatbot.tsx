"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, HelpCircle, ChevronRight, BookOpen } from "lucide-react";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  actionView?: string;
  actionLabel?: string;
}

const FAQS: FAQItem[] = [
  {
    id: "create-exam",
    category: "Workflow",
    question: "How do I create a new question paper?",
    answer: "Follow the 3-step Gurukul pipeline: (1) Upload your syllabus in Granth library, (2) Choose or customize an exam blueprint in Vidya, and (3) Click Generate in Rachna to synthesize your paper with solutions.",
    actionView: "generate",
    actionLabel: "Go to Rachna (Generate)",
  },
  {
    id: "upload-granth",
    category: "Syllabus",
    question: "What files can I upload to Granth Library?",
    answer: "You can upload chapter PDFs, textbook scans, or paste live web links via SearXNG search. Gurukul indexes the material using semantic embeddings so AI questions strictly cite your syllabus.",
    actionView: "library",
    actionLabel: "Open Granth Library",
  },
  {
    id: "kavach-security",
    category: "Security",
    question: "How does Kavach Anti-Cheat protect student quizzes?",
    answer: "Kavach enforces full-screen lockdown, logs tab switches or window blurs, disables copy/paste and right-click inspection, and issues a 3-strike warning before automatically disqualifying compromised attempts.",
  },
  {
    id: "export-docx",
    category: "Export",
    question: "Can I export exams for print or Word?",
    answer: "Yes! Generated papers can be exported as clean Word documents (.docx), raw JSON for data backup, or printed directly with eco-friendly margin and ink-saving optimizations.",
  },
  {
    id: "manage-students",
    category: "Admin",
    question: "How are student accounts provisioned?",
    answer: "Admins provision students with unique 7-digit Scholar IDs (e.g., 2410852) and assign them to specific class cohorts in the Shishya manager. Students do not need email verification.",
    actionView: "shishyas",
    actionLabel: "Open Shishya Manager",
  },
  {
    id: "marking-scheme",
    category: "Assessment",
    question: "Does Gurukul generate answer keys and rubrics?",
    answer: "Every question synthesized by Gurukul comes with an authoritative model answer, step-by-step mathematical reasoning, and Bloom's taxonomy difficulty tags.",
  },
];

interface Message {
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  actionView?: string;
  actionLabel?: string;
}

interface SaathiChatbotProps {
  onNavigate?: (view: any) => void;
}

export default function SaathiChatbot({ onNavigate }: SaathiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Namaste! I am Saathi (साथी), your Gurukul guide. How can I assist your teaching or learning journey today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-saathi-chatbot", handler);
    return () => window.removeEventListener("open-saathi-chatbot", handler);
  }, []);

  const handleAsk = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Answer matching
    setTimeout(() => {
      const qLower = queryText.toLowerCase();
      const matched = FAQS.find(
        (f) =>
          f.question.toLowerCase().includes(qLower) ||
          qLower.includes(f.category.toLowerCase()) ||
          (qLower.includes("create") && f.id === "create-exam") ||
          (qLower.includes("pdf") && f.id === "upload-granth") ||
          (qLower.includes("cheat") && f.id === "kavach-security") ||
          (qLower.includes("print") && f.id === "export-docx") ||
          (qLower.includes("word") && f.id === "export-docx") ||
          (qLower.includes("student") && f.id === "manage-students") ||
          (qLower.includes("answer") && f.id === "marking-scheme")
      );

      const botReply: Message = matched
        ? {
            sender: "bot",
            text: matched.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actionView: matched.actionView,
            actionLabel: matched.actionLabel,
          }
        : {
            sender: "bot",
            text: "I can help you navigate Gurukul! Explore the quick topics below or ask about Granth uploads, Vidya blueprints, or Rachna question generation.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

      setMessages((prev) => [...prev, botReply]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* ── Floating Character Trigger Pill ── */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="gk-btn"
          style={{
            height: 52,
            padding: "0 18px",
            borderRadius: 100,
            background: isOpen ? "var(--surface)" : "linear-gradient(135deg, var(--accent) 0%, var(--gold) 100%)",
            color: isOpen ? "var(--text)" : "#FFFFFF",
            border: isOpen ? "1.5px solid var(--border)" : "none",
            boxShadow: "0 6px 24px rgba(234, 88, 12, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            transition: "all 0.25s var(--ease-spring)",
          }}
          aria-label="Toggle Saathi Chatbot"
        >
          {/* Animated Owl Character Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: isOpen ? "var(--accent-light)" : "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* SVG Animated Owl Character */}
            <svg
              viewBox="0 0 36 36"
              width="24"
              height="24"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
              }}
            >
              {/* Owl Body */}
              <ellipse cx="18" cy="20" rx="12" ry="14" fill="#D97706" />
              {/* Belly */}
              <ellipse cx="18" cy="23" rx="8" ry="9" fill="#FEF3C7" />
              {/* Eyes */}
              <circle cx="13" cy="14" r="4.5" fill="#FFFFFF" />
              <circle cx="23" cy="14" r="4.5" fill="#FFFFFF" />
              {/* Animated Pupils with Blink Keyframe */}
              <circle
                cx="13"
                cy="14"
                r="2.2"
                fill="#1E293B"
                style={{
                  transformOrigin: "13px 14px",
                  animation: "diyaFlicker 3.5s ease-in-out infinite",
                }}
              />
              <circle
                cx="23"
                cy="14"
                r="2.2"
                fill="#1E293B"
                style={{
                  transformOrigin: "23px 14px",
                  animation: "diyaFlicker 3.5s ease-in-out infinite",
                }}
              />
              {/* Beak */}
              <polygon points="18,17 16,21 20,21" fill="#EA580C" />
              {/* Tilak / Feather Tuft */}
              <path d="M18 5 L16 10 L20 10 Z" fill="#B45309" />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>
              {isOpen ? "Close Guide" : "Saathi (साथी)"}
            </span>
            <span
              style={{
                fontSize: 10,
                opacity: 0.9,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
              }}
            >
              {isOpen ? "Esc" : "Need help?"}
            </span>
          </div>
        </button>
      </div>

      {/* ── Chat Modal Panel ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 520,
            maxHeight: "calc(100vh - 120px)",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
            zIndex: 95,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "gkModalScaleIn 0.25s var(--ease-spring) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-sunken) 100%)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--accent-light)",
                  border: "1px solid var(--accent-mid)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={18} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text)" }}>
                  Saathi Knowledge Assistant
                </div>
                <div style={{ fontSize: 11, color: "var(--forest)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--forest)", display: "inline-block" }}></span>
                  Gurukul AI Companion Online
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="gk-btn gk-btn--icon"
              style={{ width: 28, height: 28, padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: "16px 18px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.sender === "user" ? "flex-end" : "flex-start",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    maxWidth: "88%",
                    padding: "10px 14px",
                    borderRadius: m.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    background: m.sender === "user" ? "var(--accent)" : "var(--surface-sunken)",
                    color: m.sender === "user" ? "#FFFFFF" : "var(--text)",
                    border: m.sender === "user" ? "none" : "1px solid var(--border)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}

                  {m.actionView && onNavigate && (
                    <button
                      onClick={() => {
                        onNavigate(m.actionView);
                        setIsOpen(false);
                      }}
                      className="gk-btn gk-btn--sm"
                      style={{
                        marginTop: 8,
                        background: "var(--surface)",
                        border: "1px solid var(--accent-mid)",
                        color: "var(--accent)",
                        fontWeight: 700,
                        fontSize: 11.5,
                        width: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{m.actionLabel || "Explore Section"}</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 10, color: "var(--text-3)", padding: "0 4px" }}>
                  {m.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--surface-sunken)", borderRadius: 12, width: 68 }}>
                <span className="spin" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                <span className="spin" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", animationDelay: "0.2s" }} />
                <span className="spin" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-hover)", animationDelay: "0.4s" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Suggestion Pills */}
          <div
            style={{
              padding: "8px 14px",
              background: "var(--surface-sunken)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 6,
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {FAQS.slice(0, 4).map((f) => (
              <button
                key={f.id}
                onClick={() => handleAsk(f.question)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 100,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  fontSize: 11,
                  color: "var(--text-2)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                  fontWeight: 500,
                }}
              >
                <HelpCircle size={11} color="var(--accent)" />
                {f.question.length > 25 ? f.question.slice(0, 25) + "..." : f.question}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
            style={{
              padding: "10px 14px",
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Ask Saathi a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="gk-input"
              style={{
                height: 38,
                fontSize: 13,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="gk-btn gk-btn--primary"
              style={{
                width: 38,
                height: 38,
                padding: 0,
                borderRadius: "var(--radius-sm)",
                flexShrink: 0,
              }}
              title="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
