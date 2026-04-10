"use client";

import { useState, useCallback } from "react";
import styles from "./CalculatorPage.module.css";

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

interface CalcState {
  address: string;
  price: number;
  avg: number;
  budget: number;
  dp: number;
  ir: number;
  tx: number;
  hoa: number;
  ins: number;
}

function compute(s: CalcState) {
  const { price, avg, budget, dp, ir, tx, hoa, ins } = s;
  const down = price * dp / 100;
  const loan = price - down;
  const mr = ir / 100 / 12;
  const mtg = mr > 0
    ? loan * (mr * Math.pow(1 + mr, 360)) / (Math.pow(1 + mr, 360) - 1)
    : loan / 360;
  const mTax = (price * tx) / 100 / 12;
  const mIns = ins / 12;
  const pmi = dp < 20 ? (loan * 0.01) / 12 : 0;
  const maint = (price * 0.01) / 12;
  const total = mtg + mTax + mIns + hoa + pmi + maint;
  const cLow = price * 0.02;
  const cHigh = price * 0.05;
  const pd = avg > 0 ? ((avg - price) / avg) * 100 : 0;
  const bd = budget > 0 ? total - budget : 0;
  let pts = 0;
  if (pd >= 15) pts += 4; else if (pd >= 5) pts += 3; else if (pd >= -5) pts += 2;
  if (bd <= 0) pts += 3; else if (bd <= 200) pts += 2; else if (bd <= 400) pts += 1;
  if (dp >= 20) pts += 2; else if (dp >= 10) pts += 1;
  const score = Math.min(10, Math.round((pts * 10) / 9));
  const verdict = score >= 8 ? "Great deal" : score >= 6 ? "Good deal" : score >= 4 ? "Fair deal" : "Poor deal";
  return { mtg, mTax, mIns, pmi, maint, hoa, total, down, cLow, cHigh, score, verdict, pd, bd };
}

const DEFAULTS: CalcState = {
  address: "",
  price: 289000, avg: 0, budget: 2000,
  dp: 10, ir: 6.8, tx: 1.7, hoa: 0, ins: 1400,
};

