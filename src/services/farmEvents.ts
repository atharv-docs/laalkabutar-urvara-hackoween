/**
 * Farm events for the n8n "Autonomous Farm Coordinator" workflow. Urvara turns
 * a forecast change into one WEATHER_CHANGED event per affected farm; the
 * workflow's AI agent drafts a plan and its validator checks it. The result is
 * advisory: it is shown beside Urvara's own replan and never moves a task.
 */
import type { CoordinatorAction, CoordinatorReview, ReplanProposal, ScheduleChange, Task, UrvaraState } from "@/types";
import { nextId } from "@/lib/ids";
import { addHours, fmtDay, fmtRange, istDate, ms } from "@/lib/time";
import { blocksOverlapping, findSlot, weatherFor } from "./scheduler";
import { addProposal, movableTasks } from "./replanner";
import { withAudit } from "./audit";
import { DEMO_COORDINATOR_EVENT, DEMO_COORDINATOR_PRESET } from "@/data/coordinatorDemo";

export const FARM_EVENT_TYPES = ["WEATHER_CHANGED", "IRRIGATION_NEEDED", "CROP_RISK", "RESOURCE_CHANGED", "TASK_VERIFICATION"] as const;

export interface FarmEvent {
  eventId: string;
  eventType: (typeof FARM_EVENT_TYPES)[number];
  farmId: string;
  timestamp: string;
  source: string;
  data: {
    weather: { condition: string; rainfallMm: number; from: string; to: string; maxWindKmh: number; maxRainProb: number };
    context: {
      tasks: { taskId: string; farmId: string; type: string; title: string; date: string; start: string; end: string; due: string; priority: string; resourceId?: string }[];
      resources: { resourceId: string; kind: string; type: string; name: string; status: string }[];
      /** Plain-language constraints for the AI agent. */
      rules?: string[];
    };
  };
}

/** Forecast horizon the coordinator is asked about. */
const HORIZON_HOURS = 72;

/** One event per farm whose forecast now has rain in the next three days and that has upcoming work. */
export function buildWeatherEvents(state: UrvaraState, proposal: ReplanProposal): FarmEvent[] {
  const horizon = addHours(state.now, HORIZON_HOURS);
  const upcoming = movableTasks(state).filter((t) => ms(t.start) < ms(horizon));
  const events: FarmEvent[] = [];
  for (const farm of state.farms) {
    const blocks = blocksOverlapping(weatherFor(state, farm.id), state.now, horizon);
    const wet = blocks.filter((b) => b.rainMm > 0);
    const tasks = upcoming.filter((t) => t.farmId === farm.id);
    if (!wet.length || !tasks.length) continue;
    const rainfallMm = Math.round(wet.reduce((s, b) => s + b.rainMm, 0));
    const maxWindKmh = Math.max(...wet.map((b) => b.windKmh));
    const maxRainProb = Math.max(...wet.map((b) => b.rainProb));
    events.push({
      eventId: `evt-${proposal.id}-${farm.id}`,
      eventType: "WEATHER_CHANGED",
      farmId: farm.id,
      timestamp: state.now,
      source: "urvara-forecast",
      data: {
        weather: {
          condition: maxWindKmh >= 25 && maxRainProb >= 70 ? "thunderstorm" : rainfallMm >= 20 ? "heavy_rain" : "rain",
          rainfallMm,
          from: istDate(wet[0].start),
          to: istDate(wet[wet.length - 1].end),
          maxWindKmh,
          maxRainProb,
        },
        context: { tasks: tasks.map(taskContext), resources: resourceContext(state, tasks) },
      },
    });
  }
  return events;
}

function taskContext(t: Task): FarmEvent["data"]["context"]["tasks"][number] {
  return {
    taskId: t.id,
    farmId: t.farmId,
    type: t.type,
    title: t.title,
    date: istDate(t.start),
    start: t.start,
    end: t.end,
    due: t.due,
    priority: t.priority,
    // The validator checks every action's resource, so each task names one: its machine, else its main input (canal water, fertiliser).
    ...((t.machineIds[0] ?? t.inputs[0]?.resourceId) ? { resourceId: t.machineIds[0] ?? t.inputs[0].resourceId } : {}),
  };
}

