"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Info, MapPin, Package, PauseCircle, PlayCircle, SearchX, Tractor } from "lucide-react";
import type { TaskStatus } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { FarmerStatusChip, TaskIcon, fieldName, taskTitle, taskTypeLabel, whenLabel } from "@/components/farmer/shared";
import { Button, EmptyState, TextArea, cx } from "@/components/ui/primitives";
import { cropLabel } from "@/data/crops";
import { tr, type I18nKey } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { fmtDayLocalised, fmtTimeLocalised } from "@/lib/time";
import { BLOCKER_LABEL, BLOCKER_REASONS, acknowledgeChange, updateTaskStatus, type BlockerReason } from "@/services/tasks";

type Mode = "view" | "done" | "blocked";

export default function FarmerTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { state, user, run } = useReadyState();
  const router = useRouter();
  const lang = user.language;
  const t = (k: I18nKey) => tr(lang, k);
  const [mode, setMode] = useState<Mode>("view");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<BlockerReason | null>(null);
  const [busy, setBusy] = useState(false);

  const task = state.tasks.find((x) => x.id === taskId && x.assigneeId === user.id);
  if (!task) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={SearchX}
          title={tx(lang, "taskNotFound")}
          action={
            <Link href="/farmer" className="inline-flex min-h-12 items-center rounded-control bg-forest px-5 font-semibold text-ivory">
              {t("goHome")}
            </Link>
          }
        >
          {tx(lang, "taskNotFoundBody")}
        </EmptyState>
      </div>
    );
  }

  const field = state.fields.find((f) => f.id === task.fieldId);
  const machines = state.resources.filter((r) => task.machineIds.includes(r.id));
  const inputs = task.inputs
    .filter((i) => i.quantity > 0)
    .map((i) => ({ ...i, resource: state.resources.find((r) => r.id === i.resourceId) }))
    .filter((i) => i.resource);
  const open = task.status === "scheduled" || task.status === "in_progress" || task.status === "blocked";

  async function change(status: TaskStatus, opts: Parameters<typeof updateTaskStatus>[4], success: string) {
    setBusy(true);
    const ok = await run((s) => updateTaskStatus(s, task!.id, status, user.id, opts), { success, undoable: true });
    setBusy(false);
    if (ok) {
      setMode("view");
      setNote("");
      setReason(null);
      if (status !== "in_progress") router.push("/farmer");
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/farmer" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 font-semibold text-forest hover:bg-forest-tint/60">
        <ArrowLeft aria-hidden className="size-5" />
        {t("back")}
      </Link>

      <header className="flex items-start gap-3">
        <TaskIcon type={task.type} size="lg" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink-muted">
            {taskTypeLabel(task.type, lang)} · {cropLabel(task.crop, lang)}
          </p>
          <h1 className="text-2xl font-semibold">{taskTitle(task, lang)}</h1>
          <div className="mt-1.5">
            <FarmerStatusChip task={task} lang={lang} now={state.now} />
          </div>
        </div>
      </header>

      {task.changeNotice && (
        <section className="rounded-panel border border-gold bg-gold-tint/60 p-3.5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle aria-hidden className="size-5 text-gold-ink" />
            {t("whatChanged")}
          </h2>
          <p className="mt-1 text-ink-strong">{task.changeNotice}</p>
          <Button size="lg" className="mt-3" onClick={() => void run((s) => acknowledgeChange(s, task.id), { success: tx(lang, "ackToast") })}>
            {t("okGotIt")}
          </Button>
        </section>
      )}

      <dl className="divide-y divide-line rounded-panel border border-line bg-surface">
        <Row icon={Clock} label={t("when")}>
          <span className="tabular">{whenLabel(task, lang)}</span>
        </Row>
        <Row icon={MapPin} label={t("where")}>
          {fieldName(state, task.fieldId)}
          {field && <span className="block text-base text-ink">{state.farms.find((f) => f.id === field.farmId)?.name}</span>}
        </Row>
        <Row icon={Tractor} label={t("machine")}>
          {machines.length ? machines.map((m) => m.name).join(", ") : tx(lang, "noMachine")}
        </Row>
        <Row icon={Package} label={t("materials")}>
          {inputs.length ? (
            <ul>
              {inputs.map((i) => (
                <li key={i.resourceId}>
                  <span className="tabular font-semibold">
                    {i.quantity} {i.resource!.unit}
                  </span>{" "}
                  {i.resource!.name}
                </li>
              ))}
            </ul>
          ) : (
            tx(lang, "noMaterials")
          )}
        </Row>
        <Row icon={Info} label={t("why")}>
          {task.rationale}
        </Row>
      </dl>

      {task.status === "done" && (
        <p className="flex items-center gap-2 rounded-panel bg-sage-tint p-3.5 font-semibold text-sage-ink">
          <CheckCircle2 aria-hidden className="size-6" />
          {tx(lang, "alreadyDone")}
        </p>
      )}
      {task.status === "blocked" && mode === "view" && (
        <p className="flex items-start gap-2 rounded-panel bg-terracotta-tint p-3.5 text-ink-strong">
          <PauseCircle aria-hidden className="mt-0.5 size-6 shrink-0 text-terracotta-ink" />
          <span>
            <strong className="block">{tx(lang, "blockedNow")}</strong>
            {task.blockerReason}
          </span>
        </p>
      )}

      {open && mode === "view" && (
        <div className="grid gap-2">
          {task.status === "scheduled" ? (
            <Button size="xl" icon={PlayCircle} loading={busy} onClick={() => void change("in_progress", {}, tx(lang, "startedToast"))}>
              {t("start")}
            </Button>
          ) : (
            <Button size="xl" icon={CheckCircle2} onClick={() => setMode("done")}>
              {t("markDone")}
            </Button>
          )}
          {task.status === "scheduled" && (
            <Button size="lg" variant="secondary" icon={CheckCircle2} onClick={() => setMode("done")}>
              {t("markDone")}
            </Button>
          )}
          {task.status !== "blocked" && (
            <Button size="lg" variant="secondary" icon={PauseCircle} onClick={() => setMode("blocked")}>
              {t("cantDo")}
            </Button>
          )}
        </div>
      )}

      {mode === "done" && (
        <section className="space-y-3 rounded-panel border border-line bg-surface p-4">
          <label htmlFor="done-note" className="block text-lg font-semibold text-ink-strong">
            {tx(lang, "doneNoteTitle")}
          </label>
          <TextArea id="done-note" value={note} onChange={(e) => setNote(e.target.value)} className="text-lg" />
          <Button size="xl" className="w-full" icon={CheckCircle2} loading={busy} onClick={() => void change("done", { note: note.trim() || undefined }, tx(lang, "doneToast"))}>
            {tx(lang, "confirmDone")}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => setMode("view")}>
            {t("cancel")}
          </Button>
        </section>
      )}

      {mode === "blocked" && (
        <section className="space-y-3 rounded-panel border border-line bg-surface p-4">
          <fieldset>
            <legend className="text-lg font-semibold text-ink-strong">{t("whyBlocked")}</legend>
            <p className="text-base text-ink-muted">{tx(lang, "chooseReason")}</p>
            <div role="radiogroup" className="mt-2 grid gap-2">
              {BLOCKER_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={reason === r}
                  onClick={() => setReason(r)}
                  className={cx(
                    "flex min-h-14 items-center gap-3 rounded-control border-2 px-3 text-left text-lg font-semibold",
                    reason === r ? "border-forest bg-forest-tint text-forest" : "border-line bg-surface text-ink-strong hover:border-forest/40",
                  )}
                >
                  <span aria-hidden className={cx("grid size-5 shrink-0 place-items-center rounded-full border-2", reason === r ? "border-forest" : "border-line-strong")}>
                    {reason === r && <span className="size-2.5 rounded-full bg-forest" />}
                  </span>
                  {BLOCKER_LABEL[r][lang]}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="block-note" className="block font-semibold text-ink-strong">
            {t("addNote")}
          </label>
          <TextArea id="block-note" value={note} onChange={(e) => setNote(e.target.value)} className="text-lg" />
          <Button
            size="xl"
            className="w-full"
            disabled={!reason}
            loading={busy}
            onClick={() => reason && void change("blocked", { blocker: reason, note: note.trim() || undefined }, tx(lang, "blockedToast"))}
          >
            {tx(lang, "sendBlocker")}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => setMode("view")}>
            {t("cancel")}
          </Button>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{tx(lang, "history")}</h2>
        <ol className="space-y-2 border-l-2 border-line pl-4">
          {[...task.history].reverse().map((h, i) => (
            <li key={`${h.at}-${i}`}>
              <p className="tabular text-base text-ink-muted">
                {fmtDayLocalised(h.at, lang)}, {fmtTimeLocalised(h.at, lang)} · {h.actor === user.id ? user.name : state.users.find((u) => u.id === h.actor)?.name ?? "Urvara"}
              </p>
              <p className="text-ink-strong">{h.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 px-3.5 py-3">
      <Icon aria-hidden className="mt-1 size-5 shrink-0 text-sage-ink" />
      <div className="min-w-0">
        <dt className="text-base font-semibold text-ink-muted">{label}</dt>
        <dd className="text-ink-strong">{children}</dd>
      </div>
    </div>
  );
}
