"use client";

import type { PageId } from "../page";
import styles from "./NavBar.module.css";

const NAV_ITEMS: { id: PageId; label: string; icon: string; badge?: number }[] = [
  { id: "search",     label: "Search",           icon: "🔍" },
  { id: "calculator", label: "True Cost",         icon: "💰" },
  { id: "inbox",      label: "Inbox",             icon: "💬", badge: 3 },
  { id: "tracker",    label: "My Hunt",           icon: "📋" },
  { id: "realtors",   label: "Honest Realtors",   icon: "🤝" },
  { id: "ai",         label: "AI Advisor",        icon: "🤖" },
];

interface NavBarProps {
  activePage: PageId;
  setActivePage: (id: PageId) => void;
}

export default function NavBar({ activePage, setActivePage }: NavBarProps) {
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
          {item.badge != null && (
            <span className={styles.badge}>{item.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
