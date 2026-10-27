/**
 * Task lifecycle and creation with constraint validation.
 */
import type { Language, Priority, Task, TaskStatus, TaskType, UrvaraState } from "@/types";
import { nextId } from "@/lib/ids";
import { fmtRange, ms } from "@/lib/time";
import { assigneeFree, machineFree, weatherFor, weatherViolation } from "./scheduler";
import { withAudit } from "./audit";
import { stockPosition } from "./resources";

export const BLOCKER_REASONS = ["rain", "machine", "labour", "input", "health", "other"] as const;
export type BlockerReason = (typeof BLOCKER_REASONS)[number];

export const BLOCKER_LABEL: Record<BlockerReason, Record<Language, string>> = {
  rain: { en: "Rain or bad weather", hi: "बारिश या खराब मौसम", pa: "ਮੀਂਹ ਜਾਂ ਖ਼ਰਾਬ ਮੌਸਮ" },
  machine: { en: "Machine did not arrive / broken", hi: "मशीन नहीं आई / खराब", pa: "ਮਸ਼ੀਨ ਨਹੀਂ ਆਈ / ਖ਼ਰਾਬ" },
  labour: { en: "Not enough workers", hi: "मजदूर कम हैं", pa: "ਮਜ਼ਦੂਰ ਘੱਟ ਹਨ" },
  input: { en: "Seed, fertiliser or spray not available", hi: "बीज, खाद या दवा नहीं है", pa: "ਬੀਜ, ਖਾਦ ਜਾਂ ਦਵਾਈ ਨਹੀਂ ਹੈ" },
  health: { en: "I am unwell", hi: "मेरी तबीयत ठीक नहीं", pa: "ਮੇਰੀ ਤਬੀਅਤ ਠੀਕ ਨਹੀਂ" },
  other: { en: "Something else", hi: "कुछ और", pa: "ਕੁਝ ਹੋਰ" },
};

export function updateTaskStatus(
  state: UrvaraState,
  taskId: string,
  status: TaskStatus,
  actorId: string,
  opts: { note?: string; blocker?: BlockerReason; via?: string } = {},
): UrvaraState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.status === status) return state;
  const labels: Record<TaskStatus, string> = {
    suggested: "Suggested",
    scheduled: "Scheduled",
    in_progress: "Started",
    done: "Completed",
    blocked: "Blocked",
    cancelled: "Cancelled",
  };
  const parts = [labels[status]];
  if (opts.blocker) parts.push(`reason: ${BLOCKER_LABEL[opts.blocker].en}`);
  if (opts.note) parts.push(`note: "${opts.note}"`);
  if (opts.via) parts.push(`via ${opts.via}`);
  const text = parts.join(", ");
  const updated: Task = {
    ...task,
    status,
    blockerReason: status === "blocked" ? (opts.blocker ? BLOCKER_LABEL[opts.blocker].en : opts.note) : undefined,
    completionNote: status === "done" ? opts.note : task.completionNote,
    completedAt: status === "done" ? state.now : task.completedAt,
    changeNotice: undefined,
    needsAttention: status === "blocked" ? `Blocked by ${task.assigneeId === actorId ? "farmer" : "owner"}: ${opts.blocker ? BLOCKER_LABEL[opts.blocker].en : opts.note ?? ""}` : status === "done" || status === "cancelled" ? undefined : task.needsAttention,
    history: [...task.history, { at: state.now, actor: actorId, text }],
  };
  return withAudit(
    { ...state, tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) },
    actorId,
    `task.${status}`,
    taskId,
    `${task.title}: ${text}`,
  );
}

export function acknowledgeChange(state: UrvaraState, taskId: string): UrvaraState {
  return { ...state, tasks: state.tasks.map((t) => (t.id === taskId && t.changeNotice ? { ...t, changeNotice: undefined } : t)) };
}

export function reassignTask(state: UrvaraState, taskId: string, assigneeId: string, actorId: string): UrvaraState {
  const task = state.tasks.find((t) => t.id === taskId);
  const user = state.users.find((u) => u.id === assigneeId);
  if (!task || !user || task.assigneeId === assigneeId) return state;
  const text = `Reassigned to ${user.name}`;
  const tasks = state.tasks.map((t) =>
    t.id === taskId ? { ...t, assigneeId, needsAttention: undefined, history: [...t.history, { at: state.now, actor: actorId, text }] } : t,
  );
  return withAudit({ ...state, tasks }, actorId, "task.reassigned", taskId, `${task.title}: ${text}`);
}

