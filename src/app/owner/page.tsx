"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  CloudRain,
  CloudSun,
  IndianRupee,
  ListChecks,
  PackageX,
  ShieldAlert,
  Sprout,
  Tractor,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Panel, Chip, EmptyState, cx } from "@/components/ui/primitives";
import { RiskChip } from "@/components/ui/domain";
import { ScheduleBoard } from "@/components/owner/ScheduleBoard";
import { DemoIncidents } from "@/components/owner/DemoIncidents";
import { ownerAlerts, type Alert } from "@/services/alerts";
import { farmSummary, formatINR, seasonTotals } from "@/services/analytics";
import { latestRiskByField } from "@/services/risk";
import { CROPS, cropLabel } from "@/data/crops";
import { addHours, fmtDayTime, istDate, toIST } from "@/lib/time";
import { blocksOverlapping } from "@/services/scheduler";

const KIND_ICON: Record<Alert["kind"], LucideIcon> = {
  approval: CalendarClock,
  conflict: CircleAlert,
  risk: ShieldAlert,
  report: Sprout,
  task: ClipboardList,
  weather: CloudRain,
  stock: PackageX,
};

type KpiTone = "forest" | "gold" | "terracotta";

const KPI_TONE: Record<KpiTone, { tile: string; value: string }> = {
  forest: { tile: "bg-forest-tint text-forest", value: "text-ink-strong" },
  gold: { tile: "bg-gold-tint text-gold-ink", value: "text-gold-ink" },
  terracotta: { tile: "bg-terracotta-tint text-terracotta-ink", value: "text-terracotta-ink" },
};

function Kpi({ icon: Icon, label, value, context, tone = "forest", className }: { icon: LucideIcon; label: string; value: ReactNode; context?: ReactNode; tone?: KpiTone; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-col rounded-panel border border-line bg-surface p-4 shadow-panel sm:p-5", className)}>
      <span className={cx("grid size-9 place-items-center rounded-control", KPI_TONE[tone].tile)}>
        <Icon aria-hidden className="size-[1.125rem]" />
      </span>
      <p className="mt-3 text-sm leading-snug text-ink-muted sm:mt-4">{label}</p>
      <p className={cx("tabular mt-1 text-[1.75rem] font-semibold leading-none tracking-[-0.01em]", KPI_TONE[tone].value)}>{value}</p>
      {context && <p className="mt-2 text-sm leading-snug text-ink">{context}</p>}
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="text-sm font-semibold text-sage-ink">{eyebrow}</span>
      <span aria-hidden className="h-px flex-1 self-center bg-line" />
    </div>
  );
}

function greeting(nowIso: string): { en: string; hi: string } {
  const hour = Number(toIST(new Date(nowIso)).slice(11, 13));
  if (hour < 12) return { en: "Good morning", hi: "सुप्रभात" };
  if (hour < 17) return { en: "Good afternoon", hi: "नमस्ते" };
  return { en: "Good evening", hi: "शुभ संध्या" };
}

