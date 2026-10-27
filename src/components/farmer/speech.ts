/**
 * Speech adapter. Prefers Sarvam AI (recorded clip, transcribed on our server)
 * when the server has a key, falls back to the browser's Web Speech API, and
 * reports honestly when neither is available.
 */
import type { Language } from "@/types";

export type SpeechErrorKind = "unsupported" | "denied" | "no-speech" | "failed";

export interface SpeechSession {
  stop: () => void;
  abort: () => void;
}

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getCtor() !== null;
}

export const speechLocale = (lang: Language) => (lang === "hi" ? "hi-IN" : "en-IN");

/**
 * Start listening. `onText` receives the running transcript (final + interim);
 * `onDone` gets the final transcript or an error kind.
 */
export function startListening(
  lang: Language,
  handlers: { onText: (text: string) => void; onDone: (result: { text: string } | { error: SpeechErrorKind }) => void },
): SpeechSession | null {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onDone({ error: "unsupported" });
    return null;
  }
  const rec = new Ctor();
  rec.lang = speechLocale(lang);
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = "";
  let interim = "";
  let error: SpeechErrorKind | null = null;
  let aborted = false;

  rec.onresult = (e) => {
    interim = "";
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const r = e.results[i];
      if (r.isFinal) finalText += `${r[0].transcript} `;
      else interim += r[0].transcript;
    }
    handlers.onText(`${finalText}${interim}`.trim());
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") error = "denied";
    else if (e.error === "no-speech") error = "no-speech";
    else if (e.error === "aborted") aborted = true;
    else error = "failed";
  };
  rec.onend = () => {
    if (aborted) return;
    const text = `${finalText}${interim}`.trim();
    if (text) handlers.onDone({ text });
    else handlers.onDone({ error: error ?? "no-speech" });
  };
  try {
    rec.start();
  } catch {
    handlers.onDone({ error: "failed" });
    return null;
  }
  return {
    stop: () => rec.stop(),
    abort: () => {
      aborted = true;
      rec.abort();
    },
  };
}

/** Which recogniser the Farmer Portal uses: Sarvam AI via our server, the browser's own, or none. */
export type SpeechEngine = "sarvam" | "browser" | "none";

/** Sarvam's REST endpoint is meant for short clips, so recording stops itself here. */
export const MAX_CLIP_SECONDS = 28;

function mediaRecorderSupported(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Prefer Sarvam when the server has a key and the browser can record; otherwise the browser recogniser. */
export async function detectSpeechEngine(): Promise<SpeechEngine> {
  const fallback: SpeechEngine = speechRecognitionSupported() ? "browser" : "none";
  if (!mediaRecorderSupported()) return fallback;
  try {
    const res = await fetch("/api/speech-to-text", { cache: "no-store" });
    const body = (await res.json()) as { available?: boolean };
    return body.available ? "sarvam" : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Record a clip and transcribe it with Sarvam AI through /api/speech-to-text.
 * There is no live transcript: `onTick` reports elapsed seconds while recording,
 * `onProcessing` fires once the clip is being uploaded (also on the auto-stop).
 */
export function startCloudListening(
  lang: Language,
  handlers: {
    onTick: (seconds: number) => void;
    onProcessing: () => void;
    onDone: (result: { text: string } | { error: SpeechErrorKind }) => void;
  },
): SpeechSession {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let aborted = false;
  let stopRequested = false;
  let ticker: ReturnType<typeof setInterval> | undefined;
  const chunks: Blob[] = [];

  const release = () => {
    clearInterval(ticker);
    stream?.getTracks().forEach((t) => t.stop());
  };
  const stop = () => {
    stopRequested = true;
    if (recorder?.state === "recording") recorder.stop();
  };

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((s) => {
      stream = s;
      if (aborted) return release();
      recorder = new MediaRecorder(s);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        release();
        if (aborted) return;
        handlers.onProcessing();
        const type = recorder?.mimeType || "audio/webm";
        void transcribe(new Blob(chunks, { type }), lang).then(handlers.onDone);
      };
      recorder.start();
      const started = Date.now();
      ticker = setInterval(() => {
        const seconds = Math.floor((Date.now() - started) / 1000);
        handlers.onTick(seconds);
        if (seconds >= MAX_CLIP_SECONDS) stop();
      }, 250);
      if (stopRequested) stop();
    })
    .catch((err: unknown) => {
      if (aborted) return;
      const name = err instanceof DOMException ? err.name : "";
      handlers.onDone({ error: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed" });
    });

  return {
    stop,
    abort: () => {
      aborted = true;
      if (recorder?.state === "recording") recorder.stop();
      release();
    },
  };
}

async function transcribe(clip: Blob, lang: Language): Promise<{ text: string } | { error: SpeechErrorKind }> {
  if (clip.size === 0) return { error: "no-speech" };
  const ext = clip.type.includes("mp4") ? "m4a" : clip.type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", clip, `speech.${ext}`);
  form.append("language", speechLocale(lang));
  try {
    const res = await fetch("/api/speech-to-text", { method: "POST", body: form });
    if (!res.ok) return { error: "failed" };
    const body = (await res.json()) as { transcript?: string };
    return body.transcript ? { text: body.transcript } : { error: "no-speech" };
  } catch {
    return { error: "failed" };
  }
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Read text aloud with a matching-language voice if the browser has one. Returns false if not possible. */
export function speak(text: string, lang: Language): boolean {
  if (!speechSynthesisSupported()) return false;
  const synth = window.speechSynthesis;
  const locale = speechLocale(lang);
  const voice = synth.getVoices().find((v) => v.lang === locale) ?? synth.getVoices().find((v) => v.lang.startsWith(lang));
  if (lang === "hi" && !voice) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale;
  if (voice) u.voice = voice;
  synth.speak(u);
  return true;
}

const READ_ALOUD_KEY = "urvara:read-aloud";

export function getReadAloud(): boolean {
  try {
    return window.localStorage.getItem(READ_ALOUD_KEY) === "1";
  } catch {
    return false;
  }
}

export function setReadAloud(on: boolean) {
  try {
    window.localStorage.setItem(READ_ALOUD_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable: setting just won't persist */
  }
}
