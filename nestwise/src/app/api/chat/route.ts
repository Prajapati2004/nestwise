import { NextRequest } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;

// ── Firecrawl helpers ─────────────────────────────────────────────────────────

async function scrapeUrl(url: string): Promise<string | null> {
  if (!FIRECRAWL_KEY) return null;
  try {
    console.log("[Firecrawl] Scraping:", url);
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 15000,
      }),
    });
    if (!res.ok) {
      console.log("[Firecrawl] Scrape failed:", res.status);
      return null;
    }
    const data = await res.json();
    const text: string = data?.data?.markdown || data?.markdown || "";
    console.log("[Firecrawl] Scraped", text.length, "chars");
    return text.slice(0, 5000) || null;
  } catch (e) {
    console.log("[Firecrawl] Scrape error:", e);
    return null;
  }
}

async function searchWeb(query: string): Promise<string | null> {
  if (!FIRECRAWL_KEY) return null;
  try {
    console.log("[Firecrawl] Searching:", query.slice(0, 60));
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        query,
        limit: 3,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!res.ok) {
      console.log("[Firecrawl] Search failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const results = data?.data || [];
    console.log("[Firecrawl] Search returned", results.length, "results");
    if (results.length === 0) return null;
    const combined = results
      .map(
        (r: { markdown?: string; content?: string; url?: string }) =>
          `Source: ${r.url || "unknown"}\n${r.markdown || r.content || ""}`
      )
      .join("\n\n---\n\n");
    return combined.slice(0, 6000) || null;
  } catch (e) {
    console.log("[Firecrawl] Search error:", e);
    return null;
  }
}

// ── Context enrichment ────────────────────────────────────────────────────────

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function extractAddress(text: string): string | null {
  const match = text.match(
    /\d+\s+[A-Za-z0-9\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Terr|Ter|Circle|Cir|Court|Pkwy|Hwy)[.,\s]/i
  );
  return match ? match[0].trim() : null;
}

function extractCityState(text: string): string | null {
  const match = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})/);
  return match ? match[0] : null;
}

function isListingQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("listing") ||
    lower.includes("analyze") ||
    lower.includes("analysis") ||
    lower.includes("good deal") ||
    lower.includes("scam") ||
    lower.includes("worth it") ||
    lower.includes("price") ||
    !!extractAddress(text) ||
    !!extractUrl(text)
  );
}

function isNeighborhoodQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("neighborhood") ||
    lower.includes("area") ||
    lower.includes("research") ||
    lower.includes("average rent") ||
    lower.includes("average price") ||
    lower.includes("market") ||
    lower.includes("safe") ||
    lower.includes("schools") ||
    lower.includes("crime") ||
    lower.includes("cost of living") ||
    lower.includes("what's it like")
  );
}

