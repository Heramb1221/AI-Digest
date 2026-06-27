"use client";
// components/dashboard/chat-panel.tsx
// Slide-in AI chat panel — lets Pro users ask questions about their digest.
// Uses the streaming-free Gemini endpoint (non-streaming is simpler and
// sufficient for conversational use cases at this scale).

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Zap, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";

interface Message {
  role:  "user" | "model";
  parts: [{ text: string }];
}

interface ChatPanelProps {
  plan:    Plan;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "What should I read first today?",
  "Summarise the top technical articles",
  "Any AI funding news?",
  "What tools were released this week?",
];

export function ChatPanel({ plan, onClose }: ChatPanelProps) {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const isPro       = plan !== "FREE";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isPro) inputRef.current?.focus();
  }, [isPro]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !isPro) return;
    setError(null);

    const userMsg: Message = { role: "user", parts: [{ text: text.trim() }] };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message: text.trim(),
          // Send history without the latest user message (it's in `message`)
          history: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setMessages((prev) => prev.slice(0, -1)); // remove optimistic user msg
        return;
      }

      const modelMsg: Message = { role: "model", parts: [{ text: data.reply }] };
      setMessages([...nextHistory, modelMsg]);
    } catch {
      setError("Network error. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [messages, loading, isPro]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full border-l border-border bg-paper-raised">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-accent" />
          <span className="text-sm font-semibold">Chat with digest</span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-faint hover:text-ink transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Not Pro */}
        {!isPro && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
              <Zap size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Pro feature</p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Chat with your digest to find articles, summarise topics, and navigate your reading — available on Pro.
              </p>
            </div>
            <a
              href="/settings/billing"
              className="text-xs font-medium text-accent hover:underline underline-offset-2"
            >
              Upgrade to Pro →
            </a>
          </div>
        )}

        {/* Empty state with suggestions */}
        {isPro && messages.length === 0 && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <Bot size={13} />
              <span>Ask me anything about today's articles.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-paper hover:bg-paper-sunken transition-colors text-ink-muted hover:text-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {isPro && messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 items-start",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              msg.role === "user"
                ? "bg-accent text-white"
                : "bg-paper-sunken text-ink-muted"
            )}>
              {msg.role === "user"
                ? <User size={11} />
                : <Bot size={11} />
              }
            </div>

            {/* Bubble */}
            <div className={cn(
              "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
              msg.role === "user"
                ? "bg-accent text-white rounded-tr-sm"
                : "bg-paper-sunken text-ink rounded-tl-sm"
            )}>
              {msg.parts[0].text}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-2 items-center">
            <div className="h-6 w-6 rounded-full bg-paper-sunken flex items-center justify-center shrink-0">
              <Bot size={11} className="text-ink-muted" />
            </div>
            <div className="flex gap-1 px-3 py-2.5 bg-paper-sunken rounded-xl rounded-tl-sm">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-ink-faint animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      {isPro && (
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-paper focus-within:ring-2 focus-within:ring-ring transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your digest…"
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-ink-faint"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className={cn(
                "h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0",
                input.trim() && !loading
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-paper-sunken text-ink-faint cursor-not-allowed"
              )}
            >
              <Send size={11} />
            </button>
          </div>
          <p className="text-2xs text-ink-faint mt-1.5 text-center">
            Based on your last 20 articles
          </p>
        </div>
      )}
    </div>
  );
}
