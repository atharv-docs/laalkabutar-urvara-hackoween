"use client";

/**
 * The report confirmation form: what Urvara understood (type, field, symptom,
 * severity, resource), all editable, before anything is saved for the owner.
 */
import { AlertTriangle, CheckCircle2, HelpCircle, Keyboard, Mic, PackageOpen, Send, Sprout, type LucideIcon } from "lucide-react";
import type { Language, Report, ReportKind, Severity, User, UrvaraState } from "@/types";
import { Button, Chip, Label, Select, TextArea, TextInput, cx } from "@/components/ui/primitives";
import { cropLabel } from "@/data/crops";
import { tr, type I18nKey } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { parseUtterance } from "@/services/intent";
import { matchCompletionTask } from "@/services/reports";
import { TaskIcon, whenLabel } from "./shared";

export type InputMode = Report["inputMode"];

export const KIND_ICON: Record<ReportKind, LucideIcon> = {
  problem: AlertTriangle,
  completion: CheckCircle2,
  resource_request: PackageOpen,
  question: HelpCircle,
  condition: Sprout,
};

export const KINDS: ReportKind[] = ["problem", "completion", "resource_request", "question", "condition"];

export interface Details {
  kind: ReportKind;
  fieldId: string;
  symptom: string;
  severity: Severity;
  requestedResource: string;
  taskType?: ReturnType<typeof parseUtterance>["taskType"];
}

export function ModeTag({ mode, lang }: { mode: InputMode; lang: Language }) {
  const key: I18nKey = mode === "voice" ? "voiceTag" : mode === "demo_sample" ? "demoSampleTag" : "typedTag";
  return (
    <Chip tone={mode === "demo_sample" ? "gold" : mode === "voice" ? "forest" : "neutral"} icon={mode === "voice" ? Mic : mode === "typed" ? Keyboard : undefined} className="text-sm">
      {tr(lang, key)}
    </Chip>
  );
}

export function Review({
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
  submitLabel,
  onTextChange,
}: {
  state: UrvaraState;
  user: User;
  lang: Language;
  text: string;
  mode: InputMode;
  details: Details;
  onChange: (d: Details) => void;
  onEditText?: () => void;
  onSubmit: () => void;
  busy: boolean;
  submitLabel?: string;
  /** When given, the farmer's words are editable in place (used in the conversation). */
  onTextChange?: (text: string) => void;
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
        {onTextChange ? (
          <>
            <label htmlFor="r-text" className="sr-only">
              {t("editText")}
            </label>
            <TextArea id="r-text" value={text} onChange={(e) => onTextChange(e.target.value)} className="mt-2 min-h-20 text-lg" />
            <p className="mt-1 text-base text-ink-muted">{t("editText")}</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-lg text-ink-strong">“{text}”</p>
            {onEditText && (
              <button type="button" onClick={onEditText} className="mt-1 min-h-11 font-semibold text-forest underline decoration-forest/40">
                {tx(lang, "editAgain")}
              </button>
            )}
          </>
        )}
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
        {submitLabel ?? (details.kind === "question" ? t("confirmAsk") : t("confirmSend"))}
      </Button>
      {!field && <p className="text-terracotta-ink">{tx(lang, "chooseField")}</p>}
    </section>
  );
}
