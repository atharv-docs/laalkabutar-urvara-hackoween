/**
 * Replanner: turns a changed world (forecast flip, machine breakdown) into a
 * reviewable proposal. Nothing moves until an owner approves the proposal.
 */
import type { ReplanProposal, ScheduleChange, Task, UrvaraState } from "@/types";
import { nextId } from "@/lib/ids";
import { addHours, fmtDayTime, fmtRange, ms } from "@/lib/time";
import { findSlot, postponeFrom, weatherFor, weatherViolation, type Slot } from "./scheduler";
import { withAudit } from "./audit";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Future, not-yet-started tasks the planner is allowed to move. */
export function movableTasks(state: UrvaraState): Task[] {
  return state.tasks
    .filter((t) => t.status === "scheduled" && ms(t.start) > ms(state.now))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || ms(a.start) - ms(b.start));
}

function machineNames(state: UrvaraState, ids: string[]): string[] {
  return ids.map((id) => state.resources.find((r) => r.id === id)?.name ?? id);
}

/** Apply a tentative slot to a working copy so later tasks in the same proposal see it. */
function tentatively(state: UrvaraState, taskId: string, slot: Slot | null): UrvaraState {
  return {
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.id !== taskId) return t;
      // An unresolved task is held out of the machine pool while the plan is drafted.
      if (!slot) return { ...t, machineIds: [] };
      return { ...t, start: slot.start, end: slot.end, machineIds: slot.machineIds };
    }),
  };
}

export function proposeWeatherReplan(state: UrvaraState): ReplanProposal | null {
  let working = state;
  const changes: ScheduleChange[] = [];
  const candidates = movableTasks(state);
  for (const task of candidates) {
    const snapshot = weatherFor(working, task.farmId);
    const problem = weatherViolation(task, task.start, task.end, snapshot);
    if (!problem) continue;
    const slot = findSlot(working, task, { from: postponeFrom(task, snapshot) ?? undefined });
    const moved = slot && ms(slot.start) < ms(task.start) ? "Moved earlier" : "Moved later";
    changes.push({
      taskId: task.id,
      before: { start: task.start, end: task.end, machineIds: task.machineIds },
      after: slot,
      reason: slot ? `${problem}. ${moved} to the next safe window (${fmtRange(slot.start, slot.end)}).` : `${problem}.`,
      resourcesAffected: machineNames(state, task.machineIds),
      unresolved: slot ? undefined : "No safe window before the deadline. Decide whether to extend the deadline or accept the weather risk.",
    });
    working = tentatively(working, task.id, slot);
  }
  if (changes.length === 0) return null;
  const changedIds = new Set(changes.map((c) => c.taskId));
  const unresolved = changes.filter((c) => !c.after).length;
  return {
    id: nextId("prp", state.proposals),
    trigger: "weather",
    title: "Forecast changed: rain in Dindori and Niphad",
    summary: `${changes.length} task${changes.length === 1 ? "" : "s"} affected by the new forecast${
      unresolved ? `, ${unresolved} need${unresolved === 1 ? "s" : ""} your decision` : ""
    }. ${candidates.length - changes.length} upcoming tasks stay as planned.`,
    createdAt: state.now,
    changes,
    unchangedTaskIds: candidates.filter((t) => !changedIds.has(t.id)).map((t) => t.id),
    requiresApproval: true,
    status: "pending",
  };
}

export function proposeMachineReplan(state: UrvaraState, machineId: string): ReplanProposal | null {
  const machine = state.resources.find((r) => r.id === machineId);
  if (!machine) return null;
  const alternatives = state.resources
    .filter((r) => r.kind === "machine" && r.category === machine.category && r.id !== machineId && r.status === "available")
    .map((r) => r.id);
  let working = state;
  const changes: ScheduleChange[] = [];
  const candidates = movableTasks(state);
  const affected = candidates.filter((t) => t.machineIds.includes(machineId));
  for (const task of affected) {
    const options = { [machineId]: alternatives };
    // Prefer keeping the original window with a substitute machine.
    const sameWindow = findSlot(working, task, { from: task.start, machineOptions: options });
    const slot = sameWindow && sameWindow.start === task.start ? sameWindow : findSlot(working, task, { machineOptions: options });
    const swapped = slot ? machineNames(state, slot.machineIds).join(", ") : "";
    let reason: string;
    if (!slot) reason = `${machine.name} is out of service and no other ${machine.category} is free before the deadline.`;
    else if (slot.start === task.start) reason = `${machine.name} is out of service. ${swapped} is free in the same window.`;
    else reason = `${machine.name} is out of service. ${swapped} is next free at ${fmtRange(slot.start, slot.end)}, still before the deadline.`;
    changes.push({
      taskId: task.id,
      before: { start: task.start, end: task.end, machineIds: task.machineIds },
      after: slot,
      reason,
      resourcesAffected: machineNames(state, [...new Set([...task.machineIds, ...(slot?.machineIds ?? [])])]),
      unresolved: slot
        ? undefined
        : `Needs a decision: hire a ${machine.category}, extend the deadline, or move a lower-priority ${machine.category} booking.`,
    });
    working = tentatively(working, task.id, slot);
  }
  if (changes.length === 0) return null;
  const unresolved = changes.filter((c) => !c.after).length;
  return {
    id: nextId("prp", state.proposals),
    trigger: "machine",
    title: `${machine.name} out of service`,
    summary: `${changes.length} booking${changes.length === 1 ? "" : "s"} on ${machine.name} re-planned${
      unresolved ? `; ${unresolved} cannot be covered safely and need${unresolved === 1 ? "s" : ""} your attention` : ""
    }.`,
    createdAt: state.now,
    changes,
    unchangedTaskIds: candidates.filter((t) => !t.machineIds.includes(machineId)).map((t) => t.id),
    requiresApproval: true,
    status: "pending",
  };
}

