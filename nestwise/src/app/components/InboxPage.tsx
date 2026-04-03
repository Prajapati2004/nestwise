"use client";

import { useState } from "react";
import styles from "./InboxPage.module.css";

interface Message {
  me: boolean;
  text: string;
  time: string;
}

interface Thread {
  title: string;
  sub: string;
  preview: string;
  time: string;
  tag: "pending" | "replied" | "tour" | "declined";
  unread: boolean;
  msgs: Message[];
}

const THREADS: Thread[] = [
  {
    title: "88 Westcott St",
    sub: "$1,650/mo · 2 bd · 1 ba",
    preview: "Hi! Yes still available...",
    time: "Today 9:41am",
    tag: "replied",
    unread: true,
    msgs: [
      { me: true,  text: "Hi! I saw your listing for the 2BR on Westcott. Is it still available? Looking for May 1st.", time: "Mon 6:22pm" },
      { me: false, text: "Hi! Yes it's still available and May 1st works great. Want to schedule a showing?",            time: "Today 9:41am" },
    ],
  },
  {
    title: "312 Oak Blvd",
    sub: "$229,000 · 3 bd · 1 ba",
    preview: "Please fill out our application...",
    time: "Today 8:15am",
    tag: "tour",
    unread: true,
    msgs: [
      { me: true,  text: "Hi, interested in a showing this weekend if possible.", time: "Tue 3:10pm" },
      { me: false, text: "Saturday 11am works! Please fill out our application first.", time: "Today 8:15am" },
    ],
  },
  {
    title: "201 Park St",
    sub: "$1,400/mo · 1 bd · 1 ba",
    preview: "Unfortunately this unit was just...",
    time: "Yesterday",
    tag: "declined",
    unread: true,
    msgs: [
      { me: true,  text: "Is the Park St unit available for May?",                                            time: "Yesterday 4pm" },
      { me: false, text: "Thanks for reaching out — unfortunately this unit was just rented.", time: "Yesterday 6pm" },
    ],
  },
  {
    title: "57 Elm St",
    sub: "$315,000 · 4 bd · 2.5 ba",
    preview: "Sent: Is price negotiable?",
    time: "Mon",
    tag: "pending",
    unread: false,
    msgs: [
      { me: true, text: "Hi, I'm interested in this listing. Is the price negotiable?", time: "Mon 2pm" },
    ],
  },
  {
    title: "142 Maple Ave",
    sub: "$289,000 · 3 bd · 2 ba",
    preview: "Sent: When was roof replaced?",
    time: "Sun",
    tag: "pending",
    unread: false,
    msgs: [
      { me: true, text: "Is the price negotiable? Also when was the roof last replaced?", time: "Sun 11am" },
    ],
  },
];

const TAG_LABELS: Record<Thread["tag"], string> = {
  pending:  "No reply",
  replied:  "Replied",
  tour:     "Tour scheduled",
  declined: "Not available",
};
const TAG_CLASSES: Record<Thread["tag"], string> = {
  pending:  "stag stag-pending",
  replied:  "stag stag-replied",
  tour:     "stag stag-tour",
  declined: "stag stag-declined",
};

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>(THREADS);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState("");

  const active = threads[selected];
  const unreadCount = threads.filter((t) => t.unread).length;

  function select(i: number) {
    setSelected(i);
    setThreads((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, unread: false } : t))
    );
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    setThreads((prev) =>
      prev.map((t, i) =>
        i === selected
          ? {
              ...t,
              msgs: [...t.msgs, { me: true, text, time: "Now" }],
              preview: `Sent: ${text.slice(0, 40)}`,
              tag: "pending" as const,
            }
          : t
      )
    );
    setDraft("");
  }

  return (
    <div className="page-wrap">
      <div className="page-hd">
        <h2>Rental Inbox</h2>
        <p>Every landlord conversation tracked in one place.</p>
      </div>

      <div className={styles.layout}>
        {/* Thread list */}
        <div className={styles.list}>
          <div className={styles.listHead}>
            <span>Conversations</span>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount} new</span>
            )}
          </div>
          {threads.map((t, i) => (
            <button
              key={i}
              className={`${styles.item} ${t.unread ? styles.unread : ""} ${selected === i ? styles.selected : ""}`}
              onClick={() => select(i)}
            >
              <div className={styles.iname}>{t.title}</div>
              <div className={styles.iprev}>{t.preview}</div>
              <div className={styles.itime}>{t.time}</div>
              <span className={TAG_CLASSES[t.tag]}>{TAG_LABELS[t.tag]}</span>
            </button>
          ))}
        </div>

        {/* Message panel */}
        <div className={styles.tpanel}>
          <div className={styles.thead}>
            <div className={styles.ttitle}>{active.title}</div>
            <div className={styles.tsub}>{active.sub}</div>
          </div>

          <div className={styles.tbody}>
            {active.msgs.length === 0 ? (
              <div className={styles.empty}>No messages yet.</div>
            ) : (
              active.msgs.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.msg} ${m.me ? styles.me : styles.them}`}
                >
                  <div className={styles.bubble}>{m.text}</div>
                  <div className={styles.mtime}>{m.time}</div>
                </div>
              ))
            )}
          </div>

          <div className={styles.tinput}>
            <input
              type="text"
              placeholder="Type a message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn-primary" onClick={send} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