export interface TaskDraft {
  title: string;
  type: TaskType;
  fieldId: string;
  assigneeId: string;
  start: string;
  end: string;
  due: string;
  priority: Priority;
  machineIds: string[];
  inputs: { resourceId: string; quantity: number }[];
  rationale: string;
}

export interface TaskIssue {
  level: "error" | "warning";
  message: string;
}

/** Validate a draft against every hard and soft constraint before it is saved. */
export function validateTaskDraft(state: UrvaraState, draft: TaskDraft, ignoreTaskId?: string): TaskIssue[] {
  const issues: TaskIssue[] = [];
  const field = state.fields.find((f) => f.id === draft.fieldId);
  if (!draft.title.trim()) issues.push({ level: "error", message: "Give the task a short title." });
  if (!field) issues.push({ level: "error", message: "Choose a field." });
  if (!draft.assigneeId) issues.push({ level: "error", message: "Choose who will do this task." });
  if (ms(draft.end) <= ms(draft.start)) issues.push({ level: "error", message: "End time must be after the start time." });
  if (ms(draft.end) > ms(draft.due)) issues.push({ level: "error", message: "The task would finish after its deadline." });
  if (!field || issues.some((i) => i.level === "error")) return issues;

  const exclude = ignoreTaskId ? [ignoreTaskId] : [];
  const assignee = state.users.find((u) => u.id === draft.assigneeId);
  if (assignee && !assignee.fieldIds.includes(field.id)) {
    issues.push({ level: "warning", message: `${assignee.name} is not assigned to ${field.name}. They will not see this field until you assign it.` });
  }
  if (assignee?.status === "deactivated") issues.push({ level: "error", message: `${assignee.name} is deactivated.` });
  if (!assigneeFree(state, draft.assigneeId, draft.start, draft.end, exclude)) {
    issues.push({ level: "error", message: `${assignee?.name ?? "This farmer"} already has a task at that time.` });
  }
  for (const machineId of draft.machineIds) {
    const machine = state.resources.find((r) => r.id === machineId);
    if (!machine) continue;
    if (machine.status !== "available") issues.push({ level: "error", message: `${machine.name} is out of service.` });
    else if (!machineFree(state, machineId, field.farmId, draft.start, draft.end, exclude)) {
      issues.push({ level: "error", message: `${machine.name} is booked elsewhere at ${fmtRange(draft.start, draft.end)} (including 1 h travel between farms).` });
    }
  }
  for (const input of draft.inputs) {
    const pos = stockPosition(state, input.resourceId, exclude);
    if (!pos) continue;
    if (input.quantity > pos.free) {
      issues.push({ level: "warning", message: `${pos.resource.name}: needs ${input.quantity} ${pos.resource.unit}, only ${pos.free} free after other bookings.` });
    }
  }
  const pseudo = { ...draft, farmId: field.farmId } as unknown as Task;
  const weather = weatherViolation(pseudo, draft.start, draft.end, weatherFor(state, field.farmId));
  if (weather) issues.push({ level: "warning", message: `Forecast: ${weather}.` });
  return issues;
}

export function createTask(state: UrvaraState, draft: TaskDraft, actorId: string, status: TaskStatus = "scheduled"): { state: UrvaraState; taskId: string } {
  const field = state.fields.find((f) => f.id === draft.fieldId)!;
  const id = nextId("tsk", state.tasks);
  const task: Task = {
    id,
    title: draft.title.trim(),
    type: draft.type,
    farmId: field.farmId,
    fieldId: field.id,
    crop: field.crop,
    assigneeId: draft.assigneeId,
    start: draft.start,
    end: draft.end,
    due: draft.due,
    priority: draft.priority,
    status,
    machineIds: draft.machineIds,
    inputs: draft.inputs,
    rationale: draft.rationale,
    history: [{ at: state.now, actor: actorId, text: `Created and assigned for ${fmtRange(draft.start, draft.end)}` }],
  };
  const next = withAudit({ ...state, tasks: [...state.tasks, task] }, actorId, "task.created", id, `Created "${task.title}" on ${field.name}`);
  return { state: next, taskId: id };
}
