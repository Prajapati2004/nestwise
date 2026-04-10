"use client";

import { useState, useCallback, useEffect } from "react";
import styles from "./SearchPage.module.css";

interface Listing {
  address: string;
  city: string;
  price: string;
  priceNum: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  url: string;
  imgUrl?: string;
  daysOnMarket: number;
  neighborhoodAvg: number;
  scamRisk: "safe" | "review" | "risk";
  score: number;
  verdict: string;
  why: string;
  img?: string;
  bg?: string;
}

interface AiScore {
  loading: boolean;
  score: number | null;
  verdict: string | null;
  scamVerdict: string | null;
  error: boolean;
}

const DEMO_LISTINGS: Listing[] = [
  {
    address: "142 Maple Ave, DeWitt, NY", city: "DeWitt",
    price: "$289,000", priceNum: 289000, beds: 3, baths: 2, sqft: 1450,
    description: "Well-maintained colonial on a quiet street. New roof 2022, updated kitchen.",
    url: "", daysOnMarket: 12, neighborhoodAvg: 310000,
    scamRisk: "safe", score: 8, verdict: "Good deal", why: "7% below avg",
    img: "🏡", bg: "#f0fdf4",
  },
  {
    address: "88 Westcott St, Syracuse, NY", city: "Syracuse",
    price: "$1,650/mo", priceNum: 1650, beds: 2, baths: 1, sqft: 900,
    description: "Bright 2BR in Westcott neighborhood. Hardwood floors, pets allowed.",
    url: "", daysOnMarket: 3, neighborhoodAvg: 1580,
    scamRisk: "safe", score: 6, verdict: "Fair deal", why: "At market avg",
    img: "🏢", bg: "#eff6ff",
  },
  {
    address: "312 Oak Blvd, Camillus, NY", city: "Camillus",
    price: "$229,000", priceNum: 229000, beds: 3, baths: 1, sqft: 1100,
    description: "Move-in ready ranch. Updated bathroom, new HVAC 2023. Large backyard.",
    url: "", daysOnMarket: 8, neighborhoodAvg: 310000,
    scamRisk: "safe", score: 9, verdict: "Great deal", why: "26% below avg",
    img: "🏡", bg: "#f0fdf4",
  },
  {
    address: "999 University Ave, Syracuse, NY", city: "Syracuse",
    price: "$850/mo", priceNum: 850, beds: 3, baths: 2, sqft: 1200,
    description: "3BR near campus. Contact landlord for details. Must act fast.",
    url: "", daysOnMarket: 1, neighborhoodAvg: 2100,
    scamRisk: "risk", score: 2, verdict: "Likely scam", why: "60% below area avg",
    img: "🏠", bg: "#fff1f2",
  },
  {
    address: "201 Park St, Liverpool, NY", city: "Liverpool",
    price: "$1,400/mo", priceNum: 1400, beds: 1, baths: 1, sqft: 650,
    description: "Modern 1BR in Liverpool village. In-unit washer/dryer, updated kitchen.",
    url: "", daysOnMarket: 5, neighborhoodAvg: 1470,
    scamRisk: "safe", score: 7, verdict: "Good deal", why: "5% below avg",
    img: "🏢", bg: "#eff6ff",
  },
  {
    address: "88 Thornwood Cir, Clay, NY", city: "Clay",
    price: "$267,500", priceNum: 267500, beds: 4, baths: 2, sqft: 1750,
    description: "4BR in Clay school district. Finished basement, 2-car garage.",
    url: "", daysOnMarket: 14, neighborhoodAvg: 297000,
    scamRisk: "safe", score: 8, verdict: "Good deal", why: "10% below avg",
    img: "🏡", bg: "#f0fdf4",
  },
];

const LISTING_EMOJIS = ["🏡", "🏢", "🏘️", "🏠", "🏗️", "🏛️"];
const LISTING_BGS = ["#f0fdf4", "#eff6ff", "#fffbeb", "#fff1f2", "#f5f3ff", "#f0f9ff"];
function getEmoji(i: number) { return LISTING_EMOJIS[i % LISTING_EMOJIS.length]; }
function getBg(i: number) { return LISTING_BGS[i % LISTING_BGS.length]; }

