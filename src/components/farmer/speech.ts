/**
 * Browser speech adapter. Uses the Web Speech API when the browser has it and
 * reports honestly when it does not. A provider such as Sarvam AI can replace
 * this behind the same interface later.
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
