"use client";

/**
 * The coordination board: shared machines as lanes across the next five days,
 * with each weather zone's rain outlook running above them. In proposal mode
 * it draws where every affected booking was (ghost) and where it would go.
 */
import Link from "next/link";
import { AlertTriangle, CloudRain, Droplets, Scissors, Search, Sprout, SprayCan, Tractor, Wheat, Wrench, type LucideIcon } from "lucide-react";
import type { ReplanProposal, Task, UrvaraState } from "@/types";
import type { TaskType } from "@/types";
import { addDays, atLocal, fmtRange, fmtWeekday, istDate, ms, toIST } from "@/lib/time";
import { cx } from "@/components/ui/primitives";

const DAY_START = 6;
const DAY_END = 19;
const DAYS = 5;

function position(state: UrvaraState, iso: string): number {
  const dayIndex = Math.round((ms(`${istDate(iso)}T00:00:00+05:30`) - ms(`${istDate(state.now)}T00:00:00+05:30`)) / 86_400_000);
  const local = toIST(new Date(iso));
  const hour = Number(local.slice(11, 13));
  const minute = Number(local.slice(14, 16));
  const within = Math.min(Math.max(hour + minute / 60, DAY_START), DAY_END);
  return ((dayIndex + (within - DAY_START) / (DAY_END - DAY_START)) / DAYS) * 100;
}

function span(state: UrvaraState, start: string, end: string) {
  const left = position(state, start);
  const right = position(state, end);
  return { left: `${left}%`, width: `${Math.max(right - left, 1.4)}%`, minWidth: "3.6rem" };
}

function inWindow(state: UrvaraState, iso: string) {
  const d0 = ms(`${istDate(state.now)}T00:00:00+05:30`);
  return ms(iso) >= d0 && ms(iso) < d0 + DAYS * 86_400_000;
}

/** Whole short words, never truncated, so the board stays readable at a glance. */
const TYPE_SHORT: Record<TaskType, { word: string; icon: LucideIcon }> = {
  irrigation: { word: "Water", icon: Droplets },
  spraying: { word: "Spray", icon: SprayCan },
  fertiliser: { word: "Feed", icon: Sprout },
  harvest: { word: "Harvest", icon: Wheat },
  scouting: { word: "Scout", icon: Search },
  sowing: { word: "Sow", icon: Tractor },
  pruning: { word: "Prune", icon: Scissors },
};

/** Three-letter farm code plus field number, e.g. "SAH F1". */
function farmCode(state: UrvaraState, task: Task) {
  const farm = state.farms.find((f) => f.id === task.farmId);
  const field = state.fields.find((f) => f.id === task.fieldId);
  const n = field?.name.match(/\d+/)?.[0];
  return `${farm?.name.slice(0, 3).toUpperCase()}${n ? ` F${n}` : ""}`;
}

function shortField(state: UrvaraState, task: Task) {
  const field = state.fields.find((f) => f.id === task.fieldId);
  const farm = state.farms.find((f) => f.id === task.farmId);
  return `${farm?.name.replace(/ Farm$/, "")} · ${field?.name.split(" – ")[0]}`;
}

/** Every rain cell is tinted by intensity so the weather layer scans as a band, not a list of numbers. */
function rainTone(prob: number) {
  if (prob >= 60) return "bg-terracotta-tint text-terracotta-ink font-semibold";
  if (prob >= 40) return "bg-gold-tint text-gold-ink";
  if (prob >= 15) return "bg-sage-tint/70 text-ink";
  return "bg-sage-tint/30 text-ink-muted";
}