function scoreRingClass(s: number) {
  if (s >= 8) return "score-green";
  if (s >= 5) return "score-yellow";
  return "score-red";
}
function scoreColor(s: number) {
  if (s >= 8) return "#166534";
  if (s >= 5) return "#92400e";
  return "#991b1b";
}

interface BuyFilters {
  minPrice: string; maxPrice: string; minBeds: string; minBaths: string;
  homeType: string; newConstruction: boolean; foreclosure: boolean;
}
interface RentFilters {
  minPrice: string; maxPrice: string; minBeds: string; minBaths: string;
  homeType: string; spaceType: string;
}
const DEFAULT_BUY: BuyFilters = { minPrice: "", maxPrice: "", minBeds: "0", minBaths: "0", homeType: "", newConstruction: false, foreclosure: false };
const DEFAULT_RENT: RentFilters = { minPrice: "", maxPrice: "", minBeds: "0", minBaths: "0", homeType: "", spaceType: "" };

interface SearchPageProps { onAskAi: (question: string) => void; }

// ── Single card that auto-fetches its AI score ────────────────────────────────

function ListingCard({
  listing, index, isLive, expanded, onToggleExpand, onAskAi, imgError, onImgError,
}: {
  listing: Listing;
  index: number;
  isLive: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAskAi: (q: string) => void;
  imgError: boolean;
  onImgError: () => void;
}) {
  const [aiScore, setAiScore] = useState<AiScore>({ loading: true, score: null, verdict: null, scamVerdict: null, error: false });

  useEffect(() => {
    let cancelled = false;

    async function fetchScore() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing: {
              address: listing.address,
              price: listing.price,
              priceNum: listing.priceNum,
              beds: listing.beds,
              baths: listing.baths,
              sqft: listing.sqft,
              description: listing.description,
              daysOnMarket: listing.daysOnMarket,
              neighborhoodAvg: listing.neighborhoodAvg,
            },
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.error || !data.dealScore) {
          setAiScore({ loading: false, score: null, verdict: null, scamVerdict: null, error: true });
        } else {
          setAiScore({
            loading: false,
            score: data.dealScore,
            verdict: data.dealVerdict,
            scamVerdict: data.scamVerdict,
            error: false,
          });
        }
      } catch {
        if (!cancelled) setAiScore({ loading: false, score: null, verdict: null, scamVerdict: null, error: true });
      }
    }

    // Stagger requests to avoid hammering the API — 300ms per card
    const delay = index * 300;
    const timer = setTimeout(fetchScore, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [listing, index]);

  const proxyUrl = listing.imgUrl
    ? `/api/image-proxy?url=${encodeURIComponent(listing.imgUrl)}`
    : null;
  const hasPhoto = !!(proxyUrl && !imgError);
  const fallbackEmoji = listing.img || getEmoji(index);
  const fallbackBg = listing.bg || getBg(index);

  // Use AI score if available, fall back to listing score
  const displayScore = aiScore.score ?? listing.score;
  const displayVerdict = aiScore.verdict ?? listing.verdict;
  const isScam = listing.scamRisk === "risk" ||
    aiScore.scamVerdict === "Likely scam" ||
    aiScore.scamVerdict === "Almost certainly a scam";

  return (
    <div className={`${styles.card} ${isScam ? styles.cardScam : ""}`}>
      {/* Image */}
      <div className={styles.cardImg} style={hasPhoto ? {} : { background: fallbackBg }}>
        {hasPhoto ? (
          <img src={proxyUrl!} alt={listing.address} className={styles.cardPhoto} onError={onImgError} />
        ) : (
          <span className={styles.cardEmoji}>{fallbackEmoji}</span>
        )}
        {isScam && <span className={`${styles.badge} ${styles.bs}`}>⚠ Check carefully</span>}
        {!isScam && displayScore >= 8 && <span className={`${styles.badge} ${styles.bv}`}>✓ Good value</span>}
        {listing.daysOnMarket > 0 && listing.daysOnMarket <= 7 && (
          <span className={styles.domBadge}>🔥 {listing.daysOnMarket}d listed</span>
        )}
        {isLive && <span className={styles.liveBadge}>● Live</span>}
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <div className={styles.price}>{listing.price}</div>
        <div className={styles.addr}>{listing.address}</div>
        <div className={styles.meta}>
          {listing.beds > 0 ? `${listing.beds} bd` : "—"} ·{" "}
          {listing.baths > 0 ? `${listing.baths} ba` : "—"}{" "}
          {listing.sqft > 0 ? `· ${listing.sqft.toLocaleString()} sqft` : ""}
        </div>
        {expanded && (
          <div className={`${styles.description} fade-in`}>
            <p>{listing.description}</p>
            {listing.neighborhoodAvg > 0 && (
              <div className={styles.neighborhoodRow}>
                <span>Area avg: <strong>${listing.neighborhoodAvg.toLocaleString()}{listing.priceNum < 10000 ? "/mo" : ""}</strong></span>
                <span style={{ color: listing.priceNum < listing.neighborhoodAvg ? "var(--gm)" : "var(--d)", fontWeight: 600 }}>
                  {listing.priceNum < listing.neighborhoodAvg
                    ? `${Math.round((1 - listing.priceNum / listing.neighborhoodAvg) * 100)}% below avg`
                    : `${Math.round((listing.priceNum / listing.neighborhoodAvg - 1) * 100)}% above avg`}
                </span>
              </div>
            )}
            {listing.url && (
              <a href={listing.url} target="_blank" rel="noopener noreferrer" className={styles.viewLink}>
                View original listing ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Deal bar — AI score */}
      <div className={styles.dealBar}>
        {aiScore.loading ? (
          <div className={styles.scoreLoading}>
            <span className={styles.scorePulse} />
            <span className={styles.scoreLoadingText}>Nesta scoring...</span>
          </div>
        ) : aiScore.error ? (
          <>
            <div className={`score-ring ${scoreRingClass(listing.score)}`}>{listing.score}/10</div>
            <div className={styles.dealInfo}>
              <div className={styles.verdict} style={{ color: scoreColor(listing.score) }}>{listing.verdict}</div>
              <div className={styles.why}>{listing.why}</div>
            </div>
          </>
        ) : (
          <>
            <div className={`score-ring ${scoreRingClass(displayScore)}`}>{displayScore}/10</div>
            <div className={styles.dealInfo}>
              <div className={styles.verdict} style={{ color: scoreColor(displayScore) }}>{displayVerdict}</div>
              <div className={styles.why}>
                <span className={styles.aiTag}>🤖 Nesta</span> {listing.why}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className={styles.cardActions}>
        <button className={styles.detailBtn} onClick={onToggleExpand}>
          {expanded ? "Less ↑" : "Details ↓"}
        </button>
        {isScam ? (
          <button
            className={`${styles.askBtn} ${styles.askBtnRed}`}
            onClick={() => onAskAi(`This listing looks suspicious: ${listing.address} at ${listing.price}. It is ${listing.why}. The area average is $${listing.neighborhoodAvg.toLocaleString()}. Is this a scam? What are the specific red flags?`)}
          >⚠️ Ask AI — scam check</button>
        ) : (
          <button
            className={styles.askBtn}
            onClick={() => onAskAi(`Please analyze this listing and research the neighborhood: ${listing.address}, listed at ${listing.price}${listing.beds > 0 ? `, ${listing.beds} bed ${listing.baths} bath` : ""}. Area average is $${listing.neighborhoodAvg.toLocaleString()}. Deal score: ${displayScore}/10. Give me neighborhood safety, schools, market trends, and whether this is a good deal.`)}
          >Ask Nesta ↗</button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchPage({ onAskAi }: SearchPageProps) {
  const [mode, setMode] = useState<"buy" | "rent">("buy");
  const [searchInput, setSearchInput] = useState("Syracuse, NY");
  const [listings, setListings] = useState<Listing[]>(DEMO_LISTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [lastSearched, setLastSearched] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [listingKey, setListingKey] = useState(0); // force re-mount cards on new search

  const [buyFilters, setBuyFilters] = useState<BuyFilters>(DEFAULT_BUY);
  const [rentFilters, setRentFilters] = useState<RentFilters>(DEFAULT_RENT);

  function switchMode(m: "buy" | "rent") { setMode(m); setShowFilters(false); }

  function buildParams(location: string, type: "buy" | "rent") {
    const params: Record<string, string> = { location, type };
    if (type === "buy") {
      if (buyFilters.minPrice) params.minPrice = buyFilters.minPrice;
      if (buyFilters.maxPrice) params.maxPrice = buyFilters.maxPrice;
      if (buyFilters.minBeds !== "0") params.minBeds = buyFilters.minBeds;
      if (buyFilters.minBaths !== "0") params.minBaths = buyFilters.minBaths;
      if (buyFilters.homeType) params.homeType = buyFilters.homeType;
      if (buyFilters.newConstruction) params.newConstruction = "true";
      if (buyFilters.foreclosure) params.foreclosure = "true";
    } else {
      if (rentFilters.minPrice) params.minPrice = rentFilters.minPrice;
      if (rentFilters.maxPrice) params.maxPrice = rentFilters.maxPrice;
      if (rentFilters.minBeds !== "0") params.minBeds = rentFilters.minBeds;
      if (rentFilters.minBaths !== "0") params.minBaths = rentFilters.minBaths;
      if (rentFilters.homeType) params.homeType = rentFilters.homeType;
      if (rentFilters.spaceType) params.spaceType = rentFilters.spaceType;
    }
    return new URLSearchParams(params).toString();
  }

  const runSearch = useCallback(async (location: string, type: "buy" | "rent") => {
    setLoading(true);
    setError(null);
    setIsLive(false);
    setExpandedCard(null);
    setImgErrors({});
    setLastSearched(location);
    try {
      const qs = buildParams(location, type);
      const res = await fetch(`/api/listings?${qs}`);
      const data = await res.json();
      if (data.listings && data.listings.length > 0) {
        setListings(data.listings);
        setIsLive(true);
        setListingKey(k => k + 1);
      } else if (data.error) {
        setListings(DEMO_LISTINGS.filter((l) => type === "buy" ? l.priceNum > 50000 : l.priceNum < 5000));
        setError(data.error);
        setListingKey(k => k + 1);
      } else {
        setListings(DEMO_LISTINGS);
        setError(`No listings found for "${location}". Showing demo listings.`);
        setListingKey(k => k + 1);
      }
    } catch {
      setListings(DEMO_LISTINGS);
      setError("Search failed. Showing demo listings.");
      setListingKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyFilters, rentFilters]);

  function handleSearch() {
    if (searchInput.trim()) runSearch(searchInput.trim(), mode);
  }

  function clearFilters() {
    if (mode === "buy") setBuyFilters(DEFAULT_BUY);
    else setRentFilters(DEFAULT_RENT);
  }

  function hasActiveFilters() {
    if (mode === "buy") {
      const f = buyFilters;
      return !!(f.minPrice || f.maxPrice || f.minBeds !== "0" || f.minBaths !== "0" || f.homeType || f.newConstruction || f.foreclosure);
    }
    const f = rentFilters;
    return !!(f.minPrice || f.maxPrice || f.minBeds !== "0" || f.minBaths !== "0" || f.homeType || f.spaceType);
  }

  const filtered = listings.filter((l) => {
    if (safeOnly && l.scamRisk === "risk") return false;
    return true;
  });

  const scamCount = filtered.filter((l) => l.scamRisk === "risk").length;

  return (
    <div className="page-wrap">
      <div className={styles.hero}>
        <h1>Find your next home</h1>
        <p>Search real listings · AI scam detection · true costs · deal scores</p>
        <div className={styles.modeToggle}>
          <button className={`${styles.modeBtn} ${mode === "buy" ? styles.modeBtnActive : ""}`} onClick={() => switchMode("buy")}>🏡 Buying</button>
          <button className={`${styles.modeBtn} ${mode === "rent" ? styles.modeBtnActive : ""}`} onClick={() => switchMode("rent")}>🔑 Renting</button>
        </div>
      </div>

      <div className={styles.searchRow}>
        <input type="text" value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter city, neighborhood, or ZIP (e.g. Syracuse NY, Brooklyn NY...)"
          className={styles.searchInput} />
        <button className={`${styles.filterToggleBtn} ${showFilters ? styles.filterToggleActive : ""}`} onClick={() => setShowFilters(!showFilters)}>
          ⚙ Filters {hasActiveFilters() && <span className={styles.filterDot} />}
        </button>
        <button className="btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : "Search"}
        </button>
      </div>

      {showFilters && (
        <div className={`${styles.filterPanel} fade-in`}>
          <div className={styles.filterPanelHeader}>
            <span className={styles.filterPanelTitle}>{mode === "buy" ? "🏡 Buying Filters" : "🔑 Renting Filters"}</span>
            {hasActiveFilters() && <button className={styles.clearFiltersBtn} onClick={clearFilters}>✕ Clear all</button>}
          </div>
          {mode === "buy" ? (
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Min Price</label><input type="number" placeholder="e.g. 100000" className={styles.filterInput} value={buyFilters.minPrice} onChange={(e) => setBuyFilters(p => ({ ...p, minPrice: e.target.value }))} /></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Max Price</label><input type="number" placeholder="e.g. 500000" className={styles.filterInput} value={buyFilters.maxPrice} onChange={(e) => setBuyFilters(p => ({ ...p, maxPrice: e.target.value }))} /></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Min Bedrooms</label><select className={styles.filterSelect} value={buyFilters.minBeds} onChange={(e) => setBuyFilters(p => ({ ...p, minBeds: e.target.value }))}><option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option></select></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Min Bathrooms</label><select className={styles.filterSelect} value={buyFilters.minBaths} onChange={(e) => setBuyFilters(p => ({ ...p, minBaths: e.target.value }))}><option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Home Type</label><select className={styles.filterSelect} value={buyFilters.homeType} onChange={(e) => setBuyFilters(p => ({ ...p, homeType: e.target.value }))}><option value="">Any type</option><option value="SINGLE_FAMILY">Single Family</option><option value="CONDO">Condo</option><option value="TOWNHOUSE">Townhouse</option><option value="MULTI_FAMILY">Multi-family</option><option value="MANUFACTURED">Manufactured</option><option value="LOT">Lot / Land</option></select></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Special Listings</label><div className={styles.toggleRow}><button className={`${styles.toggleBtn} ${buyFilters.newConstruction ? styles.toggleBtnOn : ""}`} onClick={() => setBuyFilters(p => ({ ...p, newConstruction: !p.newConstruction }))}>{buyFilters.newConstruction ? "✓ " : ""}New Construction</button><button className={`${styles.toggleBtn} ${buyFilters.foreclosure ? styles.toggleBtnOn : ""}`} onClick={() => setBuyFilters(p => ({ ...p, foreclosure: !p.foreclosure }))}>{buyFilters.foreclosure ? "✓ " : ""}Foreclosures</button></div></div>
            </div>
          ) : (
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Min Monthly Rent</label><input type="number" placeholder="e.g. 800" className={styles.filterInput} value={rentFilters.minPrice} onChange={(e) => setRentFilters(p => ({ ...p, minPrice: e.target.value }))} /></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Max Monthly Rent</label><input type="number" placeholder="e.g. 3000" className={styles.filterInput} value={rentFilters.maxPrice} onChange={(e) => setRentFilters(p => ({ ...p, maxPrice: e.target.value }))} /></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Min Bedrooms</label><select className={styles.filterSelect} value={rentFilters.minBeds} onChange={(e) => setRentFilters(p => ({ ...p, minBeds: e.target.value }))}><option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Min Bathrooms</label><select className={styles.filterSelect} value={rentFilters.minBaths} onChange={(e) => setRentFilters(p => ({ ...p, minBaths: e.target.value }))}><option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Home Type</label><select className={styles.filterSelect} value={rentFilters.homeType} onChange={(e) => setRentFilters(p => ({ ...p, homeType: e.target.value }))}><option value="">Any type</option><option value="HOUSES">Houses</option><option value="APARTMENTS">Apartments</option><option value="CONDOS">Condos</option><option value="TOWNHOMES">Townhomes</option></select></div>
              <div className={styles.filterGroup}><label className={styles.filterLabel}>Space Type</label><select className={styles.filterSelect} value={rentFilters.spaceType} onChange={(e) => setRentFilters(p => ({ ...p, spaceType: e.target.value }))}><option value="">Any</option><option value="ENTIRE_PLACE">Entire Place</option><option value="ROOM">Room only</option></select></div>
            </div>
          )}
          <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={handleSearch} disabled={loading}>Apply Filters & Search</button>
        </div>
      )}

      <div className={styles.filters}>
        <button className={`chip ${safeOnly ? "active" : ""}`} onClick={() => setSafeOnly(!safeOnly)}>🛡 Hide scam risks</button>
        {(safeOnly || hasActiveFilters()) && <button className="chip" onClick={() => { setSafeOnly(false); clearFilters(); }}>✕ Clear all filters</button>}
      </div>

      {isLive ? (
        <div className={styles.liveBar}>
          <span className={styles.liveDot} />
          <span>Live results for <strong>{lastSearched}</strong> — {filtered.length} listings · Nesta is scoring each one...</span>
        </div>
      ) : (
        <div className={styles.demoBar}>
          <span>📋 Showing demo listings — search any city to load real results</span>
        </div>
      )}

      {error && <div className="alert alert-warn" style={{ marginBottom: "1rem" }}>{error}</div>}

      {scamCount > 0 && !safeOnly && (
        <div className={styles.scamBanner}>
          <span>⚠️ <strong>{scamCount} listing{scamCount > 1 ? "s" : ""}</strong> flagged as possible scam{scamCount > 1 ? "s" : ""}.</span>
          <button className={styles.scamBannerBtn} onClick={() => setSafeOnly(true)}>Hide risky listings</button>
        </div>
      )}

      {loading && (
        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skeletonImg} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} style={{ width: "60%" }} />
                <div className={styles.skeletonLine} style={{ width: "90%" }} />
                <div className={styles.skeletonLine} style={{ width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏠</div>
          <h3>No listings match your filters</h3>
          <p>Try removing filters or searching a different area.</p>
          <button className="btn-outline" onClick={() => { setSafeOnly(false); clearFilters(); }}>Reset filters</button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((l, i) => (
            <ListingCard
              key={`${listingKey}-${i}`}
              listing={l}
              index={i}
              isLive={isLive}
              expanded={expandedCard === i}
              onToggleExpand={() => setExpandedCard(expandedCard === i ? null : i)}
              onAskAi={onAskAi}
              imgError={!!imgErrors[i]}
              onImgError={() => setImgErrors(prev => ({ ...prev, [i]: true }))}
            />
          ))}
        </div>
      )}

      {!loading && (
        <div className={styles.bottomCta}>
          <div className={styles.ctaContent}>
            <div className={styles.ctaIcon}>🔍</div>
            <div>
              <strong>Have a listing from Zillow, Craigslist, or Facebook?</strong>
              <p>Paste the URL directly into Nesta — she&apos;ll scrape it and give you a full scam check, deal score, and neighborhood research.</p>
            </div>
            <button className="btn-primary" onClick={() => onAskAi("I want to analyze a listing. Here is the URL or details: ")}>Paste a listing →</button>
          </div>
        </div>
      )}
    </div>
  );
}
