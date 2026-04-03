"use client";

import { useState } from "react";
import styles from "./TrackerPage.module.css";

type Stage = "saved" | "contacted" | "toured" | "applied";

interface Property {
  id: number;
  addr: string;
  price: string;
  score: number;
  verdict: string;
  note: string;
  stage: Stage;
  topPick?: boolean;
  statusTag?: string;
}

const INITIAL: Property[] = [
  { id: 1, addr: "57 Elm St",      price: "$315,000",   score: 6, verdict: "Fair",  note: "Verify schools",       stage: "saved"    },
  { id: 2, addr: "142 Maple Ave",  price: "$289,000",   score: 8, verdict: "Good",  note: "Quiet street",         stage: "saved"    },
  { id: 3, addr: "201 Park St",    price: "$1,400/mo",  score: 7, verdict: "Good",  note: "Backup option",        stage: "saved"    },
  { id: 4, addr: "88 Westcott St", price: "$1,650/mo",  score: 6, verdict: "Fair",  note: "Tour pending",         stage: "contacted" },
  { id: 5, addr: "312 Oak Blvd",   price: "$229,000",   score: 9, verdict: "Great", note: "Very responsive",      stage: "contacted" },
  { id: 6, addr: "88 Westcott St", price: "$1,650/mo",  score: 6, verdict: "Fair",  note: "Great light, loud street", stage: "toured", topPick: true },
  { id: 7, addr: "312 Oak Blvd",   price: "$229,000",   score: 9, verdict: "Great", note: "Under review",         stage: "applied",  statusTag: "Under review" },
];

const STAGES: { id: Stage; label: string }[] = [
  { id: "saved",     label: "Saved"     },
  { id: "contacted", label: "Contacted" },
  { id: "toured",    label: "Toured"    },
  { id: "applied",   label: "Applied"   },
];

function scoreClass(s: number) {
  if (s >= 8) return styles.scoreGreen;
  if (s >= 5) return styles.scoreYellow;
  return styles.scoreRed;
}

export default function TrackerPage() {
  const [props, setProps] = useState<Property[]>(INITIAL);

  const saved     = props.filter((p) => p.stage === "saved").length;
  const contacted = props.filter((p) => p.stage === "contacted").length;
  const toured    = props.filter((p) => p.stage === "toured").length;
  const applied   = props.filter((p) => p.stage === "applied").length;

  function move(id: number, stage: Stage) {
    setProps((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage } : p))
    );
  }

  return (
    <div className="page-wrap">
      <div className={styles.pageHead}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>My Hunt</h2>
          <p style={{ color: "var(--subtle)", fontSize: 14 }}>
            Track every property from saved to applied.
          </p>
        </div>
        <button className="btn-primary">+ Add property</button>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {[
          { val: saved,     label: "Saved",     color: "var(--text)" },
          { val: contacted, label: "Contacted",  color: "var(--text)" },
          { val: toured,    label: "Tours",      color: "var(--g)"    },
          { val: applied,   label: "Applied",    color: "var(--w)"    },
        ].map(({ val, label, color }) => (
          <div key={label} className={styles.statBox}>
            <div className={styles.statVal} style={{ color }}>{val}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className={styles.kanban}>
        {STAGES.map((col) => {
          const cards = props.filter((p) => p.stage === col.id);
          return (
            <div key={col.id} className={styles.col}>
              <div className={styles.colTitle}>
                {col.label}
                <span className={styles.colCount}>{cards.length}</span>
              </div>

              {cards.length === 0 && (
                <div className={styles.emptyCol}>No properties here yet</div>
              )}

              {cards.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.card} ${p.topPick ? styles.topPick : ""}`}
                >
                  {p.topPick && (
                    <div className={styles.topPickLabel}>⭐ Top pick</div>
                  )}
                  <div className={styles.kaddr}>{p.addr}</div>
                  <div className={styles.kprice}>{p.price}</div>
                  <span className={`${styles.scorePill} ${scoreClass(p.score)}`}>
                    {p.score}/10 {p.verdict}
                  </span>
                  {p.note && <div className={styles.knote}>{p.note}</div>}
                  {p.statusTag && (
                    <span className="stag stag-tour" style={{ display: "block", marginTop: 8 }}>
                      {p.statusTag}
                    </span>
                  )}

                  {/* Move controls */}
                  <div className={styles.moveRow}>
                    {STAGES.filter((s) => s.id !== col.id).map((s) => (
                      <button
                        key={s.id}
                        className={styles.moveBtn}
                        onClick={() => move(p.id, s.id)}
                        title={`Move to ${s.label}`}
                      >
                        → {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
