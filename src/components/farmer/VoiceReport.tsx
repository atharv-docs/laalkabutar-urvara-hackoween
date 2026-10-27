"use client";

/**
 * Voice journey: ready → recording → processing → transcript → review →
 * sent (or answered). The farmer always sees and can correct what was heard
 * before anything is saved, and their words survive any failure.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  LoaderCircle,
  Mic,
  MicOff,
  PackageOpen,
  RotateCcw,
  Send,
  Sprout,
  Square,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Language, Report, ReportKind, Severity, User, UrvaraState } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Provenance } from "@/components/ui/domain";
import { Button, Chip, Label, Select, TextArea, TextInput, cx } from "@/components/ui/primitives";
import { cropLabel } from "@/data/crops";
import { tr, type I18nKey } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { parseUtterance } from "@/services/intent";
import { answerQuestion, type AssistantAnswer } from "@/services/assistant";
import { matchCompletionTask, submitReport } from "@/services/reports";
import { TaskIcon, whenLabel } from "./shared";
import { getReadAloud, speak, speechRecognitionSupported, speechSynthesisSupported, startListening, type SpeechErrorKind, type SpeechSession } from "./speech";

type Phase = "ready" | "recording" | "processing" | "transcript" | "review" | "sent" | "answered";
type InputMode = Report["inputMode"];

const DRAFT_KEY = "urvara:farmer-draft";

const SAMPLES: Record<Language, string[]> = {
  en: [
    "My tomato leaves have yellow spots.",
    "I finished irrigation in Field 2.",
    "We need another sprayer tomorrow.",
    "When will the tractor reach my farm?",
    "Should we irrigate today?",
  ],
  hi: [
    "टमाटर की पत्तियों पर पीले धब्बे हैं",
    "खेत 2 में सिंचाई पूरी हो गई",
    "कल एक और स्प्रेयर चाहिए",
    "ट्रैक्टर मेरे खेत पर कब आएगा?",
    "क्या आज सिंचाई करनी चाहिए?",
  ],
};

const KIND_ICON: Record<ReportKind, LucideIcon> = {
  problem: AlertTriangle,
  completion: CheckCircle2,
  resource_request: PackageOpen,
  question: HelpCircle,
  condition: Sprout,
};

const KINDS: ReportKind[] = ["problem", "completion", "resource_request", "question", "condition"];

interface Details {
  kind: ReportKind;
  fieldId: string;
  symptom: string;
  severity: Severity;
  requestedResource: string;
  taskType?: ReturnType<typeof parseUtterance>["taskType"];
}

function loadDraft(): { text: string; mode: InputMode } | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as { text: string; mode: InputMode }) : null;
  } catch {
    return null;
  }
}

function saveDraft(text: string, mode: InputMode) {
  try {
    if (text) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ text, mode }));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable; the draft still lives in component state */
  }
}

function ModeTag({ mode, lang }: { mode: InputMode; lang: Language }) {
  const key: I18nKey = mode === "voice" ? "voiceTag" : mode === "demo_sample" ? "demoSampleTag" : "typedTag";
  return (
    <Chip tone={mode === "demo_sample" ? "gold" : mode === "voice" ? "forest" : "neutral"} icon={mode === "voice" ? Mic : mode === "typed" ? Keyboard : undefined} className="text-sm">
      {tr(lang, key)}
    </Chip>
  );
}

