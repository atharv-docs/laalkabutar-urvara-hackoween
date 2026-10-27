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
  question: "They asked a question: answer it directly first, then give the one reason from the facts.",
  problem:
    "They described a crop problem: explain in plain words what it could mean and that the owner can send someone to check. Give at most one safe, general step (for example, check nearby plants). Do not name a disease as certain, and never suggest a chemical or a dose. The app shows a button to send it to the owner.",
  completion: "They said work is finished: acknowledge it and mention their next upcoming work if the facts show one. The app shows a button to record it for the owner.",
  resource_request: "They need something: say when it is next booked for them if the facts show it. The app shows a button to send the request to the owner.",
  condition: "Reply naturally and briefly; if anything in the facts (rain, soil moisture, upcoming work) matters for what they said, mention it.",
};

function systemPrompt(req: ReplyRequest): string {
  const language = {
    hi: "simple spoken Hindi in Devanagari script (no English words unless they are common in rural speech, like tractor)",
    pa: "simple spoken Punjabi in Gurmukhi script (no English words unless they are common in rural speech, like tractor; never Hindi or Devanagari)",
    en: "simple spoken Indian English",
  }[req.language];
  return [
    "You are Urvara, a farm assistant having a spoken conversation with a farmer. Every reply is read aloud by a text-to-speech voice.",
    `Reply in ${language}.`,
    "Be as concise as possible: at most 3 short sentences, under 45 words in total. No lists, no markdown, no emojis, no headings, no greeting after the first turn.",
    "Explain to the farmer, in plain words, the thing they asked or told you. Speak to them directly and keep the conversation going naturally; you may ask one short follow-up question when it helps.",
    "Always answer the farmer's actual question. For anything about this farm (soil moisture, weather, machines, tasks, dates) use only the facts below and never invent numbers, dates, machines or names. For general farming questions, answer from common, safe agricultural practice.",
    "Never recommend a specific pesticide, chemical or dose, and never claim a disease is certain; say the owner can arrange a check.",
    "Write numbers as digits and say units in words (for example 'mm rain' or 'percent').",
    "",
    "Facts from the farmer's records:",
    req.facts,
  ].join("\n");
}

/** Urvara's reading of the latest message, given to the model as guidance. */
function hintNote(req: ReplyRequest): string | null {
  if (!req.hint) return null;
  return [
    `About the farmer's latest message. Urvara understood it as: ${req.hint.understood}.`,
    KIND_GOAL[req.hint.kind] ?? "",
    req.hint.draftAnswer ? `This answer is correct; say the same thing, more naturally: ${req.hint.draftAnswer}` : "",
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

async function askOllama(key: string, prompt: Prompt): Promise<Answer | null> {
  const model = process.env.OLLAMA_MODEL || "gemma4:31b";
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false, think: false, messages: prompt, options: { temperature: 0.3, num_predict: 160 } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`Ollama chat failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
      return null;
    }
    const data = (await res.json().catch(() => null)) as { message?: { content?: string } } | null;
    const text = forSpeech(data?.message?.content ?? "");
    return text ? { text, provider: "ollama", model } : null;
  } catch {
    console.error("Ollama chat did not respond");
    return null;
  }
}

/** A reply that stopped mid-sentence (Sarvam occasionally does) should not be spoken. */
const complete = (text: string) => /[।?!.)"']$/.test(text);

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
    ...req.messages.slice(0, -1),
    ...(note ? [{ role: "system", content: note }] : []),
    req.messages[req.messages.length - 1],
  ];

  const answer = (ollamaKey ? await askOllama(ollamaKey, prompt) : null) ?? (sarvamKey ? await askSarvam(sarvamKey, prompt) : null);
  if (!answer) return NextResponse.json({ error: "The AI assistant could not answer." }, { status: 502 });
  return NextResponse.json(answer);
}