export default function CalculatorPage() {
  const [state, setState] = useState<CalcState>(DEFAULTS);
  const [researched, setResearched] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchNote, setResearchNote] = useState("");
  const [researchError, setResearchError] = useState("");

  const r = compute(state);

  const set = useCallback((key: keyof CalcState, val: string) => {
    setState((prev) => ({ ...prev, [key]: key === "address" ? val : parseFloat(val) || 0 }));
    if (key === "avg" && parseFloat(val) > 0) setResearched(true);
  }, []);

  async function researchAddress() {
    if (!state.address.trim()) return;
    setResearching(true);
    setResearchError("");
    setResearchNote("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I need real estate data for this address: ${state.address}

Please respond with ONLY a JSON object in this exact format, no other text:
{
  "neighborhoodAvgPrice": 320000,
  "propertyTaxRate": 1.8,
  "note": "Based on comparable sales in [neighborhood], [city]"
}

- neighborhoodAvgPrice: median sold price in dollars for similar homes in that area (integer)
- propertyTaxRate: annual property tax rate as a percentage (number)
- note: one sentence explaining the source and confidence of your data

If you cannot find real data, use your best estimate based on the city/state and set neighborhoodAvgPrice to 0.`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error("Research failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse response");

      const data = JSON.parse(jsonMatch[0]);

      if (data.neighborhoodAvgPrice > 0) {
        setState(prev => ({
          ...prev,
          avg: data.neighborhoodAvgPrice,
          tx: data.propertyTaxRate || prev.tx,
        }));
        setResearchNote(data.note || "");
        setResearched(true);
      } else {
        setResearchError("Couldn't find reliable data for this address. Enter the neighborhood average manually.");
      }
    } catch {
      setResearchError("Research failed. Check your AI service or enter the neighborhood average manually.");
    } finally {
      setResearching(false);
    }
  }

  const scoreRingClass = r.score >= 8 ? "score-green" : r.score >= 6 ? "score-yellow" : "score-red";
  const scoreColor = r.score >= 8 ? "#166534" : r.score >= 6 ? "var(--g)" : "#92400e";
  const alertClass = r.score >= 7 ? "alert alert-green" : "alert alert-warn";
  const pdLabel = r.pd >= 0
    ? `${Math.round(r.pd)}% below neighborhood avg`
    : `${Math.round(Math.abs(r.pd))}% above neighborhood avg`;
  const pcClass = r.pd >= 5 ? styles.fgood : r.pd >= -5 ? styles.fok : styles.fbad;
  const bcClass = r.bd <= 0 ? styles.fgood : r.bd <= 300 ? styles.fok : styles.fbad;
  const dcClass = state.dp >= 20 ? styles.fgood : state.dp >= 10 ? styles.fok : styles.fbad;
  const tip = r.score >= 8
    ? `Strong buy. The price is ${Math.round(r.pd)}% under the neighborhood average and fits your budget comfortably.`
    : r.score >= 6
    ? `Decent value. The true monthly cost (${fmt(r.total)}/mo) is close to your budget — make sure it works long-term.`
    : `Be careful. The numbers are tight or unfavorable. Consider negotiating the price or waiting for a better listing.`;

  return (
    <div className="page-wrap">
      <div className="page-hd">
        <h2>True Cost + Deal Score</h2>
        <p>See what you&apos;ll actually pay — and get an honest AI-powered deal score.</p>
      </div>

      <div className={styles.calcGrid}>
        <div className="panel">
          <h3 className={styles.panelTitle}>Property details</h3>

          <div className={styles.addressField}>
            <label htmlFor="calc-address">Property address (for accurate deal score)</label>
            <div className={styles.addressRow}>
              <input
                id="calc-address"
                type="text"
                placeholder="e.g. 8755 N Oleander Ave, Niles, IL"
                value={state.address}
                onChange={(e) => set("address", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && researchAddress()}
                className={styles.addressInput}
              />
              <button
                className={`btn-primary ${styles.researchBtn}`}
                onClick={researchAddress}
                disabled={researching || !state.address.trim()}
              >
                {researching ? <span className={styles.spinner} /> : "🔍 Research"}
              </button>
            </div>
            {researchNote && (
              <div className={styles.researchNote}>✓ {researchNote}</div>
            )}
            {researchError && (
              <div className={styles.researchError}>⚠ {researchError}</div>
            )}
            {!researched && !researchNote && !researchError && (
              <div className={styles.researchHint}>
                Enter an address and click Research to get a real deal score based on comparable sales.
              </div>
            )}
          </div>

          {([
            { key: "price",  label: "Listing price ($)",                                        step: "1000" },
            { key: "avg",    label: "Neighborhood average price ($) — auto-filled by Research", step: "1000" },
            { key: "budget", label: "Your monthly budget ($)",                                  step: "50"   },
            { key: "dp",     label: "Down payment (%)",                                         step: "1"    },
            { key: "ir",     label: "Interest rate (%)",                                        step: "0.1"  },
            { key: "tx",     label: "Property tax (%/yr) — auto-filled by Research",            step: "0.1"  },
            { key: "hoa",    label: "HOA / month ($)",                                          step: "50"   },
            { key: "ins",    label: "Home insurance / yr ($)",                                  step: "100"  },
          ] as { key: keyof CalcState; label: string; step: string }[]).map(({ key, label, step }) =>
            key === "address" ? null :
            <div className="field" key={key}>
              <label htmlFor={`calc-${key}`}>{label}</label>
              <input
                id={`calc-${key}`}
                type="number"
                value={state[key] as number}
                step={step}
                min="0"
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles.outputCol}>
          <div className="panel">
            <h3 className={styles.panelTitle}>Monthly breakdown</h3>
            <div className={styles.crow}><span className={styles.clabel}>Mortgage (P&amp;I)</span><span>{fmt(r.mtg)}</span></div>
            <div className={styles.crow}><span className={styles.clabel}>Property tax</span><span>{fmt(r.mTax)}</span></div>
            <div className={styles.crow}><span className={styles.clabel}>Home insurance</span><span>{fmt(r.mIns)}</span></div>
            {r.hoa > 0 && <div className={styles.crow}><span className={styles.clabel}>HOA</span><span>{fmt(r.hoa)}</span></div>}
            {r.pmi > 0 && <div className={styles.crow}><span className={styles.clabel}>PMI (under 20% down)</span><span style={{ color: "var(--w)" }}>{fmt(r.pmi)}</span></div>}
            <div className={styles.crow}><span className={styles.clabel}>Est. maintenance (1%/yr)</span><span>{fmt(r.maint)}</span></div>
            <div className={`${styles.crow} ${styles.crowTotal}`}>
              <span>Total / month</span><span style={{ color: "var(--g)" }}>{fmt(r.total)}</span>
            </div>
          </div>

          <div className="panel">
            <h3 className={styles.panelTitle}>Closing costs (one-time)</h3>
            <div className={styles.crow}><span className={styles.clabel}>Down payment</span><span>{fmt(r.down)}</span></div>
            <div className={styles.crow}><span className={styles.clabel}>Closing costs (est.)</span><span>{fmt(r.cLow)} – {fmt(r.cHigh)}</span></div>
            <div className={`${styles.crow} ${styles.crowTotal}`}>
              <span>Cash needed to close</span>
              <span style={{ color: "var(--g)" }}>{fmt(r.down + r.cLow)} – {fmt(r.down + r.cHigh)}</span>
            </div>
            <div className="alert alert-warn" style={{ marginTop: "12px" }}>
              Budget for the higher end ({fmt(r.cHigh)}) — closing costs are often revealed late in the process.
            </div>
          </div>

          <div className="panel">
            <h3 className={styles.panelTitle}>Deal score</h3>
            {!researched ? (
              <div className={styles.scoreGate}>
                <div className={styles.scoreGateIcon}>🔍</div>
                <div className={styles.scoreGateTitle}>Enter an address to get your deal score</div>
                <div className={styles.scoreGateText}>
                  The deal score compares the listing price to actual comparable sales in the neighborhood.
                  Without a real address, any score would be misleading.
                </div>
                <button
                  className="btn-outline"
                  style={{ marginTop: "1rem" }}
                  onClick={() => document.getElementById("calc-address")?.focus()}
                >
                  Enter address above ↑
                </button>
              </div>
            ) : (
              <>
                <div className={styles.scoreBig}>
                  <div className={`score-ring ${scoreRingClass}`} style={{ width: 70, height: 70, fontSize: 18 }}>{r.score}/10</div>
                  <div>
                    <div className={styles.scoreLabel} style={{ color: scoreColor }}>{r.verdict}</div>
                    <div className={styles.scoreSub}>Based on real neighborhood data · Price vs. avg · monthly cost · down payment</div>
                  </div>
                </div>
                {researchNote && <div className={styles.dataSource}>📊 Data: {researchNote}</div>}
                <div className={styles.factorRow}><span className={styles.fl}>Price vs. neighborhood avg</span><span className={pcClass}>{pdLabel}</span></div>
                <div className={styles.factorRow}><span className={styles.fl}>Monthly cost vs. your budget</span><span className={bcClass}>{fmt(r.total)}/mo vs. {fmt(state.budget)}</span></div>
                <div className={styles.factorRow}>
                  <span className={styles.fl}>Down payment risk</span>
                  <span className={dcClass}>{state.dp}%{state.dp >= 20 ? " (no PMI)" : state.dp >= 10 ? " (PMI applies)" : " (high PMI)"}</span>
                </div>
                <div className={styles.factorRow}><span className={styles.fl}>Cash to close</span><span>{fmt(r.down + r.cLow)} – {fmt(r.down + r.cHigh)}</span></div>
                <div className={alertClass} style={{ marginTop: "12px" }}>{tip}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
