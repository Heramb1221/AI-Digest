// app/api/ai/chat/route.ts
// Allows users to ask questions about their current digest.
// The last 20 article summaries are injected as context.
// Requires PRO plan.
//
// Request body:
//   { message: string, history: { role: "user"|"model", parts: [{text}] }[] }
//
// Response:
//   { reply: string }

import { NextRequest, NextResponse } from "next/server";
import { auth }                   from "@/lib/auth";
import { db }                     from "@/lib/db";
import { requirePlan, planError } from "@/lib/plan";
import { GoogleGenerativeAI }     from "@google/generative-ai";

const MAX_CONTEXT_ARTICLES = 20;

export async function POST(req: NextRequest) {
  // ── Plan gate ───────────────────────────────────────────────────────────────
  try {
    await requirePlan("PRO");
  } catch (e) {
    const r = planError(e);
    if (r) return r;
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const session = await auth();
  const userId  = session!.user.id;

  // Rate limit: 30 messages per hour per user
  const { chatLimiter } = await import("@/lib/rate-limit");
  const limited = chatLimiter.check(userId);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Chat rate limit reached. Try again in an hour." },
      { status: 429 }
    );
  }

  let body: { message?: string; history?: any[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { message, history = [] } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  // ── Build digest context ────────────────────────────────────────────────────
  const articles = await db.article.findMany({
    where:   { seenBy: { some: { userId } } },
    orderBy: [{ importance: "desc" }, { fetchedAt: "desc" }],
    take:    MAX_CONTEXT_ARTICLES,
    select:  {
      title:      true,
      summary:    true,
      category:   true,
      importance: true,
      url:        true,
      source:     { select: { name: true } },
    },
  });

  const context = articles.length > 0
    ? articles
        .map((a, i) =>
          `${i + 1}. [${a.category}] (importance ${a.importance}/5) "${a.title}" — ${a.source.name}\n   ${a.summary ?? "No summary."}\n   ${a.url}`
        )
        .join("\n\n")
    : "No articles in digest yet.";

  const systemPrompt = `You are a helpful assistant for an AI-powered news digest app.
The user has these articles in their current digest:

${context}

Help the user navigate their reading. Answer questions about the content, recommend what to read first, explain topics, compare articles, or summarise a specific piece.
Be concise. If an article isn't in the digest, say so rather than making things up.`;

  // ── Call Gemini ─────────────────────────────────────────────────────────────
  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { geminiApiKey: true },
  });

  const apiKey = user.geminiApiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No Gemini API key configured." }, { status: 503 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature:     0.7,
        maxOutputTokens: 600,
      },
    });

    const chat   = model.startChat({ history });
    const result = await chat.sendMessage(message);

    return NextResponse.json({ reply: result.response.text() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai/chat] Gemini error:", msg);
    return NextResponse.json(
      { error: "AI service error. Please try again." },
      { status: 503 }
    );
  }
}
