/**
 * Farmer conversation. The page sends the conversation so far plus facts from
 * the farmer's own records; the model replies in two or three short sentences,
 * in the farmer's language, using only those facts.
 * Ollama Cloud (OLLAMA_API_KEY) answers first; Sarvam's chat model
 * (SARVAM_API_KEY) answers when Ollama is not configured or fails. Keys stay
 * on the server. A 501/502 tells the page to fall back to the rule-based answer.
 */
import { NextResponse } from "next/server";
import type { ChatTurn, ReplyRequest } from "@/services/replyContext";
import { MAX_FACTS_CHARS, MAX_TURNS } from "@/services/replyContext";

export const runtime = "nodejs";

const OLLAMA_URL = "https://ollama.com/api/chat";
const SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions";
const KINDS = new Set(["problem", "completion", "resource_request", "question", "condition"]);

const KIND_GOAL: Record<string, string> = {
  question: "They asked a question. Answer exactly that question with useful, specific content. Use the farm records only if the question is about their own fields, crops, machines, tasks or weather.",
  problem:
    "They described a crop problem: explain in plain words what it could mean and one safe, general thing to check or do. Do not name a disease as certain, and never suggest a chemical or a dose. The app shows a button to send it to the owner.",
  completion: "They said work is finished: acknowledge it. The app shows a button to record it for the owner.",
  resource_request: "They need something: if the records show when it is next booked for them, say so. The app shows a button to send the request to the owner.",
  condition: "Respond to what they actually said.",
};

function systemPrompt(req: ReplyRequest): string {
  const language = {
    hi: "simple spoken Hindi in Devanagari script (no English words unless they are common in rural speech, like tractor)",
    pa: "simple spoken Punjabi in Gurmukhi script (no English words unless they are common in rural speech, like tractor; never Hindi or Devanagari)",
    en: "simple spoken Indian English",
  }[req.language];
  return [
    "You are Urvara, a knowledgeable farm assistant talking with an Indian farmer. Every reply is read aloud by a text-to-speech voice.",
    `Reply in ${language}.`,
    "Answer exactly what the farmer asked, whatever the topic: crops, livestock, prices, government schemes, methods, weather or their own farm. Give the actual answer with practical detail, not a deflection.",
    "Stay on the topic of their message. Do not bring up soil moisture, irrigation, tasks or anything else from the records unless the question is about it. Do not end with an unrelated question or reminder.",
    "Be concise: at most 3 short sentences, under 50 words. No lists, no markdown, no emojis, no headings, no greeting after the first turn.",
    "For anything about this farmer's own farm (their soil readings, weather, machines, tasks, dates) use only the records below and never invent numbers, dates, machines or names. For general questions, answer from sound Indian agricultural knowledge. If you truly cannot know something (for example today's exact mandi price or a payment date), say so briefly and tell them where to check.",
    "On this farm the owner books machines, workers and inputs through Urvara. If the records show no booking for what they ask about, say none is booked for them yet and that they can ask the owner here; never send them to an outside service.",
    "Never recommend a specific pesticide, chemical or dose, and never claim a disease is certain; for those say an agronomist or the owner can advise.",
    "Write numbers as digits and say units in words (for example 'mm rain' or 'percent').",
  ].join("\n");
}

/** The farmer's records, kept apart from the instructions so the model treats them as reference, not as the topic. */
function factsNote(req: ReplyRequest): string {
  return `Reference only, use if the farmer asks about these things:\n${req.facts}`;
}