export function VoiceReport() {
  const { state, user, run } = useReadyState();
  const lang = user.language;
  const t = (k: I18nKey) => tr(lang, k);
  const myFields = state.fields.filter((f) => user.fieldIds.includes(f.id));

  const [phase, setPhase] = useState<Phase>(() => (loadDraft()?.text ? "transcript" : "ready"));
  const [text, setText] = useState(() => loadDraft()?.text ?? "");
  const [mode, setMode] = useState<InputMode>(() => loadDraft()?.mode ?? "typed");
  const [error, setError] = useState<SpeechErrorKind | "empty" | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [sentKind, setSentKind] = useState<ReportKind | null>(null);
  const [busy, setBusy] = useState(false);
  // Rendered only client-side (behind PortalGate), so feature detection can run in the initializer.
  const [supported] = useState(speechRecognitionSupported);
  const session = useRef<SpeechSession | null>(null);

  useEffect(() => () => session.current?.abort(), []);

  useEffect(() => {
    if (phase === "transcript" || phase === "review" || phase === "recording" || phase === "ready") saveDraft(text, mode);
  }, [text, mode, phase]);

  function beginRecording() {
    setError(null);
    setText("");
    setPhase("recording");
    session.current = startListening(lang, {
      onText: (live) => setText(live),
      onDone: (result) => {
        session.current = null;
        if ("text" in result) {
          setText(result.text);
          setMode("voice");
          setPhase("transcript");
        } else {
          setError(result.error);
          setPhase("ready");
        }
      },
    });
  }

  function stopRecording() {
    setPhase("processing");
    session.current?.stop();
  }

  function cancelRecording() {
    session.current?.abort();
    session.current = null;
    setText("");
    setPhase("ready");
  }

  function useSample(sample: string) {
    setError(null);
    setText(sample);
    setMode("demo_sample");
    setPhase("transcript");
  }

  function typeInstead() {
    setError(null);
    setMode("typed");
    setPhase("transcript");
  }

  function understand() {
    if (!text.trim()) {
      setError("empty");
      return;
    }
    setError(null);
    const parsed = parseUtterance(text, myFields);
    setDetails({
      kind: parsed.kind,
      fieldId: parsed.fieldId ?? myFields[0]?.id ?? "",
      symptom: parsed.symptom ?? "",
      severity: parsed.severity,
      requestedResource: parsed.requestedResource ?? "",
      taskType: parsed.taskType,
    });
    setPhase("review");
  }

  function startOver() {
    setText("");
    setDetails(null);
    setAnswer(null);
    setSentKind(null);
    setError(null);
    saveDraft("", "typed");
    setPhase("ready");
  }

  async function submit() {
    if (!details) return;
    const field = myFields.find((f) => f.id === details.fieldId);
    if (!field) return;
    setBusy(true);
    let answerText: string | undefined;
    if (details.kind === "question") {
      const parsed = parseUtterance(text, myFields);
      const result = answerQuestion(state, user, { ...parsed, fieldId: field.id, requestedResource: details.requestedResource || parsed.requestedResource }, lang);
      setAnswer(result);
      answerText = result.text;
    }
    const completion = details.kind === "completion" ? matchCompletionTask(state, user.id, field.id, details.taskType) : undefined;
    const ok = await run(
      (s) =>
        submitReport(
          s,
          {
            kind: details.kind,
            inputMode: mode,
            fieldId: field.id,
            crop: field.crop,
            transcript: text,
            symptom: details.kind === "problem" ? details.symptom || undefined : undefined,
            severity: details.kind === "problem" ? details.severity : "low",
            requestedResource: details.kind === "resource_request" ? details.requestedResource || undefined : undefined,
            taskType: details.taskType,
            language: lang,
            answer: answerText,
            completesTaskId: completion?.id,
          },
          user.id,
        ).state,
    );
    setBusy(false);
    if (!ok) return; // run() already showed the error; text and details are kept for retry
    saveDraft("", "typed");
    setSentKind(details.kind);
    if (details.kind === "question") {
      setPhase("answered");
      if (answerText && getReadAloud()) speak(answerText, lang);
    } else setPhase("sent");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {phase !== "ready" && phase !== "recording" && phase !== "processing" && (
          <button type="button" onClick={() => (phase === "review" ? setPhase("transcript") : startOver())} className="grid size-11 place-items-center rounded-control text-ink-strong hover:bg-sunken" aria-label={t("back")}>
            <ArrowLeft className="size-6" />
          </button>
        )}
        <h1 className="text-2xl font-semibold">{tx(lang, "readyTitle")}</h1>
      </div>

      {myFields.length === 0 && <p className="rounded-panel bg-terracotta-tint p-3 text-ink-strong">{tx(lang, "noFieldsAssigned")}</p>}

      {(phase === "ready" || phase === "recording" || phase === "processing") && (
        <Recorder
          phase={phase}
          lang={lang}
          supported={supported}
          error={error}
          liveText={text}
          onStart={beginRecording}
          onStop={stopRecording}
          onCancel={cancelRecording}
          onType={typeInstead}
          onSample={useSample}
        />
      )}

      {phase === "transcript" && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{mode === "typed" ? t("typeHere") : t("checkTranscript")}</h2>
            <ModeTag mode={mode} lang={lang} />
          </div>
          <label htmlFor="transcript" className="sr-only">
            {t("typeHere")}
          </label>
          <TextArea
            id="transcript"
            value={text}
            autoFocus={mode === "typed"}
            onChange={(e) => {
              setText(e.target.value);
              if (error === "empty") setError(null);
            }}
            placeholder={t("typeHere")}
            className="min-h-32 text-lg"
            aria-invalid={error === "empty"}
            aria-describedby="transcript-hint"
          />
          <p id="transcript-hint" className={cx("text-base", error === "empty" ? "font-semibold text-terracotta-ink" : "text-ink-muted")}>
            {error === "empty" ? tx(lang, "textEmpty") : t("editText")}
          </p>
          <Button size="xl" className="w-full" onClick={understand} icon={CheckCircle2}>
            {tx(lang, "next")}
          </Button>
          {supported && (
            <Button size="lg" variant="secondary" className="w-full" icon={RotateCcw} onClick={beginRecording}>
              {t("tryAgain")}
            </Button>
          )}
        </section>
      )}

      {phase === "review" && details && (
        <Review
          state={state}
          user={user}
          lang={lang}
          text={text}
          mode={mode}
          details={details}
          onChange={setDetails}
          onEditText={() => setPhase("transcript")}
          onSubmit={() => void submit()}
          busy={busy}
        />
      )}

      {phase === "sent" && sentKind && (
        <section className="rounded-panel border border-sage bg-sage-tint/60 p-5 text-center">
          <CheckCircle2 aria-hidden className="mx-auto size-14 text-sage-ink" />
          <h2 className="mt-2 text-2xl font-semibold">{t("sent")}</h2>
          <p className="mt-1 text-ink-strong">{sentKind === "problem" ? t("sentProblem") : sentKind === "completion" ? t("sentDone") : t("sentOther")}</p>
          <div className="mt-5 grid gap-2">
            <Link href="/farmer" className="inline-flex min-h-14 items-center justify-center rounded-control bg-forest px-5 text-lg font-semibold text-ivory hover:bg-forest-hover">
              {t("goHome")}
            </Link>
            <Button size="lg" variant="secondary" icon={Mic} onClick={startOver}>
              {t("speakAnother")}
            </Button>
          </div>
        </section>
      )}

      {phase === "answered" && answer && <Answer answer={answer} lang={lang} now={state.now} onAgain={startOver} />}
    </div>
  );
}