async function buildContext(userText: string): Promise<string> {
  const contextParts: string[] = [];

  // 1. Scrape URL if present
  const url = extractUrl(userText);
  if (url) {
    const scraped = await scrapeUrl(url);
    if (scraped) {
      contextParts.push(`## LISTING PAGE DATA (scraped from ${url})\n${scraped}`);
    }
  }

  // 2. Search for comparable sales + neighborhood data
  const address = extractAddress(userText);
  const cityState = extractCityState(userText);
  const location = address || cityState;

  if (location) {
    // Run searches sequentially to avoid rate limits on free Firecrawl tier
    const comps = await searchWeb(`${location} home sold price comparable sales 2024 2025`);
    if (comps) contextParts.push(`## COMPARABLE SALES DATA\n${comps}`);

    const neighborhood = await searchWeb(`${cityState || location} neighborhood safety schools crime walkability`);
    if (neighborhood) contextParts.push(`## NEIGHBORHOOD RESEARCH\n${neighborhood}`);

    const market = await searchWeb(`${cityState || location} real estate market median price trend 2025`);
    if (market) contextParts.push(`## MARKET CONDITIONS\n${market}`);
  } else if (isNeighborhoodQuery(userText)) {
    const data = await searchWeb(
      `${userText.slice(0, 80)} real estate market average prices safety schools 2025`
    );
    if (data) contextParts.push(`## NEIGHBORHOOD RESEARCH\n${data}`);
  }

  if (contextParts.length === 0) {
    console.log("[Research] No context gathered — Nesta will use training knowledge only");
  } else {
    console.log("[Research] Gathered", contextParts.length, "context sections");
  }

  return contextParts.length > 0
    ? "\n\n" + contextParts.join("\n\n---\n\n") + "\n\n[END OF RESEARCH DATA]"
    : "";
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Nesta, an AI real estate advisor for NestWise. Your job is to protect buyers and renters from bad deals, hidden fees, and scams. You are direct, honest, and data-driven. You are not a salesperson and you never sugarcoat.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE RULE: RESEARCH BEFORE SCORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You will receive real research data from web searches and scraped listing pages before you score anything. You MUST:
1. Use that real data as your primary source for comparables and neighborhood facts
2. Explicitly cite what you found — source name and how recent the data is
3. If research data is incomplete or missing, say so clearly and reflect that uncertainty in your score
4. NEVER fabricate comparable sales numbers. If you cannot find real comps, say "I could not find recent comparable sales for this area" and note it lowers your confidence in the score

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEAL SCORE: HONEST METHODOLOGY (1-10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show your math. Explain every point. Be honest — a 6/10 that is accurate is better than a 9/10 that is flattering.

PRICE vs COMPARABLE SALES (0-4 pts)
Use ONLY real comparable sold prices from the research data.
- 15%+ below comparable sales → 4 pts
- 5-15% below → 3 pts
- Within 5% of market → 2 pts
- Above market → 0-1 pts
- No comps found → 1 pt (uncertainty penalty — flag this explicitly)

TRUE MONTHLY COST vs LOCAL INCOME (0-3 pts)
Calculate the full monthly cost:
  Mortgage (P&I) using stated rate or ~7% market rate, 30yr, stated down payment
  + Property tax (use local rate from research, or state average)
  + Insurance (~$100-125/mo for most homes)
  + PMI if down payment < 20% (0.8% of loan/yr / 12)
  + HOA (stated or $0)
  + Maintenance reserve (1% of price/yr / 12)
  = TOTAL monthly cost

Then compare to median household income for that area (find from research). Housing affordability rule: total cost should be 30% or less of gross monthly income.
- Well within 30% → 3 pts
- Borderline (30-35%) → 2 pts
- Over 35% → 1 pt
- Way over → 0 pts

DOWN PAYMENT (0-2 pts)
- 20%+ → 2 pts
- 10-19% → 1 pt
- Under 10% → 0 pts

LISTING-SPECIFIC ADJUSTMENTS (-2 to +1 pts)
- 90+ days on market → +1 pt (negotiation leverage)
- 30-89 days on market → +0.5 pts
- Recent major updates (roof, HVAC, kitchen) → +0.5 pts
- Vague or suspicious description → -1 pt
- Missing interior photos → -1 pt
- Other red flags → -0.5 to -2 pts

FINAL = sum, minimum 1, maximum 10, round to one decimal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCAM DETECTION — BE AGGRESSIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Flag any of these immediately:
- Price 25%+ below verified comps → HIGH SCAM RISK
- Price 40%+ below comps → ALMOST CERTAINLY A SCAM
- Wire transfer / Zelle / Venmo / Cash App / crypto / gift cards requested → SCAM
- "Owner is overseas / out of the country / on a mission" → SCAM
- Keys will be mailed → SCAM
- No interior photos on furnished unit → VERY SUSPICIOUS
- Same-day decision pressure → RED FLAG
- Listing appears on multiple platforms at wildly different prices → FLAG

Scam verdict:
GREEN SAFE — no red flags, price consistent with market
YELLOW VERIFY — 1-2 concerns, investigate before proceeding
ORANGE HIGH RISK — multiple red flags, do not send money until verified in person
RED LIKELY SCAM — classic pattern, do not proceed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LISTING ANALYSIS FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always structure full listing analyses as:

**SCAM CHECK** — verdict + specific reasons
**DEAL SCORE: X.X/10** — point-by-point breakdown showing your math
**TRUE MONTHLY COST** — full line-item breakdown
**COMPARABLE SALES** — what you found, source, date range
**NEIGHBORHOOD SNAPSHOT** — safety, schools, walkability, market type
**KEY RISKS** — what could go wrong with this specific property
**NEGOTIATION ANGLE** — specific tactics based on days on market, price vs comps, local conditions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HONESTY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- If you could not find good comp data, say so — do not fake confidence
- If a deal is genuinely great, say so without fake caveats
- If a deal is bad or overpriced, say so directly — do not soften it
- Give real information first, THEN optionally recommend professional verification
- Never cite Zillow Zestimate, Redfin Estimate, or any AVM as a comparable — only real sold prices
- Always tell the user the date range of comps you used
- For general questions (not listing analysis), answer conversationally without forcing the full analysis format`;

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_KEY) {
    return new Response(
      JSON.stringify({
        error: "AI service not configured. Please add GEMINI_API_KEY to your Render environment variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages: { role: string; content: string }[] = body.messages
    .slice(-20)
    .filter(
      (m: unknown) =>
        m &&
        typeof m === "object" &&
        typeof (m as Record<string, unknown>).role === "string" &&
        typeof (m as Record<string, unknown>).content === "string"
    )
    .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No valid messages provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Research phase
  const lastUserMessage = messages[messages.length - 1];
  const userText = lastUserMessage.role === "user" ? lastUserMessage.content : "";

  let enrichedContext = "";
  if (userText && (isListingQuery(userText) || isNeighborhoodQuery(userText))) {
    console.log("[Research] Starting research for query:", userText.slice(0, 80));
    enrichedContext = await buildContext(userText);
  }

  const enrichedMessages = enrichedContext
    ? [
        ...messages.slice(0, -1),
        { role: "user", content: lastUserMessage.content + enrichedContext },
      ]
    : messages;

  const geminiContents = enrichedMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}&alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.4,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Gemini] Error:", res.status, errText);
      const isAuthError = [400, 401, 403].includes(res.status);
      return new Response(
        JSON.stringify({
          error: isAuthError
            ? "Invalid Gemini API key. Check your GEMINI_API_KEY in Render."
            : "AI service error. Please try again.",
        }),
        {
          status: isAuthError ? 401 : 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!res.body) throw new Error("No response body");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(encoder.encode(text));
              } catch { /* skip malformed chunks */ }
            }
          }
        } catch (err) {
          console.error("[Gemini stream] Error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/chat] Gemini error:", err);
    return new Response(
      JSON.stringify({ error: "The AI service encountered an error. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