/** Machines and inputs the tasks use, plus available machines of the same kind so the AI can suggest a swap. */
function resourceContext(state: UrvaraState, tasks: Task[]): FarmEvent["data"]["context"]["resources"] {
  const used = new Set(tasks.flatMap((t) => [...t.machineIds, ...t.inputs.map((i) => i.resourceId)]));
  const machineKinds = new Set(state.resources.filter((r) => r.kind === "machine" && used.has(r.id)).map((r) => r.category));
  return state.resources
    .filter((r) => used.has(r.id) || (r.kind === "machine" && machineKinds.has(r.category) && r.status === "available"))
    .map((r) => ({ resourceId: r.id, kind: r.kind, type: r.category, name: r.name, status: r.status }));
}

const str = (v: unknown, max = 600): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x) ?? str((x as { message?: unknown })?.message) ?? "").filter(Boolean).slice(0, 10) : [];

/**
 * Read the workflow's response defensively. The decision may come as the body
 * itself or wrapped in `decisionRecord`; anything unexpected becomes null.
 */
export function parseCoordinatorResponse(body: unknown, farmId: string, at: string): CoordinatorReview | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const record = (raw.decisionRecord && typeof raw.decisionRecord === "object" ? raw.decisionRecord : raw) as Record<string, unknown>;
  const status = record.status;
  if (status !== "proposed" && status !== "pending_approval" && status !== "rejected") return null;
  const runId = str(record.runId, 120);
  if (!runId) return null;
  const validation = (record.validationResults ?? {}) as { actions?: unknown; globalIssues?: unknown };
  const checks = Array.isArray(validation.actions) ? (validation.actions as Record<string, unknown>[]) : [];
  const proposed = Array.isArray(record.proposedActions) ? (record.proposedActions as Record<string, unknown>[]) : [];
  const actions: CoordinatorAction[] = proposed.slice(0, 20).map((a, i) => {
    const check = checks[i] ?? {};
    const issues = [...strings(a.validationIssues), ...strings(check.issues)];
    return {
      type: str(a.type, 60) ?? "ACTION",
      taskId: str(a.taskId, 60),
      resourceId: str(a.resourceId, 60),
      newDate: str(a.newScheduledDate, 40),
      magnitude: str(a.magnitude, 20),
      description: str(a.description) ?? "",
      valid: check.valid !== false && issues.length === 0,
      issues: [...new Set(issues)],
    };
  });
  const persistence = (raw.persistence ?? record.persistence ?? {}) as { saved?: unknown };
  return {
    farmId,
    runId,
    status,
    summary: str(record.summary) ?? "",
    riskLevel: str(record.riskLevel, 20),
    actions,
    issues: strings(validation.globalIssues),
    saved: persistence.saved === true,
    at,
  };
}

/** Attach the coordinator's runs to a proposal, replacing earlier runs for the same farms. */
export function attachCoordinatorReviews(state: UrvaraState, proposalId: string, reviews: CoordinatorReview[]): UrvaraState {
  if (!reviews.length) return state;
  const farms = new Set(reviews.map((r) => r.farmId));
  const next: UrvaraState = {
    ...state,
    proposals: state.proposals.map((p) =>
      p.id === proposalId ? { ...p, coordinator: [...(p.coordinator ?? []).filter((r) => !farms.has(r.farmId)), ...reviews] } : p,
    ),
  };
  const runs = reviews.map((r) => r.runId).join(", ");
  return withAudit(next, "system", "coordinator.reviewed", proposalId, `n8n farm coordinator reviewed the forecast change for ${reviews.length} farm${reviews.length === 1 ? "" : "s"} (${runs})`);
}

/**
 * Urvara's own check on top of the workflow's validator, which does not know
 * deadlines: a task moved past its due date fails, and a valid run with such an
 * action no longer counts as valid.
 */
export function checkDeadlines(review: CoordinatorReview, event: FarmEvent): CoordinatorReview {
  const due = new Map(event.data.context.tasks.map((t) => [t.taskId, t.due]));
  let late = false;
  const actions = review.actions.map((a) => {
    const deadline = a.taskId ? due.get(a.taskId) : undefined;
    const day = a.newDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (!deadline || !day || a.type === "CANCEL_TASK" || day <= istDate(deadline)) return a;
    late = true;
    return { ...a, valid: false, issues: [...a.issues, `Past its deadline (${fmtDay(deadline)}), checked by Urvara`] };
  });
  return late ? { ...review, actions, status: review.status === "proposed" ? "pending_approval" : review.status } : review;
}

