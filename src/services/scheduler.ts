/**
 * Deterministic constraint checks and a greedy slot finder. Final assignments
 * always come from here, never from free text or a language model.
 */
import type { ForecastBlock, Task, UrvaraState, WeatherSnapshot } from "@/types";
import { addHours, atLocal, hoursBetween, ms, overlaps } from "@/lib/time";

/** Hours of travel buffer required when a machine moves between farms. */
export const MACHINE_TRAVEL_BUFFER_H = 1;
/** Minimum notice before a rescheduled task may start. */
export const MIN_NOTICE_H = 2;
/** Local start hours the planner offers each day. */
export const SLOT_START_HOURS = [7, 10, 14];

export const ACTIVE_STATUSES: Task["status"][] = ["scheduled", "in_progress"];

export function weatherFor(state: UrvaraState, farmId: string): WeatherSnapshot | undefined {
  const farm = state.farms.find((f) => f.id === farmId);
  return farm ? state.weather.find((w) => w.zone === farm.weatherZone) : undefined;
}

export function blocksOverlapping(snapshot: WeatherSnapshot | undefined, start: string, end: string): ForecastBlock[] {
  if (!snapshot) return [];
  return snapshot.blocks.filter((b) => overlaps(b.start, b.end, start, end));
}

/**
 * Returns a plain-language reason when the forecast makes this task unsafe or
 * wasteful in the given window, or null when the window is acceptable.
 */
export function weatherViolation(task: Task, start: string, end: string, snapshot: WeatherSnapshot | undefined): string | null {
  if (!snapshot) return null;
  switch (task.type) {
    case "spraying": {
      const wet = blocksOverlapping(snapshot, start, addHours(end, 6)).find((b) => b.rainProb >= 40);
      if (wet) return `${wet.rainProb}% chance of rain (${wet.rainMm} mm) during or within 6 h of spraying: wash-off risk`;
      const windy = blocksOverlapping(snapshot, start, end).find((b) => b.windKmh >= 15);
      if (windy) return `Wind ${windy.windKmh} km/h during the spray window (limit 15 km/h): drift risk`;
      return null;
    }
    case "fertiliser": {
      const heavy = blocksOverlapping(snapshot, start, addHours(end, 12)).find((b) => b.rainMm >= 10);
      return heavy ? `${heavy.rainMm} mm rain expected within 12 h of application: runoff loss` : null;
    }
    case "irrigation": {
      const total = blocksOverlapping(snapshot, start, addHours(start, 12)).reduce((sum, b) => sum + b.rainMm, 0);
      return total >= 8 ? `${total} mm rain expected within 12 h: irrigation would waterlog the field` : null;
    }
    case "harvest":
    case "sowing": {
      const wet = blocksOverlapping(snapshot, start, end).find((b) => b.rainProb >= 60);
      return wet ? `${wet.rainProb}% chance of rain during ${task.type}` : null;
    }
    default: {
      const storm = blocksOverlapping(snapshot, start, end).find((b) => b.rainProb >= 80);
      return storm ? `${storm.rainProb}% chance of heavy rain` : null;
    }
  }
}

/** Earliest instant a postponed task should be considered from, given the rain that displaced it. */
export function postponeFrom(task: Task, snapshot: WeatherSnapshot | undefined): string | null {
  if (task.type !== "irrigation" || !snapshot) return null;
  const wet = blocksOverlapping(snapshot, task.start, addHours(task.start, 12)).filter((b) => b.rainMm > 0);
  if (wet.length === 0) return null;
  return wet.reduce((latest, b) => (ms(b.end) > ms(latest) ? b.end : latest), wet[0].end);
}

export function machineBookings(state: UrvaraState, machineId: string, excludeTaskIds: string[] = []): Task[] {
  return state.tasks.filter(
    (t) => t.machineIds.includes(machineId) && ACTIVE_STATUSES.includes(t.status) && !excludeTaskIds.includes(t.id),
  );
}

export function machineFree(
  state: UrvaraState,
  machineId: string,
  farmId: string,
  start: string,
  end: string,
  excludeTaskIds: string[] = [],
): boolean {
  const machine = state.resources.find((r) => r.id === machineId);
  if (!machine || machine.status !== "available") return false;
  return machineBookings(state, machineId, excludeTaskIds).every((b) => {
    const buffer = b.farmId === farmId ? 0 : MACHINE_TRAVEL_BUFFER_H;
    return !overlaps(b.start, b.end, start, end, buffer);
  });
}

export function assigneeFree(state: UrvaraState, userId: string, start: string, end: string, excludeTaskIds: string[] = []): boolean {
  return state.tasks
    .filter((t) => t.assigneeId === userId && ACTIVE_STATUSES.includes(t.status) && !excludeTaskIds.includes(t.id))
    .every((t) => !overlaps(t.start, t.end, start, end));
}

/** Candidate start instants from `from` up to the task's deadline. */
export function candidateStarts(from: string, durationH: number, due: string, now: string): string[] {
  const earliest = Math.max(ms(from), ms(addHours(now, MIN_NOTICE_H)));
  const out: string[] = [];
  for (let day = 0; day < 8; day += 1) {
    for (const hour of SLOT_START_HOURS) {
      const start = atLocal(now, day, hour);
      if (ms(start) < earliest) continue;
      if (ms(addHours(start, durationH)) > ms(due)) return out;
      out.push(start);
    }
  }
  return out;
}

export interface Slot {
  start: string;
  end: string;
  machineIds: string[];
}

export interface FindSlotOptions {
  from?: string;
  /** Alternative machines per required machine id (used when a machine breaks down). */
  machineOptions?: Record<string, string[]>;
  excludeTaskIds?: string[];
}

/**
 * Greedy search: the earliest slot that satisfies weather rules, machine
 * availability (including travel buffer), assignee availability and deadline.
 */
export function findSlot(state: UrvaraState, task: Task, options: FindSlotOptions = {}): Slot | null {
  const durationH = hoursBetween(task.start, task.end);
  const snapshot = weatherFor(state, task.farmId);
  const exclude = [task.id, ...(options.excludeTaskIds ?? [])];
  for (const start of candidateStarts(options.from ?? state.now, durationH, task.due, state.now)) {
    const end = addHours(start, durationH);
    if (weatherViolation(task, start, end, snapshot)) continue;
    if (!assigneeFree(state, task.assigneeId, start, end, exclude)) continue;
    const machineIds: string[] = [];
    let ok = true;
    for (const required of task.machineIds) {
      const pool = options.machineOptions?.[required] ?? [required];
      const pick = pool.find((m) => machineFree(state, m, task.farmId, start, end, exclude));
      if (!pick) {
        ok = false;
        break;
      }
      machineIds.push(pick);
    }
    if (ok) return { start, end, machineIds };
  }
  return null;
}

export function isOverdue(task: Task, now: string): boolean {
  return ACTIVE_STATUSES.includes(task.status) && ms(task.end) < ms(now);
}
