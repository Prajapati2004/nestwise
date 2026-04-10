"use client";
import type { PageId } from "../page";
import styles from "./NavBar.module.css";

const NAV_ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: "search",     label: "Search",           icon: "🔍" },
  { id: "calculator", label: "True Cost",         icon: "💰" },
  { id: "inbox",      label: "Inbox",             icon: "💬" },
  { id: "tracker",    label: "My Hunt",           icon: "📋" },
  { id: "realtors",   label: "Honest Realtors",   icon: "🤝" },
  { id: "ai",         label: "AI Advisor",        icon: "🤖" },
];

interface NavBarProps {
  activePage: PageId;
  setActivePage: (id: PageId) => void;
  inboxUnread?: number;
}

export default function NavBar({ activePage, setActivePage, inboxUnread = 0 }: NavBarProps) {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`${styles.nb} ${activePage === item.id ? styles.active : ""}`}
          onClick={() => setActivePage(item.id)}
          aria-current={activePage === item.id ? "page" : undefined}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
          {item.id === "inbox" && inboxUnread > 0 && (
            <span className={styles.badge}>{inboxUnread}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
