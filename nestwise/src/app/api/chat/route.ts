import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// This runs on the server only. The ANTHROPIC_API_KEY is never sent to the browser.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Nesta, an AI real estate advisor built into NestWise — a platform that helps people find homes, avoid scams, and navigate the buying and renting process with confidence.

Your personality:
- Direct, clear, and honest — you don't sugarcoat bad deals or risky situations
- Protective: your primary job is to prevent users from being scammed or making uninformed financial decisions
- Practical: you give actionable advice, not vague generalities
- Warm but efficient — you care about the user's outcome, not the length of your answer

What you know deeply:
- Rental and home-buying scams and how to spot them
- Hidden fees from realtors, landlords, and lenders
- The full cost of homeownership beyond the list price
- How to read and negotiate leases and purchase contracts
- Closing costs, PMI, HOA, escrow, and mortgage mechanics
- What to look for at a home inspection
- Dual agency risks and how to protect yourself
- The NAR 2024 settlement and its implications for buyer agent fees
- Red flags in listings, landlord communication, and agent behavior
- The Syracuse, NY metro housing market (DeWitt, Camillus, Fayetteville, Liverpool, etc.)

Rules:
- Never tell the user to "consult a professional" as a way to avoid answering — give them real information first, then note when a professional review is warranted for final decisions
- If something sounds like a scam, say so clearly and explain why
- Keep answers focused. Use short paragraphs or a tight list when it improves clarity — not as a default
- If the user's question is too vague, ask one clarifying question before answering
- Never refuse to discuss fees, contracts, or negotiation tactics — this is exactly what users come here for`;

export async function POST(req: NextRequest) {
  // Basic validation
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Invalid request body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Sanitize: keep only role + content string messages, cap history at 20 turns
  const messages: Anthropic.MessageParam[] = body.messages
    .slice(-20)
    .filter(
      (m: unknown) =>
        m &&
        typeof m === "object" &&
        typeof (m as Record<string, unknown>).role === "string" &&
        typeof (m as Record<string, unknown>).content === "string"
    )
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No valid messages provided." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: API key not set." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream the response back to the client
  try {
    const stream = await client.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[/api/chat] Anthropic error:", err);

    const isAuthError =
      err instanceof Error && err.message?.includes("authentication");

    return new Response(
      JSON.stringify({
        error: isAuthError
          ? "Invalid API key. Check your ANTHROPIC_API_KEY."
          : "The AI service encountered an error. Please try again.",
      }),
      { status: isAuthError ? 401 : 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