export function ScheduleBoard({
  state,
  proposal,
  compact = false,
  highlightTaskId,
}: {
  state: UrvaraState;
  proposal?: ReplanProposal;
  compact?: boolean;
  highlightTaskId?: string;
}) {
  const machines = state.resources.filter((r) => r.kind === "machine");
  const days = Array.from({ length: DAYS }, (_, i) => addDays(atLocal(state.now, 0, 12), i));
  const changes = new Map(proposal?.changes.map((c) => [c.taskId, c]));
  const nowLeft = position(state, state.now);
  const zones = state.weather.filter((w) => !compact || ["dindori", "niphad"].includes(w.zone));

  const bookings = (machineId: string) =>
    state.tasks.filter((t) => {
      if (t.status === "cancelled" || t.status === "suggested") return false;
      const change = changes.get(t.id);
      const ids = change?.after?.machineIds ?? (change && !change.after ? [] : t.machineIds);
      return ids.includes(machineId) || (change && change.before.machineIds.includes(machineId));
    });

  return (
    <div className="overflow-x-auto" role="region" aria-label="Machine schedule for the next five days" tabIndex={0}>
      <div className="min-w-[1040px]">
        <div className="grid grid-cols-[9.5rem_1fr] text-sm">
          <div />
          <div className="grid grid-cols-5 border-b border-line">
            {days.map((d, i) => (
              <div key={d} className={cx("px-2 pb-1.5 font-semibold", i === 0 ? "text-forest" : "text-ink-strong")}>
                {i === 0 ? "Today" : fmtWeekday(d)}
                <span className="ml-1 font-normal text-ink-muted">{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(new Date(d))}</span>
              </div>
            ))}
          </div>

          {zones.map((zone) => (
            <div key={zone.zone} className="contents">
              <div className="flex items-center gap-1.5 border-b border-line/70 py-1 pr-2 text-xs text-ink-muted">
                <CloudRain aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">Rain · {zone.zoneLabel}</span>
              </div>
              <div className="grid grid-cols-10 border-b border-line/70">
                {zone.blocks.slice(0, DAYS * 2).map((b) => (
                  <div key={b.start} className={cx("tabular border-l border-line/50 px-1.5 py-1 text-xs first:border-l-0", rainTone(b.rainProb))} title={`${fmtRange(b.start, b.end)}: ${b.rainProb}% chance, ${b.rainMm} mm, wind ${b.windKmh} km/h`}>
                    {b.rainProb}%{b.rainMm > 0 ? ` · ${b.rainMm} mm` : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {machines.map((m) => {
            const broken = m.status !== "available";
            const lane = bookings(m.id);
            return (
              <div key={m.id} className="contents">
                <div className="flex min-h-14 flex-col justify-center border-b border-line py-2 pr-2">
                  <span className="truncate font-semibold text-ink-strong">{m.name}</span>
                  {broken ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta-ink">
                      <Wrench aria-hidden className="size-3.5" />
                      Out of service
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">{lane.length} booking{lane.length === 1 ? "" : "s"}</span>
                  )}
                </div>
                <div
                  className={cx("relative min-h-14 border-b border-line", broken && "bg-[repeating-linear-gradient(135deg,transparent_0_8px,rgba(185,111,78,0.10)_8px_10px)]")}
                >
                  {Array.from({ length: DAYS - 1 }, (_, i) => (
                    <div key={i} aria-hidden className="absolute inset-y-0 border-l border-line/80" style={{ left: `${((i + 1) / DAYS) * 100}%` }} />
                  ))}
                  <div aria-hidden className="absolute inset-y-0 z-10 w-0.5 bg-gold" style={{ left: `${nowLeft}%` }} />
                  {lane.map((t) => {
                    const change = changes.get(t.id);
                    const items: { key: string; start: string; end: string; kind: "ghost" | "moved" | "normal" | "unresolved" }[] = [];
                    if (change) {
                      if (change.before.machineIds.includes(m.id) && inWindow(state, change.before.start)) {
                        items.push({ key: "before", start: change.before.start, end: change.before.end, kind: change.after ? "ghost" : "unresolved" });
                      }
                      if (change.after && change.after.machineIds.includes(m.id) && inWindow(state, change.after.start)) {
                        items.push({ key: "after", start: change.after.start, end: change.after.end, kind: "moved" });
                      }
                    } else if (inWindow(state, t.start)) {
                      items.push({ key: "now", start: t.start, end: t.end, kind: "normal" });
                    }
                    return items.map((item) => {
                      const flagged = item.kind === "unresolved" || (item.kind === "normal" && (t.needsAttention || broken));
                      return (
                        <Link
                          key={`${t.id}-${item.key}`}
                          href={`/owner/operations?task=${t.id}`}
                          style={span(state, item.start, item.end)}
                          title={`${t.title}, ${shortField(state, t)}, ${fmtRange(item.start, item.end)}${item.kind === "ghost" ? " (current slot, would move)" : item.kind === "moved" ? " (proposed slot)" : ""}`}
                          className={cx(
                            "absolute top-2 bottom-2 z-20 flex flex-col justify-center whitespace-nowrap rounded-[5px] border px-1.5 text-left text-xs leading-tight transition-shadow hover:z-30 hover:shadow-raised focus-visible:z-30",
                            item.kind === "ghost" && "border-dashed border-ink-muted/70 bg-transparent text-ink-muted",
                            item.kind === "moved" && "border-gold-ink bg-gold-tint text-ink-strong ring-2 ring-gold/50",
                            item.kind === "unresolved" && "border-dashed border-terracotta-ink bg-terracotta-tint/70 text-terracotta-ink",
                            item.kind === "normal" && !flagged && t.status === "done" && "border-sage bg-sage-tint text-sage-ink",
                            item.kind === "normal" && !flagged && t.status === "in_progress" && "border-gold bg-gold-tint text-ink-strong",
                            item.kind === "normal" && !flagged && t.status === "scheduled" && "border-forest/40 bg-forest-tint text-forest",
                            item.kind === "normal" && flagged && "border-terracotta-ink bg-terracotta-tint text-terracotta-ink",
                            highlightTaskId === t.id && "ring-2 ring-forest",
                          )}
                        >
                          <span className="flex items-center gap-1 font-semibold">
                            {flagged ? <AlertTriangle aria-hidden className="size-3 shrink-0" /> : (() => {
                              const Icon = TYPE_SHORT[t.type].icon;
                              return <Icon aria-hidden className="size-3 shrink-0" />;
                            })()}
                            {TYPE_SHORT[t.type].word}
                          </span>
                          {!compact && <span className="tabular opacity-85">{farmCode(state, t)}</span>}
                          <span className="sr-only">: {t.title}, {shortField(state, t)}</span>
                        </Link>
                      );
                    });
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink">
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm border border-forest/40 bg-forest-tint" />Scheduled</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm border border-gold bg-gold-tint" />In progress</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm border border-terracotta-ink bg-terracotta-tint" />Needs attention</li>
          {proposal && (
            <>
              <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm border border-dashed border-ink-muted" />Current slot (would move)</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm border border-gold-ink bg-gold-tint ring-1 ring-gold/50" />Proposed slot</li>
            </>
          )}
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-0.5 bg-gold" />Now (demo clock)</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="tabular rounded-sm bg-terracotta-tint px-1 text-terracotta-ink">60%</span>Rain chance, morning / afternoon</li>
        </ul>
      </div>
    </div>
  );
}
