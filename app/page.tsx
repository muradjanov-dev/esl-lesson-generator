"use client";

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  BookOpen,
  PenLine,
  Loader2,
  ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
  ssr: false,
});

const EXAMPLE_TOPICS = [
  "Present Simple",
  "Past Continuous",
  "Phrasal Verbs",
  "Fast Food Vocabulary",
  "Modal Verbs",
  "Conditionals",
  "Articles (a, an, the)",
  "Comparative Adjectives",
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [lesson, setLesson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lessonRef = useRef<HTMLDivElement>(null);

  const generateLesson = useCallback(
    async (topicInput: string) => {
      const trimmed = topicInput.trim();
      if (!trimmed || isGenerating) return;

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLesson("");
      setError(null);
      setIsGenerating(true);
      setDrawMode(false);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmed }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setLesson((prev) => prev + chunk);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateLesson(topic);
  };

  return (
    <div className="relative min-h-screen" style={{ background: "#fff7ed" }}>
      {/* SVG Cloud Background */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <svg
          className="absolute -top-8 -left-8 opacity-20"
          width="320"
          height="200"
          viewBox="0 0 320 200"
        >
          <ellipse cx="160" cy="120" rx="140" ry="80" fill="#fb923c" />
          <ellipse cx="90" cy="90" rx="80" ry="60" fill="#fb923c" />
          <ellipse cx="230" cy="90" rx="70" ry="55" fill="#fb923c" />
          <ellipse cx="160" cy="70" rx="90" ry="60" fill="#fb923c" />
        </svg>
        <svg
          className="absolute top-40 -right-12 opacity-10"
          width="280"
          height="160"
          viewBox="0 0 280 160"
        >
          <ellipse cx="140" cy="100" rx="120" ry="65" fill="#f97316" />
          <ellipse cx="70" cy="70" rx="70" ry="52" fill="#f97316" />
          <ellipse cx="210" cy="70" rx="60" ry="48" fill="#f97316" />
          <ellipse cx="140" cy="55" rx="80" ry="52" fill="#f97316" />
        </svg>
        <svg
          className="absolute bottom-20 left-1/4 opacity-10"
          width="240"
          height="140"
          viewBox="0 0 240 140"
        >
          <ellipse cx="120" cy="90" rx="100" ry="55" fill="#fdba74" />
          <ellipse cx="60" cy="65" rx="60" ry="45" fill="#fdba74" />
          <ellipse cx="180" cy="65" rx="55" ry="42" fill="#fdba74" />
          <ellipse cx="120" cy="50" rx="70" ry="45" fill="#fdba74" />
        </svg>
      </div>

      {/* Navbar */}
      <header
        className="sticky top-0 z-30 border-b border-orange-100"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 24px rgba(249,115,22,0.10)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2 shrink-0">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #fb923c, #f97316)",
                boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
              }}
            >
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-lg text-orange-600 hidden sm:block">
              ESL<span className="text-orange-400">Craft</span>
            </span>
          </div>

          {/* Topic Form */}
          <form onSubmit={handleSubmit} className="flex flex-1 gap-2 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic (e.g. Present Simple, Phrasal Verbs…)"
                className="w-full rounded-2xl px-4 py-2.5 text-sm font-medium border-2 border-orange-100 bg-white outline-none transition-all placeholder-orange-300 text-gray-700 focus:border-orange-400"
                style={{ boxShadow: "0 2px 12px rgba(249,115,22,0.08)" }}
                disabled={isGenerating}
              />
            </div>
            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #fb923c, #ea580c)",
                boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
              }}
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {isGenerating ? "Generating…" : "Generate"}
            </button>
          </form>

          {/* Draw Mode Toggle */}
          {lesson && (
            <button
              onClick={() => setDrawMode((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shrink-0 ${
                drawMode
                  ? "text-white"
                  : "text-orange-600 border-2 border-orange-200 bg-white hover:bg-orange-50"
              }`}
              style={
                drawMode
                  ? {
                      background: "linear-gradient(135deg, #f97316, #c2410c)",
                      boxShadow: "0 4px 16px rgba(249,115,22,0.4)",
                    }
                  : { boxShadow: "0 2px 8px rgba(249,115,22,0.08)" }
              }
            >
              <PenLine size={16} />
              {drawMode ? "Drawing ON" : "Draw Mode"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        className="relative max-w-5xl mx-auto px-4 py-8"
        style={{ zIndex: 1 }}
      >
        {/* Welcome / Empty State */}
        {!lesson && !isGenerating && !error && (
          <div className="flex flex-col items-center justify-center pt-16 pb-8">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg, #fed7aa, #fb923c)",
                boxShadow: "0 16px 48px rgba(249,115,22,0.25)",
              }}
            >
              <Sparkles size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-orange-600 mb-2 text-center">
              AI-Powered ESL Lesson Generator
            </h1>
            <p className="text-orange-400 text-center max-w-md mb-8 text-sm leading-relaxed">
              Type any grammar topic or vocabulary theme above and get a
              complete lesson with explanation, funny examples, reading text,
              listening, writing tasks, and 30 exercises — instantly.
            </p>

            {/* Example topics */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTopic(t);
                    generateLesson(t);
                  }}
                  className="flex items-center gap-1 px-4 py-2 rounded-2xl text-sm font-semibold text-orange-700 border-2 border-orange-100 bg-white hover:bg-orange-50 hover:border-orange-300 transition-all"
                  style={{ boxShadow: "0 2px 12px rgba(249,115,22,0.08)" }}
                >
                  <ChevronRight size={13} />
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            className="rounded-3xl p-6 mb-6 border-2 border-red-200 text-red-700 text-sm font-medium"
            style={{
              background: "#fff5f5",
              boxShadow: "0 4px 16px rgba(239,68,68,0.08)",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Generating indicator — before any content */}
        {isGenerating && !lesson && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center animate-pulse"
              style={{
                background: "linear-gradient(135deg, #fed7aa, #fb923c)",
              }}
            >
              <Loader2 size={28} className="text-white animate-spin" />
            </div>
            <p className="text-orange-500 font-semibold">
              Crafting your lesson…
            </p>
          </div>
        )}

        {/* Lesson Content */}
        {lesson && (
          <div
            ref={lessonRef}
            className="rounded-3xl p-6 sm:p-10"
            style={{
              background: "rgba(255,255,255,0.92)",
              boxShadow:
                "0 8px 48px rgba(249,115,22,0.12), 0 2px 12px rgba(0,0,0,0.04)",
              border: "1px solid #fed7aa",
            }}
          >
            {isGenerating && (
              <div className="flex items-center gap-2 mb-4 text-orange-400 text-xs font-medium">
                <Loader2 size={12} className="animate-spin" />
                Streaming…
              </div>
            )}
            <div className="lesson-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lesson}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </main>

      {/* Whiteboard overlay (client-only) */}
      <Whiteboard drawMode={drawMode} />

      {/* Draw mode hint banner */}
      {drawMode && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-xs font-semibold text-orange-700 pointer-events-none"
          style={{
            zIndex: 45,
            background: "rgba(255,237,213,0.97)",
            boxShadow: "0 2px 12px rgba(249,115,22,0.2)",
            border: "1px solid #fed7aa",
          }}
        >
          ✏️ Draw Mode active — use toolbar below to change tools
        </div>
      )}
    </div>
  );
}
