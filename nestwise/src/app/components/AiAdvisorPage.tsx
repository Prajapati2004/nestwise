"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./AiAdvisorPage.module.css";

interface Message { role: "user" | "assistant"; content: string; }

interface AiAdvisorPageProps {
  seedQuestion: string | null;
  onSeedConsumed: () => void;
}

const QUICK_TOPICS = [
  { icon: "🔍", label: "Analyze a listing", q: "I want to analyze a listing. Please ask me for the address, price, beds/baths, and any notes — then give me a full scam check, deal score, true cost estimate, and neighborhood research." },
  { icon: "📍", label: "Research a neighborhood", q: "I want to research a neighborhood. Ask me which area, then give me: average rents and home prices, safety overview, schools rating, walkability, key employers nearby, and whether it's a buyer's or renter's market right now." },
  { icon: "🚨", label: "Is this a scam?", q: "I want to check if a listing might be a scam. Ask me for the details — price, address, how the landlord is communicating, payment method requested — then tell me clearly if it's a scam and why." },
  { icon: "💰", label: "What's the true monthly cost?", q: "Help me calculate the true monthly cost of a property. Ask me for the price, down payment %, interest rate, property tax rate, insurance estimate, and HOA. Then give me a full breakdown including mortgage, taxes, insurance, PMI if applicable, and maintenance." },
  { icon: "💸", label: "Hidden fees to watch for", q: "What hidden fees should I watch for when renting or buying? Give me the full list — realtor fees, closing costs, admin fees, dual agency risks, and what to ask for in writing before signing anything." },
  { icon: "🔎", label: "Home inspection checklist", q: "Give me a home inspection checklist. What are the most expensive things to miss? What should I look for in the roof, foundation, HVAC, electrical, and plumbing? What are automatic deal-breakers?" },
  { icon: "📄", label: "Explain closing costs", q: "Explain closing costs in detail. What's included, when do I pay, how much should I budget on a $250,000 home, and what fees are negotiable?" },
  { icon: "🤝", label: "Negotiate rent or price", q: "Help me negotiate. Tell me specifically how to negotiate rent down as a renter, and how to negotiate purchase price down as a buyer. What leverage do I have? What's the best timing? What should I say?" },
  { icon: "⚠️", label: "Dual agency explained", q: "Explain dual agency. What is it, why is it risky for me as a buyer or renter, what should I watch for, and what are my rights if my agent proposes it?" },
  { icon: "📊", label: "Is my deal actually good?", q: "Help me evaluate if my deal is good. Ask me for the listing price, neighborhood average, my monthly budget, and down payment — then score it 1-10 and explain exactly why." },
];

export default function AiAdvisorPage({ seedQuestion, onSeedConsumed }: AiAdvisorPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const bodyRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, responseText]);

  useEffect(() => {
    if (seedQuestion) { onSeedConsumed(); sendMessage(seedQuestion); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput("");
    const userMsg: Message = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);
    setResponseText("");
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
        try { const json = await res.json(); if (json?.error) errMsg = json.error; } catch { /* empty */ }
        throw new Error(errMsg);
      }
      if (!res.body) throw new Error("No response body received.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResponseText(accumulated);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setResponseText("");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, loading]);

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]); setResponseText(""); setError(null); setLoading(false);
    inputRef.current?.focus();
  }

  const showWelcome = messages.length === 0 && !loading && !responseText;

  return (
    <div className="page-wrap">
      <div className="page-hd">
        <h2>AI Advisor — Nesta</h2>
        <p>Ask anything about buying, renting, scams, neighborhoods, or contracts. Paste any listing for instant analysis.</p>
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h4 className={styles.sidebarHeading}>What can I help with?</h4>
          {QUICK_TOPICS.map((t) => (
            <button key={t.q} className={styles.topicBtn} onClick={() => sendMessage(t.q)} disabled={loading}>
              <span className={styles.topicIcon}>{t.icon}</span>{t.label}
            </button>
          ))}
          <div className={styles.sidebarAlert}>⚠️ If a deal looks too good to be true, ask Nesta before sending any money or signing anything.</div>
          {messages.length > 0 && <button className={styles.clearBtn} onClick={clearChat}>Clear conversation</button>}
        </aside>

        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.aiAvatar}>🤖</div>
            <div>
              <div className={styles.aiName}>Nesta — NestWise AI</div>
              <div className={styles.aiStatus}>
                {loading
                  ? <span className={styles.statusTyping}>● Thinking...</span>
                  : <span className={styles.statusOnline}>● Online · Here to protect you</span>}
              </div>
            </div>
          </div>

          <div className={styles.chatBody} ref={bodyRef}>
            {showWelcome && (
              <div className={`${styles.cmsg} ${styles.bot} fade-in`}>
                <div className={styles.cbubble}>
                  Hi! I&apos;m Nesta, your AI real estate advisor.<br /><br />
                  I can help you <strong>spot scams</strong>, <strong>research any neighborhood</strong>, <strong>analyze listings</strong>, calculate <strong>true costs</strong>, and decode confusing <strong>contracts and fees</strong>.<br /><br />
                  What would you like to know?
                </div>
                <div className={styles.ctime}>Nesta · Now</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`${styles.cmsg} ${m.role === "user" ? styles.user : styles.bot} fade-in`}>
                <div className={styles.cbubble}><FormattedText text={m.content} /></div>
                <div className={styles.ctime}>{m.role === "user" ? "You" : "Nesta"} · {i === messages.length - 1 ? "Now" : "Earlier"}</div>
              </div>
            ))}
            {responseText && (
              <div className={`${styles.cmsg} ${styles.bot} fade-in`}>
                <div className={styles.cbubble}><FormattedText text={responseText} /><span className={styles.cursor} aria-hidden="true" /></div>
                <div className={styles.ctime}>Nesta · Now</div>
              </div>
            )}
            {loading && !responseText && (
              <div className={`${styles.cmsg} ${styles.bot} fade-in`}>
                <div className={`${styles.cbubble} ${styles.typingBubble}`}>
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}
            {error && (
              <div className={`${styles.errorBanner} fade-in`}>
                <span>⚠ {error}</span>
                <button onClick={() => setError(null)} className={styles.errorDismiss}>✕</button>
              </div>
            )}
          </div>

          <div className={styles.chatInput}>
            <input ref={inputRef} type="text"
              placeholder="Ask anything, or paste a listing address and price..."
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              disabled={loading} />
            <button className="btn-primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              {loading ? <span className={styles.sendSpinner} /> : "Ask"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
