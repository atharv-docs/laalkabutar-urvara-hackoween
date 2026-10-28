/**
 * Text-to-speech through Sarvam AI (Bulbul). Returns MP3 audio for a short
 * reply in Hindi, Punjabi or English. SARVAM_API_KEY stays on the server.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SARVAM_URL = "https://api.sarvam.ai/text-to-speech";
const MAX_CHARS = 600;
const LANGUAGES: Record<string, string> = { hi: "hi-IN", en: "en-IN", pa: "pa-IN" };
/** The voice every install uses unless SARVAM_TTS_MODEL / SARVAM_TTS_SPEAKER override it. */
const DEFAULT_MODEL = "bulbul:v4-flash";
/** Sarvam voices are built per language (the _hi_/_en_/_pa_ in the name), so each language gets its own conversational voice. */
const DEFAULT_SPEAKER: Record<string, string> = {
  hi: "amit_hi_conversational",
  en: "dev_en_conversational",
  pa: "anand_pa_conversation",
};

export function GET() {
  return NextResponse.json({ available: Boolean(process.env.SARVAM_API_KEY) });
}

export async function POST(request: Request) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Text-to-speech is not configured on the server." }, { status: 501 });

  const body = (await request.json().catch(() => null)) as { text?: unknown; language?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const language = LANGUAGES[String(body?.language)];
  if (!text || !language) return NextResponse.json({ error: "Text and language are required." }, { status: 400 });
  if (text.length > MAX_CHARS) return NextResponse.json({ error: "Text is too long to read aloud." }, { status: 413 });

  let res: Response;
  try {
    res = await fetch(SARVAM_URL, {
      method: "POST",
      headers: { "api-subscription-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language_code: language,
        model: process.env.SARVAM_TTS_MODEL || DEFAULT_MODEL,
        speaker: process.env.SARVAM_TTS_SPEAKER || DEFAULT_SPEAKER[String(body?.language)],
        pace: 0.95,
        output_audio_codec: "mp3",
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "Speech service did not respond." }, { status: 504 });
  }
  if (!res.ok) {
    console.error(`Sarvam TTS failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
    return NextResponse.json({ error: "Speech service could not read this aloud." }, { status: 502 });
  }
  const data = (await res.json().catch(() => null)) as { audios?: string[] } | null;
  const audio = data?.audios?.[0];
  if (!audio) return NextResponse.json({ error: "Speech service returned no audio." }, { status: 502 });
  return new Response(Buffer.from(audio, "base64"), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
