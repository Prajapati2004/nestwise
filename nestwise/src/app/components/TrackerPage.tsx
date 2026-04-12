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
  const [props, setProps] = useState<Property[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newNote, setNewNote] = useState("");

  const saved     = props.filter((p) => p.stage === "saved").length;
  const contacted = props.filter((p) => p.stage === "contacted").length;
  const toured    = props.filter((p) => p.stage === "toured").length;
  const applied   = props.filter((p) => p.stage === "applied").length;

  function move(id: number, stage: Stage) {
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)));
  }

  function remove(id: number) {
    setProps((prev) => prev.filter((p) => p.id !== id));
  }

  function toggleTopPick(id: number) {
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, topPick: !p.topPick } : p)));
  }

  function addProperty() {
    if (!newAddr.trim()) return;
    const newProp: Property = {
      id: Date.now(),
      addr: newAddr.trim(),
      price: newPrice.trim() || "—",
      score: 5,
      verdict: "New",
      note: newNote.trim(),
      stage: "saved",
    };
    setProps((prev) => [...prev, newProp]);
    setNewAddr("");
    setNewPrice("");
    setNewNote("");
    setShowAdd(false);
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
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          + Add property
        </button>
      </div>

      {showAdd && (
        <div className={`panel fade-in ${styles.addForm}`}>
          <h4 className={styles.addFormTitle}>Add a property</h4>
          <div className={styles.addFormGrid}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Address *</label>
              <input
                type="text"
                placeholder="e.g. 123 Main St, Syracuse NY"
                value={newAddr}
                onChange={(e) => setNewAddr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProperty()}
                autoFocus
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Price</label>
              <input
                type="text"
                placeholder="e.g. $250,000 or $1,500/mo"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProperty()}
              />
            </div>
            <div className="field" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
              <label>Notes (optional)</label>
              <input
                type="text"
                placeholder="e.g. Great schools, needs inspection"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProperty()}
              />
            </div>
          </div>
          <div className={styles.addFormActions}>
            <button className="btn-primary" onClick={addProperty} disabled={!newAddr.trim()}>
              Add to My Hunt
            </button>
            <button className="btn-outline" onClick={() => { setShowAdd(false); setNewAddr(""); setNewPrice(""); setNewNote(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.statsRow}>
        {[
          { val: saved,     label: "Saved",    color: "var(--text)" },
          { val: contacted, label: "Contacted", color: "var(--text)" },
          { val: toured,    label: "Tours",     color: "var(--g)"   },
          { val: applied,   label: "Applied",   color: "var(--w)"   },
        ].map(({ val, label, color }) => (
          <div key={label} className={styles.statBox}>
            <div className={styles.statVal} style={{ color }}>{val}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {props.length === 0 && !showAdd && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏠</div>
          <h3>No properties tracked yet</h3>
          <p>Add properties you&apos;re interested in to keep your search organized.</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add your first property
          </button>
        </div>
      )}

      {props.length > 0 && (
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
                  <div key={p.id} className={`${styles.card} ${p.topPick ? styles.topPick : ""}`}>
                    {p.topPick && <div className={styles.topPickLabel}>⭐ Top pick</div>}
                    <div className={styles.cardHeader}>
                      <div>
                        <div className={styles.kaddr}>{p.addr}</div>
                        <div className={styles.kprice}>{p.price}</div>
                      </div>
                      <button className={styles.removeBtn} onClick={() => remove(p.id)} title="Remove">✕</button>
                    </div>
                    <span className={`${styles.scorePill} ${scoreClass(p.score)}`}>{p.score}/10 {p.verdict}</span>
                    {p.note && <div className={styles.knote}>{p.note}</div>}
                    {p.statusTag && <span className="stag stag-tour" style={{ display: "block", marginTop: 8 }}>{p.statusTag}</span>}
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.starBtn} ${p.topPick ? styles.starBtnOn : ""}`}
                        onClick={() => toggleTopPick(p.id)}
                        title={p.topPick ? "Remove top pick" : "Mark as top pick"}
                      >
                        {p.topPick ? "★" : "☆"}
                      </button>
                    </div>
                    <div className={styles.moveRow}>
                      {STAGES.filter((s) => s.id !== col.id).map((s) => (
                        <button key={s.id} className={styles.moveBtn} onClick={() => move(p.id, s.id)}>
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
      )}
    </div>
  );
}