export function addProposal(state: UrvaraState, proposal: ReplanProposal): UrvaraState {
  // A newer proposal for the same trigger supersedes an older pending one.
  const proposals = state.proposals.map((p) =>
    p.status === "pending" && p.trigger === proposal.trigger
      ? { ...p, status: "rejected" as const, decidedAt: state.now, decidedBy: "system", decisionNote: `Superseded by ${proposal.id}` }
      : p,
  );
  return { ...state, proposals: [proposal, ...proposals] };
}

export function approveProposal(state: UrvaraState, proposalId: string, actorId: string): UrvaraState {
  const proposal = state.proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== "pending") return state;
  const byTask = new Map(proposal.changes.map((c) => [c.taskId, c]));
  const tasks = state.tasks.map((t) => {
    const change = byTask.get(t.id);
    if (!change) return t;
    if (change.cancel) {
      return {
        ...t,
        status: "cancelled" as const,
        needsAttention: undefined,
        changeNotice: `Cancelled. ${change.reason.replace(/^Cancel\. /, "")}`,
        history: [...t.history, { at: state.now, actor: actorId, text: `Cancelled by approved plan. Reason: ${change.reason}` }],
      };
    }
    if (!change.after) {
      return {
        ...t,
        needsAttention: change.unresolved,
        history: [...t.history, { at: state.now, actor: actorId, text: `Flagged: ${change.reason}` }],
      };
    }
    const notice = `Moved from ${fmtRange(change.before.start, change.before.end)} to ${fmtRange(change.after.start, change.after.end)}`;
    return {
      ...t,
      start: change.after.start,
      end: change.after.end,
      machineIds: change.after.machineIds,
      needsAttention: undefined,
      changeNotice: `${notice}. ${change.reason}`,
      history: [...t.history, { at: state.now, actor: actorId, text: `${notice}. Reason: ${change.reason}` }],
    };
  });
  const proposals = state.proposals.map((p) =>
    p.id === proposalId ? { ...p, status: "approved" as const, decidedAt: state.now, decidedBy: actorId } : p,
  );
  const moved = proposal.changes.filter((c) => c.after).length;
  const cancelled = proposal.changes.filter((c) => c.cancel).length;
  return withAudit(
    { ...state, tasks, proposals },
    actorId,
    "proposal.approved",
    proposalId,
    `Approved "${proposal.title}": ${moved} task(s) rescheduled${cancelled ? `, ${cancelled} cancelled` : ""}, ${proposal.changes.length - moved - cancelled} flagged for attention.`,
  );
}

export function decideProposal(
  state: UrvaraState,
  proposalId: string,
  decision: "rejected" | "revision_requested",
  actorId: string,
  note: string,
): UrvaraState {
  const proposal = state.proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== "pending") return state;
  const proposals = state.proposals.map((p) =>
    p.id === proposalId ? { ...p, status: decision, decidedAt: state.now, decidedBy: actorId, decisionNote: note || undefined } : p,
  );
  const verb = decision === "rejected" ? "Rejected" : "Requested revision of";
  return withAudit({ ...state, proposals }, actorId, `proposal.${decision}`, proposalId, `${verb} "${proposal.title}"${note ? `: ${note}` : ""}.`);
}

/**
 * Owner resolution for a flagged task: push the deadline out and let the
 * planner look again, substituting any machine of the same category.
 */
export function extendAndReschedule(
  state: UrvaraState,
  taskId: string,
  extraHours: number,
  actorId: string,
): { state: UrvaraState; error?: string } {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return { state, error: "Task not found." };
  const due = addHours(task.due, extraHours);
  const widened = { ...task, due };
  const machineOptions = Object.fromEntries(
    task.machineIds.map((id) => {
      const machine = state.resources.find((r) => r.id === id);
      const pool = state.resources.filter((r) => r.kind === "machine" && r.category === machine?.category && r.status === "available").map((r) => r.id);
      return [id, pool];
    }),
  );
  const slot = findSlot(state, widened, { machineOptions });
  if (!slot) return { state, error: `Still no safe slot before ${fmtDayTime(due)}. Try a longer extension or hire a machine.` };
  const notice = `Deadline extended to ${fmtDayTime(due)}; rescheduled to ${fmtRange(slot.start, slot.end)}`;
  const tasks = state.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          due,
          start: slot.start,
          end: slot.end,
          machineIds: slot.machineIds,
          needsAttention: undefined,
          changeNotice: notice,
          history: [...t.history, { at: state.now, actor: actorId, text: notice }],
        }
      : t,
  );
  return { state: withAudit({ ...state, tasks }, actorId, "task.rescheduled", taskId, `${task.title}: ${notice}`) };
}