/**
 * Turn a coordinator decision into a normal replan proposal, so the owner
 * reviews and approves it like any other. Each valid action is re-checked by
 * Urvara's scheduler: a reschedule takes the first slot on the requested day
 * that fits the machine, the farmer, the weather and the deadline.
 */
export function proposalFromCoordinator(state: UrvaraState, review: CoordinatorReview): { state: UrvaraState; proposalId?: string; skipped: string[] } {
  const movable = new Map(movableTasks(state).map((t) => [t.id, t]));
  const changes: ScheduleChange[] = [];
  const skipped: string[] = [];
  let working = state;
  for (const a of review.actions) {
    const task = a.taskId ? movable.get(a.taskId) : undefined;
    const label = task?.title ?? a.taskId ?? a.type;
    if (!a.valid) {
      skipped.push(`${label}: failed checks`);
      continue;
    }
    if (!task) {
      skipped.push(`${label}: not an upcoming task`);
      continue;
    }
    const before = { start: task.start, end: task.end, machineIds: task.machineIds };
    const why = a.description || "Suggested by the n8n farm coordinator";
    if (a.type === "CANCEL_TASK") {
      changes.push({ taskId: task.id, before, after: null, cancel: true, reason: /^cancel/i.test(why) ? why : `Cancel. ${why}`, resourcesAffected: [] });
      continue;
    }
    const day = a.newDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (a.type !== "RESCHEDULE_TASK" || !day) {
      skipped.push(`${label}: ${a.type.toLowerCase().replace(/_/g, " ")} is not something Urvara can apply`);
      continue;
    }
    const slot = findSlot(working, task, { from: `${day}T00:00:00+05:30` });
    if (!slot || istDate(slot.start) !== day) {
      skipped.push(`${label}: no free, dry slot on ${fmtDay(`${day}T12:00:00+05:30`)} before its deadline`);
      continue;
    }
    changes.push({ taskId: task.id, before, after: slot, reason: `${why} Urvara found ${fmtRange(slot.start, slot.end)} free.`, resourcesAffected: [] });
    working = { ...working, tasks: working.tasks.map((t) => (t.id === task.id ? { ...t, start: slot.start, end: slot.end, machineIds: slot.machineIds } : t)) };
  }
  if (!changes.length) return { state, skipped };
  const farm = state.farms.find((f) => f.id === review.farmId)?.name ?? review.farmId;
  const proposal: ReplanProposal = {
    id: nextId("prp", state.proposals),
    trigger: "coordinator",
    title: `n8n coordinator: ${farm}`,
    summary: `${review.summary}${skipped.length ? ` Not applied: ${skipped.join("; ")}.` : ""}`.trim(),
    createdAt: state.now,
    changes,
    unchangedTaskIds: [],
    requiresApproval: true,
    status: "pending",
    coordinator: [review],
  };
  const next = withAudit(addProposal(state, proposal), "system", "proposal.created", proposal.id, `From n8n run ${review.runId} (${review.source ?? "live"}): ${changes.length} change(s)`);
  return { state: next, proposalId: proposal.id, skipped };
}

/**
 * For the judging demo: use the live answer when Urvara can apply at least one
 * of its changes; otherwise the pre-set answer, labelled with the reason.
 */
export function chooseDemoReview(state: UrvaraState, live: CoordinatorReview | string): CoordinatorReview {
  let reason: string;
  if (typeof live === "string") reason = live.replace(/\.$/, "").toLowerCase();
  else if (live.status === "rejected") reason = `n8n returned no usable plan${live.issues[0] ? ` (${live.issues[0]})` : ""}`;
  else {
    const trial = proposalFromCoordinator(state, { ...live, source: "live" });
    if (trial.proposalId) return { ...live, source: "live" };
    reason = `none of the live suggestions passed Urvara's checks (${trial.skipped.join("; ")})`;
  }
  const preset = parseCoordinatorResponse(DEMO_COORDINATOR_PRESET, DEMO_COORDINATOR_EVENT.farmId, state.now)!;
  return { ...checkDeadlines(preset, DEMO_COORDINATOR_EVENT), source: "preset", fallbackReason: reason };
}
