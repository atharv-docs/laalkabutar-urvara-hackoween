"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  CloudRain,
  CloudSun,
  Droplet,
  ListChecks,
  MessageCircleQuestion,
  Mic,
  PlayCircle,
  ShieldAlert,
  Sprout,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Language, Task, UrvaraState, User } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { TaskCard } from "@/components/farmer/shared";
import { Button, EmptyState, cx } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/domain";
import { cropLabel } from "@/data/crops";
import { tr } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { fmtDayLocalised, fmtLongDateLocalised, istDate, ms } from "@/lib/time";
import { farmerAlerts, type Alert } from "@/services/alerts";
import { isOverdue, weatherFor } from "@/services/scheduler";
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
  const allAlerts = farmerAlerts(state, user);
  const riskAlerts = allAlerts.filter((a) => a.kind === "risk");
  const alerts = allAlerts.filter((a) => a.kind !== "risk");

  const start = (task: Task) =>
    run((s) => updateTaskStatus(s, task.id, "in_progress", user.id), { success: tx(lang, "startedToast"), undoable: true });
  const finish = (task: Task) =>
    run((s) => updateTaskStatus(s, task.id, "done", user.id), { success: tx(lang, "doneToast"), undoable: true });

  function actionFor(task: Task) {
    if (task.status === "scheduled") {
      return (
        <Button size="lg" variant="secondary" icon={PlayCircle} className="w-full sm:w-auto sm:min-w-48" onClick={() => void start(task)}>
          {t("start")}
        </Button>
      );
    }
    if (task.status === "in_progress" || task.status === "blocked") {
      return (
        <Button size="lg" icon={CheckCircle2} className="w-full sm:w-auto sm:min-w-48" onClick={() => void finish(task)}>
          {t("markDone")}
        </Button>
      );
    }
    return undefined;
  }

  const inProgress = mine.filter((task) => task.status === "in_progress").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-8">
        <header className="relative overflow-hidden rounded-panel border border-forest/15 bg-forest-tint/60 p-5 sm:p-6">
          <svg aria-hidden viewBox="0 0 400 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-forest opacity-[0.06]">
            <path d="M0 160 C100 120 220 110 400 80 L400 160 Z" fill="currentColor" />
            <path d="M0 160 C140 140 260 130 400 115 L400 160 Z" fill="currentColor" />
          </svg>
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[1.875rem] font-semibold leading-tight tracking-[-0.01em] text-ink-strong sm:text-[2.25rem]">
                {t("greeting")}, {user.name.split(" ")[0]}
                <Sprout aria-hidden className="size-7 text-sage-ink sm:size-8" />
              </h1>
              <p className="mt-1 text-ink">{fmtLongDateLocalised(state.now, lang)}</p>
            </div>
            <WeatherGlance state={state} user={user} lang={lang} />
          </div>
          <ul className="relative mt-5 grid grid-cols-3 gap-2.5" aria-label={lang === "hi" ? "काम का सार" : "Work summary"}>
            <SummaryTile icon={CalendarClock} value={todays.length} label={tr(lang, "tasksToday")} strong />
            <SummaryTile icon={ListChecks} value={inProgress} label={tx(lang, "inProgressN")} />
            <SummaryTile icon={Clock3} value={upcoming.length} label={tx(lang, "upcomingN")} />
          </ul>
        </header>

        {allAlerts.length > 0 && (
          <section aria-label={lang === "hi" ? "सूचनाएं" : "Alerts"}>
            <ul className="space-y-3">
              {riskAlerts.length > 0 && <RiskAlerts alerts={riskAlerts} lang={lang} />}
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} lang={lang} onAck={(taskId) => void run((s) => acknowledgeChange(s, taskId), { success: tx(lang, "ackToast") })} />
              ))}
            </ul>
          </section>
        )}

        <TodayPanel lang={lang} count={todays.length}>
          {todays.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState icon={CalendarClock} title={t("noTasksToday")}>
                {t("noTasksTodayHint")}
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {todays.map((task) => (
                <TaskCard key={task.id} task={task} state={state} lang={lang} action={actionFor(task)} grouped featured />
              ))}
            </ul>
          )}
        </TodayPanel>

        <SpeakHero lang={lang} />

        <section aria-labelledby="upcoming-h">
          <SectionHeading id="upcoming-h" title={t("upcoming")} sub={tx(lang, "upcomingSub")} />
          {upcoming.length === 0 ? (
            <p className="text-ink">{tx(lang, "moreLater")}</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
              {upcoming.map((task) => (
                <TaskCard key={task.id} task={task} state={state} lang={lang} grouped />
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-6 lg:pt-1" aria-label={lang === "hi" ? "मौसम और खेत" : "Weather and fields"}>
        <WeatherCard state={state} user={user} lang={lang} />
        <FieldsCard state={state} user={user} lang={lang} />
        <QuickActions lang={lang} />
      </aside>
    </div>
  );
}

function SummaryTile({ icon: Icon, value, label, strong }: { icon: LucideIcon; value: number; label: string; strong?: boolean }) {
  return (
    <li className={cx("flex min-w-0 flex-col rounded-panel px-3 py-3 sm:px-4", strong ? "bg-forest text-ivory shadow-panel" : "bg-surface/90 text-ink-strong ring-1 ring-line")}>
      <Icon aria-hidden className={cx("size-5", strong ? "text-sage" : "text-ink-muted")} />
      <span className={cx("tabular mt-2 text-[1.75rem] font-semibold leading-none", strong ? "text-ivory" : "text-ink-strong")}>{value}</span>
      <span className={cx("mt-1 text-sm leading-snug", strong ? "text-ivory/85" : "text-ink")}>{label}</span>
    </li>
  );
}

/** Today's work is the page's main subject: a raised panel with its own header band. */
function TodayPanel({ lang, count, children }: { lang: Language; count: number; children: ReactNode }) {
  return (
    <section aria-labelledby="today-h" className="overflow-hidden rounded-panel border border-forest/25 bg-surface shadow-raised">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-forest/15 bg-forest-tint/70 px-5 py-4 sm:px-6 sm:py-5">
        <div>
          <h2 id="today-h" className="text-[1.625rem] font-semibold leading-tight tracking-[-0.01em] text-forest sm:text-[1.875rem]">
            {tr(lang, "tasksToday")}
          </h2>
          <p className="mt-0.5 text-ink">{tx(lang, "todaySub")}</p>
        </div>
        <p className="flex items-baseline gap-2 text-ink">
          <span className="tabular text-[1.875rem] font-semibold leading-none text-forest">{count}</span>
          <span>{lang === "hi" ? "काम" : count === 1 ? "task" : "tasks"}</span>
        </p>
      </div>
      {children}
    </section>
  );
}

function SectionHeading({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-[1.375rem] font-semibold leading-tight text-ink-strong">
        {title}
      </h2>
      <p className="mt-0.5 text-ink">{sub}</p>
    </div>
  );
}

/** The voice entry point. It stays the largest, first action on every screen size. */
function SpeakHero({ lang }: { lang: Language }) {
  return (
    <Link
      href="/farmer/report"
      className="group relative flex flex-col gap-4 overflow-hidden rounded-panel bg-forest p-5 text-ivory shadow-raised transition-colors hover:bg-forest-hover sm:flex-row sm:items-center sm:gap-6 sm:p-6"
    >
      <svg aria-hidden viewBox="0 0 400 140" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 right-0 h-full w-2/3">
        <g fill="none" stroke="#8faf8a" strokeWidth={1.25} opacity={0.3}>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M 0 ${140 - i * 3} C 120 ${130 - i * 6}, 240 ${110 - i * 9}, 400 ${60 - i * 7}`} />
          ))}
        </g>
      </svg>
      <span className="relative flex items-center gap-4 sm:contents">
        <span className="grid size-[4.5rem] shrink-0 place-items-center rounded-full bg-ivory/10 ring-1 ring-ivory/15 sm:size-24">
          <span className="grid size-14 place-items-center rounded-full bg-ivory text-forest sm:size-[4.25rem]">
            <Mic aria-hidden className="size-7 sm:size-8" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-semibold text-ivory sm:text-[1.5rem]">{tr(lang, "tapToSpeak")}</span>
          <span className="mt-1 block max-w-md text-ivory/85">{tr(lang, "speakHint")}</span>
        </span>
      </span>
      <span className="relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-control bg-ivory px-5 font-semibold text-forest transition-colors group-hover:bg-surface">
        <Mic aria-hidden className="size-5" />
        {tx(lang, "startSpeaking")}
      </span>
    </Link>
  );
}

function Rail({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-strong">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function weatherOutlook(state: UrvaraState, user: User, lang: Language) {
  const w = user.farmIds.map((id) => weatherFor(state, id)).find(Boolean);
  if (!w) return null;
  const now = ms(state.now);
  const next = w.blocks.filter((b) => ms(b.end) > now && ms(b.start) < now + 24 * 3_600_000);
  const peak = Math.max(0, ...next.map((b) => b.rainProb));
  const wet = next.find((b) => b.rainProb >= 30);
  const level = peak >= 60 ? ("rainHigh" as const) : peak >= 30 ? ("rainMedium" as const) : ("rainLow" as const);
  const hoursUntil = wet ? Math.max(0, Math.round((ms(wet.start) - now) / 3_600_000)) : null;
  const summary =
    hoursUntil === null
      ? tx(lang, "noRainToday")
      : lang === "hi"
        ? hoursUntil === 0
          ? `अभी बारिश की ${wet!.rainProb}% संभावना`
          : `${hoursUntil} घंटे में बारिश की ${wet!.rainProb}% संभावना`
        : hoursUntil === 0
          ? `${wet!.rainProb}% chance of rain now`
          : `${wet!.rainProb}% chance of rain in ${hoursUntil} hours`;
  return { w, summary, level, Icon: wet ? CloudRain : CloudSun };
}

/** On phones the weather card sits far down the page, so the greeting carries a glance of it. */
function WeatherGlance({ state, user, lang }: { state: UrvaraState; user: User; lang: Language }) {
  const o = weatherOutlook(state, user, lang);
  if (!o) return null;
  return (
    <p className="flex shrink-0 flex-col items-center rounded-panel bg-surface/90 px-3 py-2 text-center ring-1 ring-line lg:hidden" title={o.summary}>
      <o.Icon aria-hidden className="size-7 text-forest" strokeWidth={1.75} />
      <span className="tabular mt-0.5 text-lg font-semibold leading-tight text-ink-strong">{Math.round(o.w.local.tempC)}°C</span>
      <span className="text-xs text-ink-muted">{lang === "hi" ? `बारिश ${tx(lang, o.level)}` : `Rain ${tx(lang, o.level).toLowerCase()}`}</span>
    </p>
  );
}

function WeatherCard({ state, user, lang }: { state: UrvaraState; user: User; lang: Language }) {
  const o = weatherOutlook(state, user, lang);
  if (!o) return null;
  const { w, summary, level, Icon } = o;
  return (
    <Rail title={tx(lang, "weatherToday")} action={<Provenance source={w.source} at={w.issuedAt} now={state.now} />}>
      <div className="flex items-center gap-4">
        <Icon aria-hidden className="size-12 shrink-0 text-forest" strokeWidth={1.5} />
        <div>
          <p className="tabular text-[2rem] font-semibold leading-none text-ink-strong">{Math.round(w.local.tempC)}°C</p>
          <p className="mt-1.5 text-[0.9375rem] text-ink">{summary}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 divide-x divide-line border-t border-line pt-4 text-[0.9375rem]">
        <WeatherStat icon={Droplet} label={tx(lang, "humidity")} value={`${Math.round(w.local.humidity)}%`} />
        <WeatherStat icon={Wind} label={tx(lang, "wind")} value={`${Math.round(w.local.windKmh)} km/h`} />
        <WeatherStat icon={CloudRain} label={tx(lang, "rainRisk")} value={tx(lang, level)} />
      </dl>
      <p className="mt-3 text-xs text-ink-muted">{w.zoneLabel}</p>
    </Rail>
  );
}

function WeatherStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 px-2 first:pl-0 last:pr-0">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <dd className="tabular font-semibold leading-tight text-ink-strong">{value}</dd>
        <dt className="text-xs text-ink-muted">{label}</dt>
      </div>
    </div>
  );
}

function FieldsCard({ state, user, lang }: { state: UrvaraState; user: User; lang: Language }) {
  const fields = state.fields.filter((f) => user.fieldIds.includes(f.id));
  if (fields.length === 0) return null;
  const openWork = (fieldId: string) =>
    state.tasks.filter((t) => t.fieldId === fieldId && t.assigneeId === user.id && (t.status === "scheduled" || t.status === "in_progress" || t.status === "blocked")).length;
  return (
    <Rail
      title={tx(lang, "yourFields")}
      action={
        <Link href="/farmer/fields" className="inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-forest underline-offset-4 hover:underline">
          {tx(lang, "viewAll")}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      }
    >
      <ul className="divide-y divide-line overflow-hidden rounded-control border border-line">
        {fields.map((f) => {
          const n = openWork(f.id);
          return (
            <li key={f.id}>
              <Link href="/farmer/fields" className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-canvas/70">
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-sage-tint text-sage-ink">
                  <Sprout aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-snug text-ink-strong">{f.name}</span>
                  <span className="block text-sm text-ink">{cropLabel(f.crop, lang)}</span>
                </span>
                <span className="tabular shrink-0 text-sm text-ink-muted">
                  {n === 0 ? tx(lang, "noOpenWork") : lang === "hi" ? `${n} काम` : `${n} ${n === 1 ? "task" : "tasks"}`}
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Rail>
  );
}

function QuickActions({ lang }: { lang: Language }) {
  const items: { href: string; icon: LucideIcon; title: string; sub: string }[] = [
    { href: "/farmer/report", icon: Mic, title: tx(lang, "reportProblem"), sub: tx(lang, "reportProblemSub") },
    { href: "/farmer/report", icon: MessageCircleQuestion, title: tx(lang, "askQuestion"), sub: tx(lang, "askQuestionSub") },
    { href: "/farmer/record", icon: ClipboardList, title: tx(lang, "viewRecord"), sub: tx(lang, "viewRecordSub") },
  ];
  return (
    <Rail title={tx(lang, "quickActions")}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.title}>
            <Link href={item.href} className="flex items-center gap-3 rounded-control border border-line px-3 py-3 transition-colors hover:border-forest/40 hover:bg-canvas/70">
              <span className={cx("grid size-10 shrink-0 place-items-center rounded-control", item.icon === Mic ? "bg-forest text-ivory" : "bg-forest-tint text-forest")}>
                <item.icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug text-ink-strong">{item.title}</span>
                <span className="block text-sm leading-snug text-ink">{item.sub}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Rail>
  );
}

/** Nearby disease alerts share one message, so they are one card listing each field. */
function RiskAlerts({ alerts, lang }: { alerts: Alert[]; lang: Language }) {
  return (
    <li className="rounded-panel border border-terracotta/50 bg-terracotta-tint/60 p-4">
      <div className="flex gap-3">
        <ShieldAlert aria-hidden className="mt-0.5 size-7 shrink-0 text-terracotta-ink" />
        <div className="min-w-0">
          <p className="font-semibold text-ink-strong">{tr(lang, "riskWarning")}</p>
          <p className="text-ink">{tr(lang, "riskWarningBody")}</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 pl-10">
        {alerts.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-terracotta/40 bg-surface px-3.5 font-semibold text-ink-strong transition-colors hover:border-terracotta-ink"
            >
              <Sprout aria-hidden className="size-4 text-terracotta-ink" />
              {a.title}
              <ChevronRight aria-hidden className="size-4 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </li>
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