/** Urvara's reading of the latest message, given to the model as guidance. */
function hintNote(req: ReplyRequest): string | null {
  if (!req.hint) return null;
  return [
    req.hint.understood ? `Urvara's reading of the farmer's latest message: ${req.hint.understood}.` : "",
    KIND_GOAL[req.hint.kind] ?? "",
    req.hint.draftAnswer ? `This answer from the farm records is correct; say the same thing, more naturally: ${req.hint.draftAnswer}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function validTurns(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const turns = value.slice(-MAX_TURNS).map((t) => t as Partial<ChatTurn>);
  if (turns.some((t) => (t.role !== "user" && t.role !== "assistant") || typeof t.content !== "string" || !t.content.trim() || t.content.length > 1000)) return null;
  if (turns[turns.length - 1].role !== "user") return null;
  return turns.map((t) => ({ role: t.role!, content: t.content!.trim() }));
}

/** Strip anything that would sound wrong when spoken. */
function forSpeech(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/[*_#`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Prompt = { role: string; content: string }[];
type Answer = { text: string; provider: "ollama" | "sarvam"; model: string };

/** A reply that stopped mid-sentence should not be spoken. */
const complete = (text: string) => /[।?!.)"']$/.test(text);

async function askOllama(key: string, prompt: Prompt): Promise<Answer | null> {
  const model = process.env.OLLAMA_MODEL || "gemma4:31b";
  // Reasoning models (gpt-oss) ignore think:false and spend tokens thinking first: keep that short and leave room for the answer.
  const reasoning = /^gpt-oss/.test(model);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false, think: reasoning ? "low" : false, messages: prompt, options: { temperature: 0.3, num_predict: reasoning ? 1200 : 300 } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`Ollama chat failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
      return null;
    }
    const data = (await res.json().catch(() => null)) as { message?: { content?: string }; done_reason?: string } | null;
    const text = forSpeech(data?.message?.content ?? "");
    if (!text || data?.done_reason === "length" || !complete(text)) {
      console.error(`Ollama reply incomplete (${data?.done_reason}): ${text.slice(0, 80)}`);
      return null;
    }
    return { text, provider: "ollama", model };
  } catch {
    console.error("Ollama chat did not respond");
    return null;
  }
}

async function askSarvam(key: string, prompt: Prompt): Promise<Answer | null> {
  const model = process.env.SARVAM_CHAT_MODEL || "sarvam-105b-conversations";
  let best: Answer | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(SARVAM_CHAT_URL, {
        method: "POST",
        headers: { "api-subscription-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: prompt, reasoning_effort: null, temperature: 0.3, max_tokens: 300 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.error(`Sarvam chat failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
        continue;
      }
      const data = (await res.json().catch(() => null)) as { choices?: { finish_reason?: string; message?: { content?: string | null } }[] } | null;
      const choice = data?.choices?.[0];
      const text = forSpeech(choice?.message?.content ?? "");
      if (!text) continue;
      if (choice?.finish_reason === "stop" && complete(text)) return { text, provider: "sarvam", model };
      console.error(`Sarvam chat reply looked cut off (${choice?.finish_reason}): ${text.slice(0, 80)}`);
      if (!best || text.length > best.text.length) best = { text, provider: "sarvam", model };
    } catch {
      console.error("Sarvam chat did not respond");
    }
  }
  return best;
}

export function GET() {
  return NextResponse.json({ available: Boolean(process.env.OLLAMA_API_KEY || process.env.SARVAM_API_KEY) });
}

export async function POST(request: Request) {
  const ollamaKey = process.env.OLLAMA_API_KEY;
  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!ollamaKey && !sarvamKey) return NextResponse.json({ error: "The AI assistant is not configured on the server." }, { status: 501 });

  const body = (await request.json().catch(() => null)) as (Partial<ReplyRequest> & { hint?: Partial<ReplyRequest["hint"]> }) | null;
  const messages = validTurns(body?.messages);
  if (!body || (body.language !== "hi" && body.language !== "en" && body.language !== "pa") || !messages || typeof body.facts !== "string" || body.facts.length > MAX_FACTS_CHARS + 100) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const hint = body.hint && KINDS.has(String(body.hint.kind)) ? body.hint : undefined;
  const req: ReplyRequest = {
    language: body.language,
    messages,
    facts: body.facts,
    hint: hint
      ? {
          kind: hint.kind as NonNullable<ReplyRequest["hint"]>["kind"],
          understood: String(hint.understood ?? "").slice(0, 400),
          draftAnswer: typeof hint.draftAnswer === "string" ? hint.draftAnswer.slice(0, 600) : undefined,
        }
      : undefined,
  };
  const note = hintNote(req);
  const prompt: Prompt = [
    { role: "system", content: systemPrompt(req) },
    { role: "system", content: factsNote(req) },
    ...req.messages.slice(0, -1),
    ...(note ? [{ role: "system", content: note }] : []),
    req.messages[req.messages.length - 1],
  ];

  const answer = (ollamaKey ? await askOllama(ollamaKey, prompt) : null) ?? (sarvamKey ? await askSarvam(sarvamKey, prompt) : null);
  if (!answer) return NextResponse.json({ error: "The AI assistant could not answer." }, { status: 502 });
  return NextResponse.json(answer);
}
