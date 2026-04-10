"use client";

import styles from "./RealtorsPage.module.css";

interface Realtor {
  initials: string; avatarBg: string; avatarColor: string;
  name: string; title: string; rating: number; deals: number; complaints: number;
  badges: { text: string; type: "green" | "blue" }[];
  review: string; reviewer: string; verified: boolean;
}

const REALTORS: Realtor[] = [
  {
    initials: "MJ", avatarBg: "#dcfce7", avatarColor: "#166534",
    name: "Marcus Johnson", title: "Buyer's Agent · 11 yrs exp",
    rating: 4.9, deals: 143, complaints: 0,
    badges: [
      { text: "✓ Full fee disclosure on file", type: "green" },
      { text: "✓ No dual agency — ever",        type: "blue"  },
      { text: "✓ Background checked",            type: "green" },
    ],
    review: "Marcus found us a house 12% under our max budget and never once pushed us to spend more. Total straight shooter.",
    reviewer: "Sarah T., bought in DeWitt 2024", verified: true,
  },
  {
    initials: "PR", avatarBg: "#dbeafe", avatarColor: "#1e40af",
    name: "Priya Ramesh", title: "First-time buyer specialist · 7 yrs",
    rating: 4.8, deals: 89, complaints: 1,
    badges: [
      { text: "✓ Full fee disclosure on file", type: "green" },
      { text: "✓ Background checked",           type: "blue"  },
    ],
    review: "She walked me through every document at closing. I never felt rushed or confused.",
    reviewer: "James K., bought in Camillus 2024", verified: false,
  },
  {
    initials: "DW", avatarBg: "#fef3c7", avatarColor: "#92400e",
    name: "David Wu", title: "Rentals + condo specialist · 9 yrs",
    rating: 4.7, deals: 201, complaints: 2,
    badges: [
      { text: "✓ Full fee disclosure on file", type: "green" },
      { text: "✓ Background checked",           type: "blue"  },
    ],
    review: "David negotiated $4k off my rent for the first year and was upfront about every fee from the first call.",
    reviewer: "Monica R., renting in Syracuse 2025", verified: false,
  },
];

const RED_FLAGS = [
  "Pressure to waive inspection \"to be competitive\" — this is how buyers miss major structural issues.",
  "Undisclosed dual agency — agent represents both buyer and seller, creating a conflict of interest.",
  "Hidden admin/processing fees added at closing not mentioned upfront.",
  "Steering toward higher-priced homes to earn a larger commission.",
];

interface RealtorsPageProps { onAskAi: (question: string) => void; }

export default function RealtorsPage({ onAskAi }: RealtorsPageProps) {
  return (
    <div className="page-wrap">
      <div className="page-hd">
        <h2>Honest Realtors</h2>
        <p>Vetted agents with verified reviews, transparent fee disclosure, and no hidden charges.</p>
      </div>

      <div className={styles.redFlags}>
        <h4>⚠️ Common realtor red flags — watch out for these</h4>
        {RED_FLAGS.map((f, i) => (
          <div key={i} className={styles.flagItem}>
            <span className={styles.flagIcon}>🚩</span><span>{f}</span>
          </div>
        ))}
        <button className={styles.askAiBtn}
          onClick={() => onAskAi("What are the biggest realtor red flags I should watch out for when buying a home? What are my rights if I encounter them?")}>
          Ask Nesta about realtor red flags →
        </button>
      </div>

      <p className="section-label" style={{ marginBottom: 14 }}>Verified realtors near Syracuse, NY</p>

      <div className={styles.grid}>
        {REALTORS.map((r) => (
          <div key={r.name} className={`${styles.card} ${r.verified ? styles.cardTop : ""}`}>
            {r.verified && <span className={styles.topBadge}>✓ NestWise Verified</span>}
            <div className={styles.header}>
              <div className={styles.avatar} style={{ background: r.avatarBg, color: r.avatarColor }}>{r.initials}</div>
              <div>
                <div className={styles.name}>{r.name}</div>
                <div className={styles.title}>{r.title}</div>
              </div>
            </div>
            <div className={styles.stats}>
              {[{ val: r.rating, label: "Rating" }, { val: r.deals, label: "Deals" }, { val: r.complaints, label: "Complaints" }].map(({ val, label }) => (
                <div key={label} className={styles.stat}>
                  <div className={styles.statVal}>{val}</div>
                  <div className={styles.statLabel}>{label}</div>
                </div>
              ))}
            </div>
            {r.badges.map((b) => (
              <div key={b.text} className={`trust-badge ${b.type === "green" ? "tb-green" : "tb-blue"}`}>{b.text}</div>
            ))}
            <div className={styles.review}>
              <p className={styles.reviewText}>&ldquo;{r.review}&rdquo;</p>
              <p className={styles.reviewAuthor}>— {r.reviewer}</p>
            </div>
            <button className="btn-primary" style={{ width: "100%", marginTop: 4 }}>Connect with {r.name.split(" ")[0]}</button>
            <button className="btn-outline" style={{ width: "100%", marginTop: 8 }}
              onClick={() => onAskAi(`I'm considering working with a realtor named ${r.name} who specializes in ${r.title}. What questions should I ask them before signing anything?`)}>
              Ask AI about this agent
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
