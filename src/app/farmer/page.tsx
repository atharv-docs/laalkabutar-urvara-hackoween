"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, CloudRain, Mic, PlayCircle, ShieldAlert } from "lucide-react";
import type { Task } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { TaskCard } from "@/components/farmer/shared";
import { Button, EmptyState } from "@/components/ui/primitives";
import { tr } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { fmtDayLocalised, istDate, ms } from "@/lib/time";
import { farmerAlerts, type Alert } from "@/services/alerts";
import { isOverdue } from "@/services/scheduler";
import { acknowledgeChange, updateTaskStatus } from "@/services/tasks";

export default function FarmerToday() {
  const { state, user, run } = useReadyState();
  const lang = user.language;
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const today = istDate(state.now);

  const mine = state.tasks
    .filter((task) => task.assigneeId === user.id && task.status !== "cancelled" && task.status !== "suggested")
    .sort((a, b) => ms(a.start) - ms(b.start));
  const todays = mine.filter((task) => istDate(task.start) === today || isOverdue(task, state.now) || task.status === "in_progress" || task.status === "blocked");
  const upcoming = mine.filter((task) => !todays.includes(task) && ms(task.start) > ms(state.now) && task.status !== "done").slice(0, 5);
  const alerts = farmerAlerts(state, user);

  const start = (task: Task) =>
    run((s) => updateTaskStatus(s, task.id, "in_progress", user.id), { success: tx(lang, "startedToast"), undoable: true });
  const finish = (task: Task) =>
    run((s) => updateTaskStatus(s, task.id, "done", user.id), { success: tx(lang, "doneToast"), undoable: true });

  function actionFor(task: Task) {
    if (task.status === "scheduled") {
      return (
        <Button size="lg" variant="secondary" icon={PlayCircle} className="w-full" onClick={() => void start(task)}>
          {t("start")}
        </Button>
      );
    }
    if (task.status === "in_progress" || task.status === "blocked") {
      return (
        <Button size="lg" icon={CheckCircle2} className="w-full" onClick={() => void finish(task)}>
          {t("markDone")}
        </Button>
      );
    }
    return undefined;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {t("greeting")}, {user.name.split(" ")[0]}
      </h1>

      <Link
        href="/farmer/report"
        className="flex items-center gap-4 rounded-panel bg-forest p-4 text-ivory shadow-raised transition-colors hover:bg-forest-hover"
      >
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-ivory text-forest">
          <Mic aria-hidden className="size-8" />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-semibold text-ivory">{t("tapToSpeak")}</span>
          <span className="mt-0.5 block text-ivory/85">{t("speakHint")}</span>
        </span>
      </Link>

      {alerts.length > 0 && (
        <section aria-label={lang === "hi" ? "सूचनाएं" : "Alerts"}>
          <ul className="space-y-2.5">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} lang={lang} onAck={(taskId) => void run((s) => acknowledgeChange(s, taskId), { success: tx(lang, "ackToast") })} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="today-h">
        <h2 id="today-h" className="mb-2.5 text-xl font-semibold">
          {t("tasksToday")}
        </h2>
        {todays.length === 0 ? (
          <EmptyState icon={CalendarClock} title={t("noTasksToday")}>
            {t("noTasksTodayHint")}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {todays.map((task) => (
              <TaskCard key={task.id} task={task} state={state} lang={lang} action={actionFor(task)} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming-h">
        <h2 id="upcoming-h" className="mb-2.5 text-xl font-semibold">
          {t("upcoming")}
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-ink">{tx(lang, "moreLater")}</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((task) => (
              <TaskCard key={task.id} task={task} state={state} lang={lang} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AlertCard({ alert, lang, onAck }: { alert: Alert; lang: "en" | "hi"; onAck: (taskId: string) => void }) {
  const isChange = alert.id.startsWith("fa-chg-");
  const isOverdueAlert = alert.id.startsWith("fa-od-");
  const taskId = alert.href.startsWith("/farmer/tasks/") ? alert.href.split("/").pop()! : "";

  if (alert.kind === "weather") {
    return (
      <li className="flex gap-3 rounded-panel border border-line bg-gold-tint/60 p-3.5">
        <CloudRain aria-hidden className="mt-0.5 size-7 shrink-0 text-gold-ink" />
        <div>
          <p className="font-semibold text-ink-strong">
            {tr(lang, "rainWarning")}: {alert.title} {tr(lang, "rainChance")} {tx(lang, "rainOn")} {fmtDayLocalised(alert.detail, lang)}
          </p>
          <p className="text-ink">{tx(lang, "rainBody")}</p>
        </div>
      </li>
    );
  }
  if (alert.kind === "risk") {
    return (
      <li className="flex gap-3 rounded-panel border border-terracotta/50 bg-terracotta-tint/60 p-3.5">
        <ShieldAlert aria-hidden className="mt-0.5 size-7 shrink-0 text-terracotta-ink" />
        <div>
          <p className="font-semibold text-ink-strong">
            {tr(lang, "riskWarning")}: {alert.title}
          </p>
          <p className="text-ink">{tr(lang, "riskWarningBody")}</p>
        </div>
      </li>
    );
  }
  return (
    <li className="rounded-panel border border-gold bg-surface p-3.5 shadow-panel">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden className="mt-0.5 size-7 shrink-0 text-gold-ink" />
        <div className="min-w-0">
          <p className="font-semibold text-ink-strong">
            {isChange ? tr(lang, "changed") : tr(lang, "overdue")}: {alert.title}
          </p>
          <p className="text-ink">{isOverdueAlert ? tx(lang, "overdueBody") : alert.detail}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {isChange && (
          <Button size="lg" onClick={() => onAck(taskId)}>
            {tr(lang, "okGotIt")}
          </Button>
        )}
        <Link
          href={alert.href}
          className="inline-flex h-12 items-center rounded-control border border-line-strong bg-surface px-5 font-semibold text-ink-strong hover:border-forest/50"
        >
          {tx(lang, "open")}
        </Link>
      </div>
    </li>
  );
}
