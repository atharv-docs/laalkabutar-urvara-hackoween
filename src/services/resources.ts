/**
 * Resource coordinator: stock commitments, machine status and cross-farm conflicts.
 */
import type { Resource, Task, UrvaraState } from "@/types";
import { fmtRange, ms, overlaps } from "@/lib/time";
import { ACTIVE_STATUSES, MACHINE_TRAVEL_BUFFER_H } from "./scheduler";
import { withAudit } from "./audit";
import { addProposal, proposeMachineReplan } from "./replanner";

export interface StockPosition {
  resource: Resource;
  committed: number;
  free: number;
  low: boolean;
  short: boolean;
}

/** Stock on hand minus what upcoming tasks have already claimed. */
export function stockPosition(state: UrvaraState, resourceId: string, excludeTaskIds: string[] = []): StockPosition | null {
  const resource = state.resources.find((r) => r.id === resourceId);
  if (!resource || resource.kind === "machine") return null;
  const committed = state.tasks
    .filter((t) => ACTIVE_STATUSES.includes(t.status) && !excludeTaskIds.includes(t.id))
    .flatMap((t) => t.inputs)
    .filter((i) => i.resourceId === resourceId)
    .reduce((s, i) => s + i.quantity, 0);
  const free = Math.round((resource.quantity - committed) * 10) / 10;
  return {
    resource,
    committed,
    free,
    short: free < 0,
    low: resource.reorderAt != null && free <= resource.reorderAt,
  };
}

export type ConflictKind = "machine_double_booked" | "machine_unavailable" | "farmer_double_booked" | "stock_short" | "stock_low";

export interface Conflict {
  id: string;
  kind: ConflictKind;
  severity: "high" | "medium";
  title: string;
  detail: string;
  taskIds: string[];
  resourceId?: string;
}

export function detectConflicts(state: UrvaraState): Conflict[] {
  const active = state.tasks.filter((t) => ACTIVE_STATUSES.includes(t.status) && ms(t.end) > ms(state.now));
  const out: Conflict[] = [];

  for (const machine of state.resources.filter((r) => r.kind === "machine")) {
    const bookings = active.filter((t) => t.machineIds.includes(machine.id)).sort((a, b) => ms(a.start) - ms(b.start));
    if (machine.status !== "available" && bookings.length) {
      out.push({
        id: `cf-unavail-${machine.id}`,
        kind: "machine_unavailable",
        severity: "high",
        title: `${machine.name} is ${machine.status} but still booked`,
        detail: `${bookings.length} upcoming task(s) depend on it.`,
        taskIds: bookings.map((b) => b.id),
        resourceId: machine.id,
      });
    }
    for (let i = 0; i < bookings.length; i += 1) {
      for (let j = i + 1; j < bookings.length; j += 1) {
        const a = bookings[i];
        const b = bookings[j];
        const buffer = a.farmId === b.farmId ? 0 : MACHINE_TRAVEL_BUFFER_H;
        if (overlaps(a.start, a.end, b.start, b.end, buffer)) {
          out.push({
            id: `cf-dbl-${machine.id}-${a.id}-${b.id}`,
            kind: "machine_double_booked",
            severity: "high",
            title: `${machine.name} double-booked`,
            detail: `"${a.title}" (${fmtRange(a.start, a.end)}) and "${b.title}" (${fmtRange(b.start, b.end)}) overlap once travel time is included.`,
            taskIds: [a.id, b.id],
            resourceId: machine.id,
          });
        }
      }
    }
  }

  const byFarmer = new Map<string, Task[]>();
  for (const t of active) byFarmer.set(t.assigneeId, [...(byFarmer.get(t.assigneeId) ?? []), t]);
  for (const [farmerId, list] of byFarmer) {
    list.sort((a, b) => ms(a.start) - ms(b.start));
    for (let i = 0; i < list.length - 1; i += 1) {
      if (overlaps(list[i].start, list[i].end, list[i + 1].start, list[i + 1].end)) {
        const name = state.users.find((u) => u.id === farmerId)?.name ?? farmerId;
        out.push({
          id: `cf-farmer-${list[i].id}-${list[i + 1].id}`,
          kind: "farmer_double_booked",
          severity: "medium",
          title: `${name} has overlapping tasks`,
          detail: `"${list[i].title}" and "${list[i + 1].title}" overlap.`,
          taskIds: [list[i].id, list[i + 1].id],
        });
      }
    }
  }

  for (const resource of state.resources.filter((r) => r.kind === "input" || r.kind === "water")) {
    const pos = stockPosition(state, resource.id);
    if (!pos) continue;
    const users = active.filter((t) => t.inputs.some((i) => i.resourceId === resource.id)).map((t) => t.id);
    if (pos.short) {
      out.push({
        id: `cf-short-${resource.id}`,
        kind: "stock_short",
        severity: "high",
        title: `${resource.name}: not enough stock`,
        detail: `${pos.committed} ${resource.unit} booked, ${resource.quantity} on hand. Order ${Math.abs(pos.free)} ${resource.unit} or reduce bookings.`,
        taskIds: users,
        resourceId: resource.id,
      });
    } else if (pos.low) {
      out.push({
        id: `cf-low-${resource.id}`,
        kind: "stock_low",
        severity: "medium",
        title: `${resource.name} running low`,
        detail: `${pos.free} ${resource.unit} free after bookings (reorder at ${resource.reorderAt}).`,
        taskIds: users,
        resourceId: resource.id,
      });
    }
  }
  return out;
}

/** Mark a machine out of service and draft a replan for its bookings. */
export function setMachineStatus(
  state: UrvaraState,
  machineId: string,
  status: Resource["status"],
  actorId: string,
  note?: string,
): { state: UrvaraState; proposalId?: string } {
  const machine = state.resources.find((r) => r.id === machineId);
  if (!machine || machine.status === status) return { state };
  let next: UrvaraState = {
    ...state,
    resources: state.resources.map((r) => (r.id === machineId ? { ...r, status, statusNote: note } : r)),
    scenario: {
      ...state.scenario,
      brokenMachineIds:
        status === "available"
          ? state.scenario.brokenMachineIds.filter((id) => id !== machineId)
          : [...new Set([...state.scenario.brokenMachineIds, machineId])],
    },
  };
  next = withAudit(next, actorId, `resource.${status}`, machineId, `${machine.name} marked ${status}${note ? `: ${note}` : ""}`);
  if (status === "available") return { state: next };
  const proposal = proposeMachineReplan(next, machineId);
  if (!proposal) return { state: next };
  next = withAudit(addProposal(next, proposal), "system", "proposal.created", proposal.id, proposal.summary);
  return { state: next, proposalId: proposal.id };
}

export function adjustStock(state: UrvaraState, resourceId: string, quantity: number, actorId: string): UrvaraState {
  const resource = state.resources.find((r) => r.id === resourceId);
  if (!resource || quantity < 0) return state;
  const resources = state.resources.map((r) => (r.id === resourceId ? { ...r, quantity } : r));
  return withAudit({ ...state, resources }, actorId, "resource.stock_updated", resourceId, `${resource.name} stock set to ${quantity} ${resource.unit} (was ${resource.quantity})`);
}
