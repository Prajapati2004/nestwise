"use client";

import { useState } from "react";
import styles from "./SearchPage.module.css";

interface Listing {
  img: string;
  bg: string;
  price: string;
  addr: string;
  meta: string;
  badgeClass: string;
  badgeText: string;
  trueCost: string;
  scam: "safe" | "review" | "risk";
  score: number;
  verdict: string;
  why: string;
}

const ALL_LISTINGS: Listing[] = [
  {
    img: "🏡", bg: "#f0fdf4",
    price: "$289,000", addr: "142 Maple Ave, DeWitt, NY",
    meta: "3 bd · 2 ba · 1,450 sqft",
    badgeClass: "bv", badgeText: "✓ Verified",
    trueCost: "~$1,920/mo true cost", scam: "safe",
    score: 8, verdict: "Good deal", why: "7% below avg · fits budget",
  },
  {
    img: "🏢", bg: "#eff6ff",
    price: "$1,650/mo", addr: "88 Westcott St, Syracuse, NY",
    meta: "2 bd · 1 ba · 900 sqft",
    badgeClass: "bn", badgeText: "New",
    trueCost: "~$1,840/mo with fees", scam: "safe",
    score: 6, verdict: "Fair deal", why: "At market avg · slightly over budget",
  },
  {
    img: "🏘️", bg: "#fffbeb",
    price: "$315,000", addr: "57 Elm St, Fayetteville, NY",
    meta: "4 bd · 2.5 ba · 1,800 sqft",
    badgeClass: "bw", badgeText: "Price drop",
    trueCost: "~$2,110/mo true cost", scam: "review",
    score: 6, verdict: "Fair deal", why: "At avg · over budget by $110/mo",
  },
  {
    img: "🏠", bg: "#fff1f2",
    price: "$850/mo", addr: "999 University Ave, Syracuse, NY",
    meta: "3 bd · 2 ba · 1,200 sqft",
    badgeClass: "bs", badgeText: "⚠ Possible scam",
    trueCost: "Price 60% below area avg", scam: "risk",
    score: 2, verdict: "Likely scam", why: "Price anomaly · high risk",
  },
  {
    img: "🏡", bg: "#f0fdf4",
    price: "$229,000", addr: "312 Oak Blvd, Camillus, NY",
    meta: "3 bd · 1 ba · 1,100 sqft",
    badgeClass: "bv", badgeText: "✓ Verified",
    trueCost: "~$1,560/mo true cost", scam: "safe",
    score: 9, verdict: "Great deal", why: "26% below avg · well within budget",
  },
  {
    img: "🏢", bg: "#eff6ff",
    price: "$1,400/mo", addr: "201 Park St, Liverpool, NY",
    meta: "1 bd · 1 ba · 650 sqft",
    badgeClass: "bn", badgeText: "New",
    trueCost: "~$1,540/mo with fees", scam: "safe",
    score: 7, verdict: "Good deal", why: "5% below avg · fits budget",
  },
];

const FILTERS = ["Any price", "2+ beds", "Pet friendly", "Parking", "<30 min commute", "Verified only"];

function scoreClass(s: number) {
  if (s >= 8) return "score-green";
  if (s >= 5) return "score-yellow";
  return "score-red";
}
function scoreColor(s: number) {
  if (s >= 8) return "#166534";
  if (s >= 5) return "#92400e";
  return "#991b1b";
}

interface SearchPageProps {
  onAskAi: (question: string) => void;
}

export default function SearchPage({ onAskAi }: SearchPageProps) {
  const [mode, setMode] = useState<"buy" | "rent">("buy");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["Any price"]));

  function toggleFilter(f: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  }

  return (
    <div className="page-wrap">
      <div className={styles.hero}>
        <h1>Find your next home</h1>
        <p>Verified listings · scam detection · real costs · deal scores</p>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === "buy" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("buy")}
          >
            Buying
          </button>
          <button
            className={`${styles.modeBtn} ${mode === "rent" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("rent")}
          >
            Renting
          </button>
        </div>
      </div>

      <div className={styles.searchRow}>
        <input
          type="text"
          defaultValue="Syracuse, NY"
          placeholder="City, neighborhood, or ZIP"
          className={styles.searchInput}
        />
        <button className="btn-primary">Search</button>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`chip ${activeFilters.has(f) ? "active" : ""}`}
            onClick={() => toggleFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="section-label">{ALL_LISTINGS.length} listings found</p>

      <div className={styles.grid}>
        {ALL_LISTINGS.map((l, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardImg} style={{ background: l.bg }}>
              <span className={styles.cardEmoji}>{l.img}</span>
              <span className={`${styles.badge} ${styles[l.badgeClass]}`}>
                {l.badgeText}
              </span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.price}>{l.price}</div>
              <div className={styles.addr}>{l.addr}</div>
              <div className={styles.meta}>{l.meta}</div>
            </div>
            <div className={styles.dealBar}>
              <div className={`score-ring ${scoreClass(l.score)}`}>
                {l.score}/10
              </div>
              <div className={styles.dealInfo}>
                <div className={styles.verdict} style={{ color: scoreColor(l.score) }}>
                  {l.verdict}
                </div>
                <div className={styles.why}>{l.why}</div>
              </div>
              {l.scam === "risk" ? (
                <button
                  className={`${styles.askBtn} ${styles.askBtnRed}`}
                  onClick={() =>
                    onAskAi(
                      `This listing looks suspicious: ${l.addr} at ${l.price}. The price is ${l.why}. Is this a scam? What should I look for?`
                    )
                  }
                >
                  Ask AI ⚠️
                </button>
              ) : (
                <button
                  className={styles.askBtn}
                  onClick={() =>
                    onAskAi(
                      `Can you help me evaluate this property: ${l.addr}, listed at ${l.price}? ${l.meta}. True cost estimate is ${l.trueCost}. Deal analysis says: ${l.why}.`
                    )
                  }
                >
                  Ask AI ↗
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
