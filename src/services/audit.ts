import type { AuditEvent, UrvaraState } from "@/types";
import { nextId } from "@/lib/ids";

export function withAudit(
  state: UrvaraState,
  actorId: string,
  action: string,
  entity: string,
  summary: string,
): UrvaraState {
  const event: AuditEvent = {
    id: nextId("aud", state.auditEvents),
    at: state.now,
    actorId,
    action,
    entity,
    summary,
  };
  return { ...state, auditEvents: [event, ...state.auditEvents] };
}

export function actorName(state: UrvaraState, actorId: string): string {
  if (actorId === "system") return "Urvara planner";
  return state.users.find((u) => u.id === actorId)?.name ?? actorId;
}
