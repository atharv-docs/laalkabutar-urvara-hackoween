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
  const alerts = farmerAlerts(state, user);

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
        <header>
          <h1 className="flex items-center gap-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] text-ink-strong sm:text-[2.25rem]">
            {t("greeting")}, {user.name.split(" ")[0]}
            <Sprout aria-hidden className="size-7 text-sage-ink sm:size-8" />
          </h1>
          <p className="mt-1 text-ink">{fmtLongDateLocalised(state.now, lang)}</p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={lang === "hi" ? "काम का सार" : "Work summary"}>
            <SummaryPill icon={ListChecks}>
              {inProgress} {tx(lang, "inProgressN")}
            </SummaryPill>
            <SummaryPill icon={Clock3}>
              {upcoming.length} {tx(lang, "upcomingN")}
            </SummaryPill>
          </ul>
        </header>

        {alerts.length > 0 && (
          <section aria-label={lang === "hi" ? "सूचनाएं" : "Alerts"}>
            <ul className="space-y-2.5">
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

function SummaryPill({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-1.5 text-[0.9375rem] text-ink-strong">
      <Icon aria-hidden className="size-4 text-ink-muted" />
      <span className="tabular">{children}</span>
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

function WeatherCard({ state, user, lang }: { state: UrvaraState; user: User; lang: Language }) {
  const w = user.farmIds.map((id) => weatherFor(state, id)).find(Boolean);
  if (!w) return null;
  const now = ms(state.now);
  const next = w.blocks.filter((b) => ms(b.end) > now && ms(b.start) < now + 24 * 3_600_000);
  const peak = Math.max(0, ...next.map((b) => b.rainProb));
  const wet = next.find((b) => b.rainProb >= 30);
  const level = peak >= 60 ? "rainHigh" : peak >= 30 ? "rainMedium" : "rainLow";
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
  const Icon = wet ? CloudRain : CloudSun;
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
