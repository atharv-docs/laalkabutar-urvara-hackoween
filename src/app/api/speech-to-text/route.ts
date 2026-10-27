/**
 * Speech-to-text through Sarvam AI. The browser records a short clip and posts
 * it here; the Sarvam key stays on the server (SARVAM_API_KEY) and never
 * reaches client code. GET reports whether the provider is configured so the
 * Farmer Portal can fall back to the browser's own recognition when it is not.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SARVAM_URL = "https://api.sarvam.ai/speech-to-text";
const MAX_BYTES = 5 * 1024 * 1024;
const LANGUAGES = new Set(["hi-IN", "en-IN"]);

export function GET() {
  return NextResponse.json({ available: Boolean(process.env.SARVAM_API_KEY) });
}

export async function POST(request: Request) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Speech-to-text is not configured on the server." }, { status: 501 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const language = String(form?.get("language") ?? "");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Recording is too long. Keep it under 30 seconds." }, { status: 413 });
  if (!LANGUAGES.has(language)) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });

  // Browsers label recordings like "audio/webm;codecs=opus"; Sarvam accepts only the bare type.
  const clip = new Blob([await file.arrayBuffer()], { type: file.type.split(";")[0].trim() || "application/octet-stream" });
  const upstream = new FormData();
  upstream.append("file", clip, file instanceof File && file.name ? file.name : "speech.webm");
  upstream.append("model", process.env.SARVAM_STT_MODEL || "saaras:v3");
  upstream.append("language_code", language);

  let res: Response;
  try {
    res = await fetch(SARVAM_URL, {
      method: "POST",
      headers: { "api-subscription-key": key },
      body: upstream,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "Speech service did not respond." }, { status: 504 });
  }
  if (!res.ok) {
    console.error(`Sarvam STT failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
    return NextResponse.json({ error: "Speech service could not transcribe this clip." }, { status: 502 });
  }
  const data = (await res.json().catch(() => null)) as { transcript?: string; language_code?: string | null; request_id?: string | null } | null;
  return NextResponse.json({
    transcript: (data?.transcript ?? "").trim(),
    languageCode: data?.language_code ?? language,
    requestId: data?.request_id ?? null,
  });
}
