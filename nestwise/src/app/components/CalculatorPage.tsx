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
  const pmi = dp < 20 ? (loan * 0.008) / 12 : 0;
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
  const [researchDetails, setResearchDetails] = useState<{
    mortgageRate?: string;
    propertyTax?: string;
    insurance?: string;
    neighborhoodAvg?: string;
  }>({});

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
    setResearchDetails({});

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I need accurate real estate cost data for this property: ${state.address}
Home value for reference: $${state.price.toLocaleString()}

Research and respond with ONLY a valid JSON object, no other text, no markdown:
{
  "neighborhoodAvgPrice": 320000,
  "currentMortgageRate30yr": 6.85,
  "propertyTaxRate": 2.1,
  "annualHomeownersInsurance": 1850,
  "mortgageRateNote": "30-year fixed rate as of [month year] for [state]",
  "taxNote": "Cook County, IL effective tax rate based on assessed value",
  "insuranceNote": "Estimated for $320K home in Illinois based on state avg",
  "neighborhoodNote": "Based on comparable sales in [neighborhood] [month year]"
}

Rules:
- currentMortgageRate30yr: the actual current 30-year fixed mortgage rate for this state/area right now
- propertyTaxRate: the actual effective property tax rate for this county/city as a percentage of home value
- annualHomeownersInsurance: realistic annual homeowners insurance in dollars for this specific home value and location (varies by state — Florida is much higher than Ohio)
- neighborhoodAvgPrice: median sold price for similar homes in this neighborhood in the last 6 months
- All notes should be specific — cite the county, state, and data source if known
- If you cannot find real data for any field, use your best estimate and note the uncertainty`,
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

      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("Could not parse response");

      const data = JSON.parse(jsonMatch[0]);
      const updates: Partial<CalcState> = {};
      if (data.neighborhoodAvgPrice > 0) updates.avg = data.neighborhoodAvgPrice;
      if (data.currentMortgageRate30yr > 0) updates.ir = data.currentMortgageRate30yr;
      if (data.propertyTaxRate > 0) updates.tx = data.propertyTaxRate;
      if (data.annualHomeownersInsurance > 0) updates.ins = data.annualHomeownersInsurance;

      setState(prev => ({ ...prev, ...updates }));
      setResearchDetails({
        mortgageRate: data.mortgageRateNote || `${data.currentMortgageRate30yr}% 30-yr fixed`,
        propertyTax: data.taxNote || `${data.propertyTaxRate}% effective rate`,
        insurance: data.insuranceNote || `$${data.annualHomeownersInsurance}/yr estimated`,
        neighborhoodAvg: data.neighborhoodNote || `$${data.neighborhoodAvgPrice?.toLocaleString()} area median`,
      });
      setResearchNote(`Auto-filled mortgage rate, property tax, insurance, and neighborhood avg for ${state.address}`);
      setResearched(true);
    } catch {
      setResearchError("Research failed. You can still enter values manually below.");
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
        <p>Get an accurate monthly cost and honest deal score powered by real market data.</p>
      </div>

      <div className={styles.calcGrid}>
        <div className="panel">
          <h3 className={styles.panelTitle}>Property details</h3>

          <div className={styles.addressField}>
            <label htmlFor="calc-address">Property address</label>
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
            {researchNote && <div className={styles.researchNote}>✓ {researchNote}</div>}
            {researchError && <div className={styles.researchError}>⚠ {researchError}</div>}
            {!researched && !researchNote && !researchError && (
              <div className={styles.researchHint}>
                Click Research to auto-fill current mortgage rate, property tax, insurance, and neighborhood average for this address.
              </div>
            )}
            {researched && Object.keys(researchDetails).length > 0 && (
              <div className={styles.researchDetails}>
                {researchDetails.mortgageRate && <div className={styles.researchDetailRow}><span>📈 Mortgage rate:</span><span>{researchDetails.mortgageRate}</span></div>}
                {researchDetails.propertyTax && <div className={styles.researchDetailRow}><span>🏛 Property tax:</span><span>{researchDetails.propertyTax}</span></div>}
                {researchDetails.insurance && <div className={styles.researchDetailRow}><span>🛡 Insurance:</span><span>{researchDetails.insurance}</span></div>}
                {researchDetails.neighborhoodAvg && <div className={styles.researchDetailRow}><span>🏡 Neighborhood avg:</span><span>{researchDetails.neighborhoodAvg}</span></div>}
              </div>
            )}
          </div>

          {([
            { key: "price",  label: "Listing price ($)",              step: "1000" },
            { key: "avg",    label: "Neighborhood avg price ($)",     step: "1000" },
            { key: "budget", label: "Your monthly budget ($)",        step: "50"   },
            { key: "dp",     label: "Down payment (%)",               step: "1"    },
            { key: "ir",     label: "Interest rate (%) — 30yr fixed", step: "0.1"  },
            { key: "tx",     label: "Property tax (%/yr)",            step: "0.1"  },
            { key: "hoa",    label: "HOA / month ($)",                step: "50"   },
            { key: "ins",    label: "Home insurance / yr ($)",        step: "100"  },
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
            <div className={styles.crow}><span className={styles.clabel}>Maintenance reserve (1%/yr)</span><span>{fmt(r.maint)}</span></div>
            <div className={`${styles.crow} ${styles.crowTotal}`}>
              <span>Total / month</span><span style={{ color: "var(--g)" }}>{fmt(r.total)}</span>
            </div>
            {!researched && (
              <div className={styles.estimateNote}>
                ⓘ Using default estimates. Click Research above for location-accurate rates.
              </div>
            )}
          </div>

          <div className="panel">
            <h3 className={styles.panelTitle}>Closing costs (one-time)</h3>
            <div className={styles.crow}><span className={styles.clabel}>Down payment</span><span>{fmt(r.down)}</span></div>
            <div className={styles.crow}><span className={styles.clabel}>Closing costs (est. 2–5%)</span><span>{fmt(r.cLow)} – {fmt(r.cHigh)}</span></div>
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
                  The deal score compares the listing price to actual comparable sales in the neighborhood. Without a real address, any score would be misleading.
                </div>
                <button className="btn-outline" style={{ marginTop: "1rem" }} onClick={() => document.getElementById("calc-address")?.focus()}>
                  Enter address above ↑
                </button>
              </div>
            ) : (
              <>
                <div className={styles.scoreBig}>
                  <div className={`score-ring ${scoreRingClass}`} style={{ width: 70, height: 70, fontSize: 18 }}>{r.score}/10</div>
                  <div>
                    <div className={styles.scoreLabel} style={{ color: scoreColor }}>{r.verdict}</div>
                    <div className={styles.scoreSub}>Based on real local data · price vs. comps · monthly cost · down payment</div>
                  </div>
                </div>
                <div className={styles.factorRow}><span className={styles.fl}>Price vs. neighborhood avg</span><span className={pcClass}>{pdLabel}</span></div>
                <div className={styles.factorRow}><span className={styles.fl}>Monthly cost vs. your budget</span><span className={bcClass}>{fmt(r.total)}/mo vs. {fmt(state.budget)}</span></div>
                <div className={styles.factorRow}>
                  <span className={styles.fl}>Down payment strength</span>
                  <span className={dcClass}>{state.dp}%{state.dp >= 20 ? " (no PMI)" : state.dp >= 10 ? " (PMI applies)" : " (high PMI risk)"}</span>
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
