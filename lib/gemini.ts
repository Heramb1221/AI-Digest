// lib/gemini.ts
// Wraps Google Gemini 2.0 Flash for article analysis.
//
// Returns a structured JSON object with:
//   summary    — 2-3 sentences for a developer audience
//   category   — one of the Category enum values
//   importance — integer 1–5
//
// Graceful degradation: if the API call fails or JSON is malformed,
// returns a safe default so the article is still saved without a summary.
// The digest runner continues — one failed article never blocks others.

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleAnalysis {
  summary:    string;
  category:   "TECHNICAL" | "BUSINESS" | "TRENDS" | "TOOLS" | "NEWS" | "UNCATEGORISED";
  importance: number; // 1–5
}

const FALLBACK: ArticleAnalysis = {
  summary:    "",
  category:   "UNCATEGORISED",
  importance: 3,
};

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a concise AI assistant that analyses articles for a developer-focused news digest.

Given an article TITLE and CONTENT, respond with ONLY a valid JSON object. No markdown. No backticks. No explanation.

JSON schema (strictly follow this):
{
  "summary":    "<2-3 sentences. Third person. Present tense. Focus on what's new, why it matters to developers.>",
  "category":   "<one of: TECHNICAL | BUSINESS | TRENDS | TOOLS | NEWS | UNCATEGORISED>",
  "importance": <integer 1-5>
}

Category guide:
- TECHNICAL  — code, algorithms, engineering deep-dives, architecture, languages, frameworks
- BUSINESS   — funding, acquisitions, company news, market analysis, product launches
- TRENDS     — industry shifts, research papers, surveys, emerging patterns
- TOOLS      — new tools, libraries, services, developer productivity, CLI/IDE/infra
- NEWS       — current events, policy, regulation, world news that affects tech
- UNCATEGORISED — doesn't clearly fit above

Importance guide:
- 5 = groundbreaking, must-read, major shift (rare — reserve for truly significant events)
- 4 = very relevant, affects many developers or the industry
- 3 = useful, worth knowing about
- 2 = mildly interesting, niche or minor update
- 1 = noise, opinion without substance, spam, or very minor update`;

// ─── Model cache — avoid re-instantiating on every article ───────────────────

const modelCache = new Map<string, GenerativeModel>();

function getModel(apiKey: string): GenerativeModel {
  if (modelCache.has(apiKey)) return modelCache.get(apiKey)!;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature:     0.3,   // low temp = consistent, factual summaries
      maxOutputTokens: 300,   // 2-3 sentences + JSON overhead is ~150 tokens
      responseMimeType: "application/json", // Gemini 2.0 supports JSON mode
    },
  });

  // Cap cache size — avoids leaking if many BYOK keys are used
  if (modelCache.size > 50) modelCache.clear();
  modelCache.set(apiKey, model);

  return model;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyseArticle(
  title:   string,
  content: string,
  apiKey?: string | null
): Promise<ArticleAnalysis> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("[gemini] No API key — returning fallback");
    return FALLBACK;
  }

  // Trim content to avoid exceeding context window on giant articles
  const trimmedContent = content.slice(0, 3_500);

  const prompt = `TITLE: ${title}\n\nCONTENT:\n${trimmedContent}`;

  try {
    const model  = getModel(key);
    const result = await model.generateContent(
      // Inline system + user turn so JSON mode applies
      [SYSTEM_PROMPT, prompt].join("\n\n---\n\n")
    );

    const text = result.response.text().trim();
    return parseAnalysis(text);
  } catch (err) {
    // Log but never throw — caller continues with FALLBACK
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gemini] analyseArticle failed for "${title}":`, msg);
    return FALLBACK;
  }
}

// ─── Generate a daily TL;DR across multiple summaries (for email digest) ──────

export async function generateTldr(
  summaries: string[],
  apiKey?: string | null
): Promise<string> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key || summaries.length === 0) return "";

  const prompt = `You are writing a one-paragraph TL;DR for a developer's morning news digest.
Synthesise the key themes from these ${summaries.length} article summaries into 3-5 sentences.
Be specific. Mention the most important topics by name.

Summaries:
${summaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Write only the TL;DR paragraph. No title. No bullet points.`;

  try {
    const model  = getModel(key);
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return "";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAnalysis(raw: string): ArticleAnalysis {
  // Strip any accidental markdown fences Gemini might still add
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/,      "")
    .replace(/\s*```$/,      "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last attempt: extract the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { return FALLBACK; }
    } else {
      return FALLBACK;
    }
  }

  const VALID_CATEGORIES = new Set([
    "TECHNICAL", "BUSINESS", "TRENDS", "TOOLS", "NEWS", "UNCATEGORISED",
  ]);

  const category = VALID_CATEGORIES.has(parsed.category)
    ? parsed.category
    : "UNCATEGORISED";

  const importance = Math.min(5, Math.max(1, Math.round(Number(parsed.importance) || 3)));

  return {
    summary:    typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    category,
    importance,
  };
}
