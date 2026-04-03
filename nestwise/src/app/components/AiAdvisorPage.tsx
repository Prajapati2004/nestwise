"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./AiAdvisorPage.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAdvisorPageProps {
  seedQuestion: string | null;
  onSeedConsumed: () => void;
}

const QUICK_TOPICS = [
  { icon: "🚨", label: "How to spot a rental scam",          q: "How do I spot a rental scam? What are the biggest red flags?" },
  { icon: "💸", label: "Hidden realtor fees to watch for",   q: "What hidden fees should I watch for from a realtor? When are they disclosed?" },
  { icon: "🔍", label: "Home inspection checklist",          q: "What should I check at a home inspection? What are the most expensive things to miss?" },
  { icon: "📄", label: "What are closing costs?",            q: "What are closing costs and when do I pay them? How much should I budget?" },
  { icon: "🤝", label: "Buyer's agent vs. listing agent",    q: "Should I use a buyer's agent or go directly to the listing agent? What are the tradeoffs?" },
  { icon: "⚠️", label: "What is dual agency?",               q: "What is dual agency and why is it risky for buyers?" },
  { icon: "💬", label: "How to negotiate rent down",         q: "How do I negotiate rent down? What leverage do I actually have as a renter?" },
  { icon: "📊", label: "Is my deal actually good?",          q: "How do I know if a real estate deal is actually good? What numbers matter most?" },
];

export default function AiAdvisorPage({
  seedQuestion,
  onSeedConsumed,
}: AiAdvisorPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");

  const bodyRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingText]);

  // Consume seed question from nav (e.g. "Ask AI ↗" on a listing card)
  useEffect(() => {
    if (seedQuestion) {
      onSeedConsumed();
      sendMessage(seedQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setInput("");

      const userMsg: Message = { role: "user", content: trimmed };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setLoading(true);
      setStreamingText("");

      // Cancel any in-flight request
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextHistory }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          let errMsg = "Something went wrong. Please try again.";
          try {
            const json = await res.json();
            if (json?.error) errMsg = json.error;
          } catch {}
          throw new Error(errMsg);
        }

        if (!res.body) throw new Error("No response body received.");

        // Stream the response token by token
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamingText(accumulated);
        }

        // Commit the completed message to history
        const assistantMsg: Message = {
          role: "assistant",
          content: accumulated,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText("");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again."
        );
      } finally {
        setLoading(false);
        // Re-focus input after response
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, loading]
  );

  function handleSubmit() {
    sendMessage(input);
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingText("");
    setError(null);
    setLoading(false);
    inputRef.current?.focus();
  }

  const showWelcome = messages.length === 0 && !loading && !streamingText;

  return (
    <div className="page-wrap">
      <div className="page-hd">
        <h2>AI Advisor</h2>
        <p>Ask anything about buying, renting, or avoiding scams.</p>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <h4 className={styles.sidebarHeading}>Quick topics</h4>
          {QUICK_TOPICS.map((t) => (
            <button
              key={t.q}
              className={styles.topicBtn}
              onClick={() => sendMessage(t.q)}
              disabled={loading}
            >
              <span className={styles.topicIcon}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div className={styles.sidebarAlert}>
            ⚠️ If a deal looks too good to be true, ask Nesta before sending any
            money or signing anything.
          </div>
          {messages.length > 0 && (
            <button className={styles.clearBtn} onClick={clearChat}>
              Clear conversation
            </button>
          )}
        </aside>

        {/* ── Chat panel ── */}
        <div className={styles.chatPanel}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.aiAvatar}>🤖</div>
            <div>
              <div className={styles.aiName}>Nesta — NestWise AI</div>
              <div className={styles.aiStatus}>
                {loading ? (
                  <span className={styles.statusTyping}>● Thinking...</span>
                ) : (
                  <span className={styles.statusOnline}>● Online · Here to protect you</span>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.chatBody} ref={bodyRef}>
            {/* Welcome state */}
            {showWelcome && (
              <div className={`${styles.cmsg} ${styles.bot} fade-in`}>
                <div className={styles.cbubble}>
                  Hi! I&apos;m Nesta, your AI real estate advisor. I can help you spot
                  scams, understand fees, decode contract language, and figure out if a
                  deal is legit.
                  <br /><br />
                  What would you like to know?
                </div>
                <div className={styles.ctime}>Nesta · Now</div>
              </div>
            )}

            {/* Message history */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.cmsg} ${m.role === "user" ? styles.user : styles.bot} fade-in`}
              >
                <div className={styles.cbubble}>
                  <FormattedText text={m.content} />
                </div>
                <div className={styles.ctime}>
                  {m.role === "user" ? "You" : "Nesta"} · {i === messages.length - 1 ? "Now" : "Earlier"}
                </div>
              </div>
            ))}

            {/* Streaming in-progress */}
            {streamingText && (
              <div className={`${styles.cmsg} ${styles.bot} fade-in`}>
                <div className={styles.cbubble}>
                  <FormattedText text={streamingText} />
                  <span className={styles.cursor} aria-hidden="true" />
                </div>
                <div className={styles.ctime}>Nesta · Now</div>
              </div>
            )}

            {/* Typing dots (before first token arrives) */}
            {loading && !streamingText && (
              <div className={`${styles.cmsg} ${styles.bot} fade-in`}>
                <div className={`${styles.cbubble} ${styles.typingBubble}`}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className={`${styles.errorBanner} fade-in`}>
                <span>⚠ {error}</span>
                <button onClick={() => setError(null)} className={styles.errorDismiss}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Input row */}
          <div className={styles.chatInput}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything about buying, renting, or realtors..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={loading}
              aria-label="Message to Nesta"
            />
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? (
                <span className={styles.sendSpinner} aria-hidden="true" />
              ) : (
                "Ask"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Render newlines and basic markdown-style bold (**text**)
function FormattedText({ text }: { text: string }) {
  // Split on **bold** markers and newlines
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