export default function OwnerOverview() {
  const { state, user } = useReadyState();
  const alerts = ownerAlerts(state);
  const urgent = alerts.filter((a) => a.level === "urgent").length;
  const summaries = state.farms.map((f) => ({ farm: f, s: farmSummary(state, f.id) }));
  const today = istDate(state.now);
  const todays = state.tasks.filter((t) => istDate(t.start) === today && t.status !== "cancelled");
  const pending = state.proposals.filter((p) => p.status === "pending");
  const highRisk = [...latestRiskByField(state).values()].filter((s) => s.category === "high" && s.status !== "dismissed");
  const standing = summaries.reduce((sum, x) => sum + x.s.standingValueINR, 0);
  const lastSeason = seasonTotals(state, "Kharif 2026");
  const farmers = state.users.filter((u) => u.role === "farmer" && u.status !== "deactivated").length;
  const hello = greeting(state.now);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-10">
      {/* Hero: who, where and the one number that says how much needs the owner. */}
      <section className="relative overflow-hidden rounded-panel bg-forest px-5 py-7 text-ivory shadow-raised sm:px-8 sm:py-9">
        <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 text-ivory opacity-[0.07]">
          <path d="M0 200 C80 150 160 140 400 120 L400 200 Z" fill="currentColor" />
          <path d="M60 200 C150 120 250 100 400 70 L400 200 Z" fill="currentColor" />
          <path d="M140 200 C230 100 320 60 400 25 L400 200 Z" fill="currentColor" />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0 max-w-2xl">
            <p className="text-sm font-semibold text-sage">
              <span lang="hi">{hello.hi}</span> · {hello.en}
            </p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-ivory sm:text-[2.5rem]">{firstName}, here is your land today</h1>
            <p className="mt-3 text-ivory/80">
              {state.farms.length} farms, {state.fields.length} fields and {farmers} farmers across Nashik district, as of{" "}
              <time dateTime={state.now} className="font-semibold text-ivory">
                {fmtDayTime(state.now)}
              </time>
              .
            </p>
          </div>
          <Link
            href="#attention"
            className="group inline-flex items-center gap-3 rounded-panel bg-ivory/10 px-4 py-3 ring-1 ring-ivory/15 transition-colors hover:bg-ivory/15"
          >
            <span className={cx("tabular grid size-11 place-items-center rounded-control text-xl font-bold", urgent ? "bg-terracotta-tint text-terracotta-ink" : "bg-ivory text-forest")}>
              {alerts.length}
            </span>
            <span className="text-sm leading-snug">
              <span className="block font-semibold text-ivory">{alerts.length === 1 ? "item needs you" : "items need you"}</span>
              <span className="text-ivory/70">{urgent ? `${urgent} urgent` : "Nothing urgent"}</span>
            </span>
            <ArrowRight aria-hidden className="size-4 text-ivory/70 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={IndianRupee} label="Standing crops, estimated" value={formatINR(standing, true)} context="Planning yield × demo mandi price" />
        <Kpi
          icon={ListChecks}
          label="Today's tasks done"
          value={`${todays.filter((t) => t.status === "done").length} of ${todays.length}`}
          context={`${todays.filter((t) => t.status === "in_progress").length} in progress, ${todays.filter((t) => t.status === "blocked").length} blocked`}
        />
        <Kpi
          icon={CalendarClock}
          label="Waiting for your approval"
          value={pending.length}
          context={pending.length ? "Schedule changes drafted" : "No changes pending"}
          tone={pending.length ? "gold" : "forest"}
        />
        <Kpi icon={ShieldAlert} label="Fields at high scouting risk" value={highRisk.length} context="From unverified crop reports" tone={highRisk.length ? "terracotta" : "forest"} />
        <Kpi className="col-span-2 lg:col-span-1" icon={TrendingUp} label="Kharif 2026 yield vs plan" value={lastSeason.yieldPct != null ? `${lastSeason.yieldPct}%` : "–"} context={`${formatINR(lastSeason.valueINR, true)} est. value`} />
      </section>

      <section>
        <SectionHeading title="Today" eyebrow="आज" />
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Panel
            id="attention"
            className="scroll-mt-20"
            icon={CircleAlert}
            title={
              <span className="inline-flex items-center gap-2">
                Needs your attention
                {alerts.length > 0 && <Chip tone={urgent ? "terracotta" : "neutral"}>{alerts.length}</Chip>}
              </span>
            }
            description="Most urgent first. Each item links to where you can act on it."
            bodyClassName="p-2"
          >
            {alerts.length === 0 ? (
              <div className="p-2">
                <EmptyState icon={BadgeCheck} title="Nothing needs you right now">
                  New crop reports, schedule changes and conflicts will appear here as they happen.
                </EmptyState>
              </div>
            ) : (
              <ul className="space-y-1">
                {alerts.slice(0, 8).map((a) => {
                  const Icon = KIND_ICON[a.kind];
                  const isUrgent = a.level === "urgent";
                  return (
                    <li key={a.id}>
                      <Link
                        href={a.href}
                        className={cx(
                          "group flex items-start gap-3.5 rounded-control px-3 py-3 transition-colors",
                          isUrgent ? "bg-terracotta-tint/45 hover:bg-terracotta-tint/70" : "hover:bg-canvas",
                        )}
                      >
                        <span
                          className={cx(
                            "grid size-9 shrink-0 place-items-center rounded-control",
                            isUrgent ? "bg-terracotta-tint text-terracotta-ink" : "bg-sunken text-gold-ink",
                          )}
                        >
                          <Icon aria-hidden className="size-[1.125rem]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink-strong">
                            {a.title}
                            {isUrgent && (
                              <Chip tone="terracotta" className="ml-2 align-[1px]">
                                Urgent
                              </Chip>
                            )}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-ink">{a.detail}</p>
                        </div>
                        <ArrowRight aria-hidden className="mt-2.5 size-4 shrink-0 text-forest opacity-50 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
                {alerts.length > 8 && <li className="px-3 py-2.5 text-sm text-ink-muted">{alerts.length - 8} more items in Operations, Crop Health and Resources.</li>}
              </ul>
            )}
          </Panel>

          <Panel className="xl:sticky xl:top-20" icon={CloudSun} title="Weather outlook" description="Wettest window in the next 36 hours, by zone. Urvara checks every task against it.">
            <ul className="space-y-5">
              {state.weather.map((w) => {
                const next = blocksOverlapping(w, state.now, addHours(state.now, 36));
                const wettest = next.reduce((m, b) => (b.rainProb > m.rainProb ? b : m), next[0]);
                const farms = state.farms.filter((f) => f.weatherZone === w.zone).map((f) => f.name.replace(/ Farm$/, ""));
                const wet = wettest && wettest.rainProb >= 60;
                return (
                  <li key={w.zone}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate">
                        <span className="font-semibold text-ink-strong">{w.zoneLabel}</span>
                        <span className="ml-2 text-sm text-ink-muted">{farms.join(", ")}</span>
                      </p>
                      {wettest && (
                        <p className={cx("tabular shrink-0 text-sm font-semibold", wet ? "text-terracotta-ink" : "text-ink-strong")}>
                          <CloudRain aria-hidden className="mr-1 inline size-4 align-[-3px]" />
                          {wettest.rainProb}% rain
                        </p>
                      )}
                    </div>
                    {wettest && (
                      <>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                          <div className={cx("h-full rounded-full", wet ? "bg-terracotta" : "bg-sage")} style={{ width: `${Math.max(wettest.rainProb, 3)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">{wettest.rainProb >= 40 ? `Peak ${fmtDayTime(wettest.start)}` : "Max chance, next 36 h"}</p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </section>

      <section>
        <SectionHeading title="Coordination" eyebrow="तालमेल" />
        <div className="space-y-6">
          <Panel
            icon={Tractor}
            title="Shared machines, next five days"
            description="Every booking across all farms, with the rain outlook above. Select a booking to open the task."
            bodyClassName="p-4 sm:p-5"
            actions={
              <Link href="/owner/operations" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                Open Operations <ArrowRight aria-hidden className="size-4" />
              </Link>
            }
          >
            <ScheduleBoard state={state} compact />
          </Panel>
          <DemoIncidents />
        </div>
      </section>

      <section>
        <SectionHeading title="Portfolio" eyebrow="खेत" />
        <Panel icon={Warehouse} title="Farm portfolio" description="Select a farm for fields, soil readings, reports and tasks." bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Farm</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Crops</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Area</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Today</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Open tasks</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Crop risk</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Standing value (est.)</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(({ farm, s }) => (
                  <tr key={farm.id} className="border-b border-line/70 last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link href={`/owner/farms/${farm.id}`} className="font-semibold text-forest hover:underline">
                        {farm.name}
                      </Link>
                      <span className="block text-ink-muted">{farm.village}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="flex flex-wrap gap-1">
                        {s.crops.map((c) => (
                          <Chip key={c} tone="sage">
                            {cropLabel(c)}
                          </Chip>
                        ))}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3.5 text-right">{s.areaAcres} ac</td>
                    <td className="tabular px-3 py-3.5 text-right">{s.tasksToday ? `${s.doneToday}/${s.tasksToday} done` : "–"}</td>
                    <td className="tabular px-3 py-3.5 text-right">
                      {s.openTasks}
                      {s.overdue > 0 && <span className="ml-1.5 font-semibold text-terracotta-ink">{s.overdue} overdue</span>}
                      {s.attention > 0 && <span className="ml-1.5 font-semibold text-terracotta-ink">{s.attention} flagged</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <RiskChip category={s.risk} />
                    </td>
                    <td className="tabular px-5 py-3.5 text-right text-base font-semibold text-ink-strong">{formatINR(s.standingValueINR, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
            Values are estimates from synthetic demo records (planning yield per acre × indicative price, e.g. tomato ₹{CROPS.tomato.pricePerQINR.toLocaleString("en-IN")}/q). Not financial advice.
          </p>
        </Panel>
      </section>
    </div>
  );
}