function Recorder({
  phase,
  lang,
  supported,
  error,
  liveText,
  onStart,
  onStop,
  onCancel,
  onType,
  onSample,
}: {
  phase: Phase;
  lang: Language;
  supported: boolean;
  error: SpeechErrorKind | "empty" | null;
  liveText: string;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onType: () => void;
  onSample: (s: string) => void;
}) {
  const t = (k: I18nKey) => tr(lang, k);
  const recording = phase === "recording";
  const processing = phase === "processing";
  const errorText =
    error === "denied" ? t("voiceDenied") : error === "no-speech" ? tx(lang, "noSpeechHeard") : error === "failed" ? t("voiceFailed") : error === "unsupported" ? t("voiceUnavailable") : null;

  return (
    <section className="space-y-5">
      <div className="flex flex-col items-center rounded-panel border border-line bg-surface px-4 py-6 text-center shadow-panel">
        {supported ? (
          <>
            <button
              type="button"
              onClick={recording ? onStop : onStart}
              disabled={processing}
              aria-pressed={recording}
              aria-label={recording ? t("stop") : t("tapToSpeak")}
              className={cx(
                "grid size-32 place-items-center rounded-full text-ivory transition-colors disabled:opacity-70",
                recording ? "animate-record bg-terracotta-ink" : "bg-forest hover:bg-forest-hover",
              )}
            >
              {processing ? <LoaderCircle aria-hidden className="size-14 animate-spin" /> : recording ? <Square aria-hidden className="size-12 fill-current" /> : <Mic aria-hidden className="size-16" />}
            </button>
            <p className="mt-4 text-xl font-semibold text-ink-strong" aria-live="polite">
              {processing ? t("processing") : recording ? t("listening") : t("tapToSpeak")}
            </p>
            {!recording && !processing && <p className="mt-1 text-ink">{t("speakHint")}</p>}
            {(recording || processing) && (
              <>
                <p className="mt-3 min-h-14 w-full rounded-control bg-sunken px-3 py-2 text-left text-lg text-ink-strong" aria-live="polite">
                  {liveText || "…"}
                </p>
                {recording && (
                  <div className="mt-4 grid w-full grid-cols-2 gap-2">
                    <Button size="lg" icon={Square} onClick={onStop}>
                      {t("stop")}
                    </Button>
                    <Button size="lg" variant="secondary" icon={X} onClick={onCancel}>
                      {t("cancel")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <MicOff aria-hidden className="size-12 text-ink-muted" />
            <p className="mt-3 text-lg text-ink-strong">{t("voiceUnavailable")}</p>
          </>
        )}
      </div>

      {errorText && supported && (
        <p role="alert" className="flex gap-2 rounded-panel bg-terracotta-tint p-3 text-ink-strong">
          <AlertTriangle aria-hidden className="mt-1 size-5 shrink-0 text-terracotta-ink" />
          {errorText}
        </p>
      )}

      {!recording && !processing && (
        <>
          <Button size="lg" variant={supported ? "secondary" : "primary"} icon={Keyboard} className="w-full" onClick={onType}>
            {t("typeInstead")}
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{t("samples")}</h2>
            <p className="text-base text-ink-muted">{t("samplesHint")}</p>
            <ul className="mt-2 space-y-2">
              {SAMPLES[lang].map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onSample(s)}
                    className="flex min-h-12 w-full items-center gap-2 rounded-control border border-dashed border-line-strong bg-canvas px-3 py-2 text-left text-ink-strong hover:border-forest/60 hover:bg-forest-tint/50"
                  >
                    <Chip tone="gold" className="shrink-0">
                      {lang === "hi" ? "डेमो" : "Demo"}
                    </Chip>
                    <span>“{s}”</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function Review({
  state,
  user,
  lang,
  text,
  mode,
  details,
  onChange,
  onEditText,
  onSubmit,
  busy,
}: {
  state: UrvaraState;
  user: User;
  lang: Language;
  text: string;
  mode: InputMode;
  details: Details;
  onChange: (d: Details) => void;
  onEditText: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const t = (k: I18nKey) => tr(lang, k);
  const myFields = state.fields.filter((f) => user.fieldIds.includes(f.id));
  const field = myFields.find((f) => f.id === details.fieldId);
  const set = (patch: Partial<Details>) => onChange({ ...details, ...patch });
  const matched = details.kind === "completion" && field ? matchCompletionTask(state, user.id, field.id, details.taskType) : undefined;
  const severities: Severity[] = ["low", "medium", "high"];

  return (
    <section className="space-y-5">
      <div className="rounded-panel border border-line bg-surface p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-semibold text-ink-muted">{tx(lang, "reportSummaryTitle")}</p>
          <ModeTag mode={mode} lang={lang} />
        </div>
        <p className="mt-1 text-lg text-ink-strong">“{text}”</p>
        <button type="button" onClick={onEditText} className="mt-1 min-h-11 font-semibold text-forest underline decoration-forest/40">
          {tx(lang, "editAgain")}
        </button>
      </div>

      <h2 className="text-xl font-semibold">{t("understood")}</h2>

      <fieldset>
        <legend className="mb-2 font-semibold text-ink-strong">{tx(lang, "kind")}</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => {
            const Icon = KIND_ICON[k];
            const selected = details.kind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set({ kind: k })}
                className={cx(
                  "flex min-h-14 items-center gap-2 rounded-control border-2 px-3 py-2 text-left font-semibold",
                  selected ? "border-forest bg-forest-tint text-forest" : "border-line bg-surface text-ink-strong hover:border-forest/40",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                {t(`kind_${k}` as I18nKey)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="r-field">{t("field")}</Label>
        <Select id="r-field" value={details.fieldId} onChange={(e) => set({ fieldId: e.target.value })} className="h-12 text-lg">
          {myFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {cropLabel(f.crop, lang)}
            </option>
          ))}
        </Select>
        {field && (
          <p className="mt-1 text-base text-ink">
            {t("crop")}: <strong className="text-ink-strong">{cropLabel(field.crop, lang)}</strong>
          </p>
        )}
      </div>

      {details.kind === "problem" && (
        <>
          <div>
            <Label htmlFor="r-symptom">{t("problem")}</Label>
            <TextInput id="r-symptom" value={details.symptom} placeholder={tx(lang, "symptomPlaceholder")} onChange={(e) => set({ symptom: e.target.value })} className="h-12 text-lg" />
          </div>
          <fieldset>
            <legend className="mb-2 font-semibold text-ink-strong">{t("howBad")}</legend>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
              {severities.map((s) => {
                const selected = details.severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set({ severity: s })}
                    className={cx(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-control border-2 px-2 font-semibold",
                      selected
                        ? s === "high"
                          ? "border-terracotta-ink bg-terracotta-tint text-terracotta-ink"
                          : s === "medium"
                            ? "border-gold-ink bg-gold-tint text-gold-ink"
                            : "border-sage-ink bg-sage-tint text-sage-ink"
                        : "border-line bg-surface text-ink-strong",
                    )}
                  >
                    <span className="flex gap-0.5" aria-hidden>
                      {severities.map((_, i) => (
                        <span key={i} className={cx("h-3 w-2 rounded-sm", i <= severities.indexOf(s) ? "bg-current" : "bg-line")} />
                      ))}
                    </span>
                    {t(`sev_${s}` as I18nKey)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}

      {details.kind === "resource_request" && (
        <div>
          <Label htmlFor="r-res">{t("needs")}</Label>
          <TextInput id="r-res" value={details.requestedResource} placeholder={tx(lang, "resourcePlaceholder")} onChange={(e) => set({ requestedResource: e.target.value })} className="h-12 text-lg" />
        </div>
      )}

      {details.kind === "completion" && (
        <div className="rounded-panel border border-line bg-surface p-3.5">
          {matched ? (
            <div className="flex items-start gap-3">
              <TaskIcon type={matched.type} />
              <div>
                <p className="font-semibold text-sage-ink">{t("willMarkDone")}</p>
                <p className="text-lg font-semibold text-ink-strong">{matched.title}</p>
                <p className="tabular text-ink">{whenLabel(matched, lang)}</p>
              </div>
            </div>
          ) : (
            <p className="text-ink">{t("noMatchingTask")}</p>
          )}
        </div>
      )}

      <Button size="xl" className="w-full" loading={busy} disabled={!field} icon={details.kind === "question" ? HelpCircle : Send} onClick={onSubmit}>
        {details.kind === "question" ? t("confirmAsk") : t("confirmSend")}
      </Button>
      {!field && <p className="text-terracotta-ink">{tx(lang, "chooseField")}</p>}
    </section>
  );
}

function Answer({ answer, lang, now, onAgain }: { answer: AssistantAnswer; lang: Language; now: string; onAgain: () => void }) {
  const t = (k: I18nKey) => tr(lang, k);
  const [canSpeak] = useState(speechSynthesisSupported);
  const [speakFailed, setSpeakFailed] = useState(false);
  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-line bg-surface p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{t("answer")}</h2>
          {answer.forwarded && (
            <Chip tone="gold" icon={Send} className="text-sm">
              {tx(lang, "forwarded")}
            </Chip>
          )}
        </div>
        <p className="mt-2 text-xl leading-relaxed text-ink-strong">{answer.text}</p>
        {canSpeak && (
          <Button
            size="lg"
            variant="secondary"
            icon={Volume2}
            className="mt-3"
            onClick={() => setSpeakFailed(!speak(answer.text, lang))}
          >
            {t("listen")}
          </Button>
        )}
        {speakFailed && <p className="mt-1 text-base text-ink-muted">{tx(lang, "speechNotSupportedListen")}</p>}
        {answer.sources.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-base font-semibold text-ink-muted">{t("basedOn")}</p>
            <ul className="mt-1.5 space-y-1.5">
              {answer.sources.map((s) => (
                <li key={s.label} className="flex flex-wrap items-center gap-2 text-base text-ink">
                  <span>{s.label}</span>
                  <Provenance source={s.provenance} at={s.at} now={now} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-base text-ink-muted">{tx(lang, "questionSaved")}</p>
      <div className="grid gap-2">
        <Button size="xl" icon={Mic} onClick={onAgain}>
          {t("speakAnother")}
        </Button>
        <Link href="/farmer" className="inline-flex min-h-12 items-center justify-center rounded-control border border-line-strong bg-surface px-5 font-semibold text-ink-strong">
          {t("goHome")}
        </Link>
      </div>
    </section>
  );
}
