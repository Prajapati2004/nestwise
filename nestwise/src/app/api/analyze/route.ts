import { NextRequest } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const ANALYZE_PROMPT = `You are a real estate analysis engine. When given listing details, return ONLY valid JSON — no markdown, no explanation outside the JSON.

JSON structure:
{
  "scamScore": 0-10,
  "scamVerdict": "Safe" | "Review carefully" | "Likely scam" | "Almost certainly a scam",
  "scamFlags": ["string"],
  "dealScore": 0-10,
  "dealVerdict": "Great deal" | "Good deal" | "Fair deal" | "Poor deal" | "Avoid",
  "trueMonthlyCost": number,
  "trueMonthlyBreakdown": {
    "mortgage": number, "taxes": number, "insurance": number,
    "pmi": number, "maintenance": number, "hoa": number
  },
  "neighborhood": {
    "name": "string", "avgRent": "string", "avgHomePrices": "string",
    "safetyRating": "Safe" | "Generally safe" | "Mixed" | "Use caution",
    "safetyNote": "string", "walkScore": "string", "schools": "string",
    "marketType": "Buyer's market" | "Balanced" | "Seller's market" | "Renter's market",
    "trend": "string"
  },
  "keyInsights": ["string"],
  "negotiationTips": ["string"]
}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return Response.json({ error: "GEMINI_API_KEY not configured." }, { status: 500 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.listing) {
    return Response.json({ error: "No listing data provided." }, { status: 400 });
  }
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: ANALYZE_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Analyze this listing:\n\n${JSON.stringify(body.listing, null, 2)}` }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
      }),
    });
    if (!res.ok) {
      return Response.json({ error: "Analysis failed. Please try again." }, { status: 502 });
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);
    return Response.json(analysis);
  } catch (err) {
    console.error("[/api/analyze] Error:", err);
    return Response.json({ error: "Analysis failed. Please try again." }, { status: 502 });
  }
}
