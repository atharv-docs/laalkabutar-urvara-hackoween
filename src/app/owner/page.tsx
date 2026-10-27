"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  CloudRain,
  PackageX,
  ShieldAlert,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { PageHeader, Panel, Stat, Chip, EmptyState } from "@/components/ui/primitives";
import { RiskChip } from "@/components/ui/domain";
import { ScheduleBoard } from "@/components/owner/ScheduleBoard";
import { DemoIncidents } from "@/components/owner/DemoIncidents";
import { ownerAlerts, type Alert } from "@/services/alerts";
import { farmSummary, formatINR, seasonTotals } from "@/services/analytics";
import { latestRiskByField } from "@/services/risk";
import { CROPS, cropLabel } from "@/data/crops";
import { addHours, fmtDayTime, istDate } from "@/lib/time";
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

export default function OwnerOverview() {
  const { state } = useReadyState();
  const alerts = ownerAlerts(state);
  const summaries = state.farms.map((f) => ({ farm: f, s: farmSummary(state, f.id) }));
  const today = istDate(state.now);
  const todays = state.tasks.filter((t) => istDate(t.start) === today && t.status !== "cancelled");
  const pending = state.proposals.filter((p) => p.status === "pending");
  const highRisk = [...latestRiskByField(state).values()].filter((s) => s.category === "high" && s.status !== "dismissed");
  const standing = summaries.reduce((sum, x) => sum + x.s.standingValueINR, 0);
  const lastSeason = seasonTotals(state, "Kharif 2026");

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          <>
            {state.farms.length} farms, {state.fields.length} fields and {state.users.filter((u) => u.role === "farmer" && u.status !== "deactivated").length} farmers across Nashik district, as of{" "}
            <time dateTime={state.now}>{fmtDayTime(state.now)}</time>.
          </>
        }
      />

      <Panel bodyClassName="grid grid-cols-2 gap-x-6 gap-y-5 p-4 md:grid-cols-3 xl:grid-cols-5 xl:divide-x xl:divide-line [&>*]:xl:pl-6 [&>*:first-child]:xl:pl-0">
        <Stat label="Standing crops, estimated" value={formatINR(standing, true)} context="Planning yield × demo mandi price" tone="gold" />
        <Stat
          label="Today's tasks done"
          value={`${todays.filter((t) => t.status === "done").length} of ${todays.length}`}
          context={`${todays.filter((t) => t.status === "in_progress").length} in progress, ${todays.filter((t) => t.status === "blocked").length} blocked`}
        />
        <Stat label="Waiting for your approval" value={pending.length} context={pending.length ? "Schedule changes drafted" : "No changes pending"} tone={pending.length ? "gold" : undefined} />
        <Stat label="Fields at high scouting risk" value={highRisk.length} context="From unverified crop reports" tone={highRisk.length ? "terracotta" : undefined} />
        <Stat label="Kharif 2026 yield vs plan" value={lastSeason.yieldPct != null ? `${lastSeason.yieldPct}%` : "–"} context={`${formatINR(lastSeason.valueINR, true)} est. value`} />
      </Panel>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel
          id="attention"
          title="Needs your attention"
          description="Most urgent first. Each item links to where you can act on it."
          bodyClassName="p-0"
        >
          {alerts.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={BadgeCheck} title="Nothing needs you right now">
                New crop reports, schedule changes and conflicts will appear here as they happen.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {alerts.slice(0, 8).map((a) => {
                const Icon = KIND_ICON[a.kind];
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas">
                      <Icon aria-hidden className={a.level === "urgent" ? "mt-0.5 size-5 shrink-0 text-terracotta-ink" : "mt-0.5 size-5 shrink-0 text-gold-ink"} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-strong">
                          {a.title}
                          {a.level === "urgent" && (
                            <Chip tone="terracotta" className="ml-2 align-[1px]">
                              Urgent
                            </Chip>
                          )}
                        </p>
                        <p className="line-clamp-2 text-sm text-ink">{a.detail}</p>
                      </div>
                      <ArrowRight aria-hidden className="mt-1 size-4 shrink-0 text-forest opacity-60 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                );
              })}
              {alerts.length > 8 && <li className="px-4 py-2.5 text-sm text-ink-muted">{alerts.length - 8} more items in Operations, Crop Health and Resources.</li>}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Weather outlook" description="Next 36 hours by zone. Rain changes the plan; Urvara checks every task against it." bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {state.weather.map((w) => {
                const next = blocksOverlapping(w, state.now, addHours(state.now, 36));
                const wettest = next.reduce((m, b) => (b.rainProb > m.rainProb ? b : m), next[0]);
                const farms = state.farms.filter((f) => f.weatherZone === w.zone).map((f) => f.name.replace(/ Farm$/, ""));
                return (
                  <li key={w.zone} className="flex items-center gap-3 px-4 py-2.5">
                    <CloudRain aria-hidden className={wettest && wettest.rainProb >= 60 ? "size-5 shrink-0 text-terracotta-ink" : "size-5 shrink-0 text-sage-ink"} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-strong">{w.zoneLabel}</p>
                      <p className="truncate text-sm text-ink-muted">{farms.join(", ")}</p>
                    </div>
                    {wettest && (
                      <p className="tabular text-right text-sm">
                        <span className={wettest.rainProb >= 60 ? "font-semibold text-terracotta-ink" : "text-ink-strong"}>{wettest.rainProb}% rain</span>
                        <span className="block text-ink-muted">{wettest.rainProb >= 40 ? fmtDayTime(wettest.start) : "max, next 36 h"}</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
          <DemoIncidents compact />
        </div>
      </div>

      <Panel
        className="mt-5"
        title="Shared machines, next five days"
        description="Every booking across all farms, with the rain outlook above. Select a booking to open the task."
        actions={
          <Link href="/owner/operations" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
            Open Operations <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
      >
        <ScheduleBoard state={state} compact />
      </Panel>

      <Panel className="mt-5" title="Farm portfolio" description="Select a farm for fields, soil readings, reports and tasks." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Farm</th>
                <th scope="col" className="px-3 py-2 font-semibold">Crops</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Area</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Today</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Open tasks</th>
                <th scope="col" className="px-3 py-2 font-semibold">Crop risk</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Standing value (est.)</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(({ farm, s }) => (
                <tr key={farm.id} className="border-b border-line/70 last:border-0 hover:bg-canvas">
                  <td className="px-4 py-2.5">
                    <Link href={`/owner/farms/${farm.id}`} className="font-semibold text-forest hover:underline">
                      {farm.name}
                    </Link>
                    <span className="block text-ink-muted">{farm.village}</span>
                  </td>
                  <td className="px-3 py-2.5 text-ink">{s.crops.map((c) => cropLabel(c)).join(", ")}</td>
                  <td className="tabular px-3 py-2.5 text-right">{s.areaAcres} ac</td>
                  <td className="tabular px-3 py-2.5 text-right">{s.tasksToday ? `${s.doneToday}/${s.tasksToday} done` : "–"}</td>
                  <td className="tabular px-3 py-2.5 text-right">
                    {s.openTasks}
                    {s.overdue > 0 && <span className="ml-1.5 font-semibold text-terracotta-ink">{s.overdue} overdue</span>}
                    {s.attention > 0 && <span className="ml-1.5 font-semibold text-terracotta-ink">{s.attention} flagged</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <RiskChip category={s.risk} />
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold text-ink-strong">{formatINR(s.standingValueINR, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-ink-muted">
          Values are estimates from synthetic demo records (planning yield per acre × indicative price, e.g. tomato ₹{CROPS.tomato.pricePerQINR.toLocaleString("en-IN")}/q). Not financial advice.
        </p>
      </Panel>
    </>
  );
}
